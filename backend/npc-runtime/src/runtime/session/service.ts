import { createHash, randomUUID } from "node:crypto";
import { DEFAULT_ROLE_POLICIES, assembleObservePacket, type ActorMemory } from "../../agentloop/context.js";
import { runBeat, type NpcAction } from "../../agentloop/engine.js";
import type { ActorContextLite } from "../../agentloop/tools.js";
import { TranscriptStore, type TranscriptEntry } from "../../agentloop/transcript.js";
import type { NpcProposalPort, ProposalMeta } from "../../providers/ports.js";
import { createProviderFromEnvironment } from "../../providers/registry.js";
import type { ConversationChoiceIntent, ConversationSuspicionSignal } from "../../contracts/types.js";
import {
  clampConversationScore,
  clampJudgmentDelta,
  JUDGMENT_REPORT_DELTA_CAP,
  JUDGMENT_SUSPICION_DELTA_CAP,
  type ConversationMemoryLine,
} from "../conversation-suspicion.js";
import {
  createSameOrderWorld,
  visibleLedger,
  visibleObjects,
  visibleRecords,
  type LedgerEvent,
  type WorldRole,
  type WorldState,
} from "../world/index.js";
import { loadStorylet, ROUTE_IDS, type RouteId, type Storylet, type StoryletBeat } from "../storylet.js";

export type AnswerType = "choice" | "free_input" | "hesitation";

export interface SessionAnswer {
  type: AnswerType;
  choiceId?: string;
  text?: string;
}

export interface RouteState {
  stage: "routine" | "probe" | "reconciliation" | "resolved";
  projectedRoute: RouteId;
  terminal: boolean;
  suspicion: number;
  reportPressure: number;
}

export interface WorldSnapshot {
  landmarks: Array<{ landmarkId: string; label: string }>;
  actors: Array<{ actorId: string; role: WorldRole; name: string; landmarkId: string }>;
  recordProps: Array<{
    objectId: string;
    label: string;
    state: string;
    visibleTo: WorldRole[];
    recordId?: string;
  }>;
  civicEconomy: WorldState["economy"];
  hudState: {
    suspicion: number;
    reportPressure: number;
    stage: RouteState["stage"];
    projectedRoute: RouteId;
    ledgerCount: number;
    activePromptId: string | null;
    providerProfile: string;
    providerTransport: ProposalMeta["transport"];
    providerFallbackReason?: string;
  };
}

export interface NextTurn {
  turnId: string;
  beatId: string;
  promptId: string;
  choiceSetId: string;
  speakerId: string;
  prompt: string;
  acceptsFreeInput: boolean;
  continueConversation: boolean;
  choices: Array<{ choiceId: string; intent: ConversationChoiceIntent; line: string }>;
  proposalMeta: ProposalMeta;
  hesitationMs?: number;
}

export interface SessionStartResult {
  sessionId: string;
  worldSnapshot: WorldSnapshot;
  ledgerEvents: LedgerEvent[];
  nextTurn: NextTurn;
}

export interface NpcReaction {
  actorId: string;
  role: WorldRole;
  kind: "speech" | "action";
  utterance?: string;
  tool?: string;
  ledgerEventId?: string;
  whyLine?: string;
  influence?: { from: string; to: string };
  proposalMeta: ProposalMeta;
}

export interface AnswerResult {
  signals: ConversationSuspicionSignal[];
  whyLines: string[];
  suspicionDelta: number;
  reportPressure: number;
  npcReactions: NpcReaction[];
  ledgerEvents: LedgerEvent[];
  transcriptDeltas: TranscriptEntry[];
  routeState: RouteState;
  nextTurn: NextTurn | null;
}

export interface DecisionResult {
  npcActions: Array<{
    actorId: string;
    tool: string;
    args: Record<string, unknown>;
    utterance?: string;
    validationResult: { ok: boolean; reason?: string; detail?: string; note: string };
    proposalMeta: ProposalMeta;
  }>;
  ledgerEvents: LedgerEvent[];
  transcriptDeltas: TranscriptEntry[];
}

export interface FullSnapshot {
  sessionId: string;
  storyletId: string;
  worldSnapshot: WorldSnapshot;
  records: Array<{
    recordId: string;
    kind: string;
    authorRole: WorldRole;
    stateBody: string;
    visibleTo: WorldRole[];
    lastLedgerEventId?: string;
  }>;
  ledgerEvents: LedgerEvent[];
  routeState: RouteState;
  nextTurn: NextTurn | null;
  agentTranscript: TranscriptEntry[];
}

export interface OutcomePanel {
  title: string;
  body: string;
  citedLedgerIds: string[];
}

export interface TelemetrySummary {
  turns: number;
  signalsSeen: ConversationSuspicionSignal[];
  finalSuspicion: number;
  finalReportPressure: number;
  ledgerEventCount: number;
  route: RouteId;
  providerProfile: string;
  fallbackCount: number;
}

export interface SessionEndResult {
  route: RouteId;
  outcomePanel: OutcomePanel;
  telemetrySummary: TelemetrySummary;
}

export class SessionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "session_not_found"
      | "session_ended"
      | "unexpected_turn"
      | "unknown_choice"
      | "invalid_answer"
      | "storylet_not_found",
  ) {
    super(message);
  }
}

interface SessionState {
  sessionId: string;
  storylet: Storylet;
  locale: string;
  world: WorldState;
  transcript: TranscriptStore;
  memory: Map<string, ActorMemory>;
  beatIndex: number;
  activeTurn: NextTurn | null;
  lastProposalMeta: ProposalMeta;
  fallbackCount: number;
  suspicion: number;
  reportPressure: number;
  signalsSeen: Set<ConversationSuspicionSignal>;
  turns: ConversationMemoryLine[];
  /** Both sides of the conversation, in order. NPCs must remember their own lines. */
  dialogue: Array<{ speakerId: string; line: string }>;
  processedTurnIds: Set<string>;
  finalRoute?: RouteId;
  terminal: boolean;
  turnCount: number;
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export interface SessionServiceOptions {
  proposalPort?: NpcProposalPort;
}

export class SessionService {
  private readonly sessions = new Map<string, SessionState>();
  private readonly storyletCache = new Map<string, Storylet>();
  private readonly proposalPort: NpcProposalPort;
  /** Serializes mutating calls per session so an ambient decision can never interleave with an answer. */
  private readonly sessionChains = new Map<string, Promise<unknown>>();

  constructor(options: SessionServiceOptions = {}) {
    this.proposalPort = options.proposalPort ?? createProviderFromEnvironment().proposalPort;
  }

  providerProfile(): string {
    return this.proposalPort.profileId;
  }

  providerPreflight() {
    return this.proposalPort.preflight();
  }

  private getStorylet(storyletId: string): Storylet {
    const cached = this.storyletCache.get(storyletId);
    if (cached) return cached;
    try {
      const storylet = loadStorylet(storyletId);
      this.storyletCache.set(storyletId, storylet);
      return storylet;
    } catch (error) {
      throw new SessionError(`unknown storylet: ${storyletId} (${(error as Error).message})`, "storylet_not_found");
    }
  }

  private require(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) throw new SessionError(`unknown session: ${sessionId}`, "session_not_found");
    return session;
  }

  async start(storyletId: string, locale: string): Promise<SessionStartResult> {
    const storylet = this.getStorylet(storyletId);
    const sessionId = `sess-${randomUUID()}`;
    const initialMeta: ProposalMeta = {
      profileId: this.proposalPort.profileId,
      transport: "fallback",
      usedFallback: false,
    };
    const session: SessionState = {
      sessionId,
      storylet,
      locale,
      world: createSameOrderWorld(),
      transcript: new TranscriptStore(),
      memory: new Map(),
      beatIndex: 0,
      activeTurn: null,
      lastProposalMeta: initialMeta,
      fallbackCount: 0,
      suspicion: 0,
      reportPressure: 0,
      signalsSeen: new Set(),
      turns: [],
      dialogue: [],
      processedTurnIds: new Set(),
      terminal: false,
      turnCount: 0,
    };
    this.sessions.set(sessionId, session);
    session.activeTurn = await this.buildNextTurn(session);
    return {
      sessionId,
      worldSnapshot: this.buildWorldSnapshot(session),
      ledgerEvents: [],
      nextTurn: session.activeTurn,
    };
  }

  private serialize<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
    const prev = this.sessionChains.get(sessionId) ?? Promise.resolve();
    const next = prev.then(task, task);
    this.sessionChains.set(
      sessionId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  answer(sessionId: string, turnId: string, answer: SessionAnswer): Promise<AnswerResult> {
    return this.serialize(sessionId, () => this.resolveAnswer(sessionId, turnId, answer));
  }

  private async resolveAnswer(sessionId: string, turnId: string, answer: SessionAnswer): Promise<AnswerResult> {
    const session = this.require(sessionId);
    if (session.terminal || !session.activeTurn) {
      throw new SessionError("session already reached a terminal state", "session_ended");
    }
    if (turnId !== session.activeTurn.turnId) {
      throw new SessionError(`unexpected turn: got ${turnId}, expected ${session.activeTurn.turnId}`, "unexpected_turn");
    }
    if (session.processedTurnIds.has(turnId)) {
      throw new SessionError(`turn already processed: ${turnId}`, "unexpected_turn");
    }

    const beat = session.storylet.beats[session.beatIndex];
    const classified = this.classifyAnswer(session, answer);
    session.processedTurnIds.add(turnId);
    session.turnCount += 1;
    const judgmentHistory = session.dialogue.slice(-10);
    session.dialogue.push({ speakerId: "player", line: classified.line });

    // The judging NPC's model decides what the answer means. Rules only
    // bound the movement (per-turn caps, 0..125 clamps) — owner direction.
    const actor = this.actorContext(session, beat.speakerId);
    const memory = this.memoryFor(session, beat.speakerId);
    const judged = await this.proposalPort.judgeConversationTurn({
      sessionId,
      locale: session.locale,
      beatId: beat.beatId,
      promptId: beat.promptId,
      actorId: beat.speakerId,
      playerLine: classified.line,
      conversationHistory: judgmentHistory,
      observePacket: assembleObservePacket(session.world, {
        actor,
        goals: [beat.objective],
        policy: DEFAULT_ROLE_POLICIES[actor.role],
        memory,
        heardSpeech: [classified.line],
      }),
      suspicionBefore: session.suspicion,
      reportPressureBefore: session.reportPressure,
    });
    this.trackProposalMeta(session, [judged.meta]);
    const suspicionBefore = session.suspicion;
    const reportPressureBefore = session.reportPressure;
    session.suspicion = clampConversationScore(
      suspicionBefore + clampJudgmentDelta(judged.proposal.suspicionDelta, JUDGMENT_SUSPICION_DELTA_CAP),
    );
    session.reportPressure = clampConversationScore(
      reportPressureBefore + clampJudgmentDelta(judged.proposal.reportDelta, JUDGMENT_REPORT_DELTA_CAP),
    );
    for (const signal of judged.proposal.signals) session.signalsSeen.add(signal);
    session.turns.push({
      turnId,
      promptId: beat.promptId,
      line: classified.line,
      selectedChoiceId: classified.choiceId,
      freeInputHash: classified.freeInputHash,
      intent: classified.intent,
      signals: judged.proposal.signals,
    });

    const projectedRoute = this.projectRoute(session);
    const beatResult = await runBeat({
      sessionId,
      world: session.world,
      actor,
      policy: DEFAULT_ROLE_POLICIES[actor.role],
      memory,
      // The NPC's own perceived state only. Never leak a projected ending:
      // what to do about the pressure is the model's decision.
      goal: `conversation: beat=${beat.beatId} suspicion=${session.suspicion} reportPressure=${session.reportPressure}`,
      heardSpeech: [classified.line],
      proposalPort: this.proposalPort,
      transcript: session.transcript,
      budget: 3,
    });
    session.world = beatResult.world;
    session.memory.set(beat.speakerId, beatResult.memory);
    this.trackProposalMeta(session, beatResult.actions.map(action => action.proposalMeta));

    const nextBeat = beat.next ? session.storylet.beats.find(candidate => candidate.beatId === beat.next) : undefined;
    const nextBeatAllowed =
      session.activeTurn.continueConversation &&
      !!nextBeat &&
      (!nextBeat.onlyWhenRoute || nextBeat.onlyWhenRoute.includes(projectedRoute));
    let nextTurn: NextTurn | null = null;
    let routeState: RouteState;
    if (nextBeatAllowed && nextBeat) {
      session.beatIndex = session.storylet.beats.indexOf(nextBeat);
      nextTurn = await this.buildNextTurn(session);
      session.activeTurn = nextTurn;
      routeState = this.routeState(this.stageForBeat(nextBeat), projectedRoute, false, session);
    } else {
      session.finalRoute = projectedRoute;
      session.terminal = true;
      session.activeTurn = null;
      routeState = this.routeState("resolved", projectedRoute, true, session);
    }

    const reactions = beatResult.actions.map(action => this.reactionForAction(actor.role, action));
    if (reactions.length === 0 && nextTurn) {
      reactions.push({
        actorId: beat.speakerId,
        role: actor.role,
        kind: "speech",
        utterance: nextTurn.prompt,
        proposalMeta: nextTurn.proposalMeta,
      });
    }
    return {
      signals: judged.proposal.signals,
      whyLines:
        judged.meta.transport === "live"
          ? [judged.proposal.whyLine]
          : this.resolveWhyLines(session.storylet, judged.proposal.signals),
      suspicionDelta: session.suspicion - suspicionBefore,
      reportPressure: session.reportPressure,
      npcReactions: reactions,
      ledgerEvents: beatResult.events,
      transcriptDeltas: beatResult.transcriptDeltas,
      routeState,
      nextTurn,
    };
  }

  decision(sessionId: string, beat: number): Promise<DecisionResult> {
    return this.serialize(sessionId, () => this.resolveDecision(sessionId, beat));
  }

  /** Storylet actors that live in the scene but never speak a beat: they act ambiently. */
  private ambientActorIds(session: SessionState): string[] {
    const speakers = new Set(session.storylet.beats.map(beat => beat.speakerId));
    return session.storylet.actors
      .filter(actor => actor.role !== "player" && !speakers.has(actor.actorId))
      .map(actor => actor.actorId);
  }

  private async resolveDecision(sessionId: string, beat: number): Promise<DecisionResult> {
    const session = this.require(sessionId);
    const result: DecisionResult = { npcActions: [], ledgerEvents: [], transcriptDeltas: [] };
    for (const actorId of this.ambientActorIds(session)) {
      const actor = this.actorContext(session, actorId);
      const beatResult = await runBeat({
        sessionId,
        world: session.world,
        actor,
        policy: DEFAULT_ROLE_POLICIES[actor.role],
        memory: this.memoryFor(session, actorId),
        goal: `ambient: act as ${actor.role} — read any record or object you can see, and react within your role at beat ${beat}`,
        proposalPort: this.proposalPort,
        transcript: session.transcript,
        budget: 3,
      });
      session.world = beatResult.world;
      session.memory.set(actorId, beatResult.memory);
      this.trackProposalMeta(session, beatResult.actions.map(action => action.proposalMeta));
      result.npcActions.push(
        ...beatResult.actions.map(action => ({
          actorId: action.actorId,
          tool: action.tool,
          args: action.args,
          utterance: action.utterance,
          validationResult: action.validationResult,
          proposalMeta: action.proposalMeta,
        })),
      );
      result.ledgerEvents.push(...beatResult.events);
      result.transcriptDeltas.push(...beatResult.transcriptDeltas);
    }
    return result;
  }

  snapshot(sessionId: string): FullSnapshot {
    const session = this.require(sessionId);
    return {
      sessionId,
      storyletId: session.storylet.storyletId,
      worldSnapshot: this.buildWorldSnapshot(session),
      records: visibleRecords(session.world, "player").map(record => ({
        recordId: record.recordId,
        kind: record.kind,
        authorRole: record.authorRole,
        stateBody: record.stateBody,
        visibleTo: record.visibleTo,
        lastLedgerEventId: record.lastLedgerEventId,
      })),
      ledgerEvents: visibleLedger(session.world, "player"),
      routeState: this.routeState(
        session.terminal ? "resolved" : this.stageForBeat(session.storylet.beats[session.beatIndex]),
        session.finalRoute ?? this.projectRoute(session),
        session.terminal,
        session,
      ),
      nextTurn: session.activeTurn,
      agentTranscript: session.transcript.all(),
    };
  }

  end(sessionId: string): SessionEndResult {
    const session = this.require(sessionId);
    const route = session.finalRoute ?? this.projectRoute(session);
    session.finalRoute = route;
    session.terminal = true;
    session.activeTurn = null;
    const routeDef = session.storylet.routes[route];
    const playerLedger = visibleLedger(session.world, "player");
    const citedLedgerIds = [
      ...new Set(
        playerLedger.flatMap(event =>
          event.citedLedgerEventId ? [event.citedLedgerEventId, event.eventId] : [event.eventId],
        ),
      ),
    ];
    return {
      route,
      outcomePanel: {
        title: routeDef.title,
        // Never narrate a consequence that did not happen: without a citable
        // ledger event the panel uses the honest no-record variant.
        body: citedLedgerIds.length > 0 ? routeDef.body : (routeDef.bodyNoRecord ?? routeDef.body),
        citedLedgerIds,
      },
      telemetrySummary: {
        turns: session.turnCount,
        signalsSeen: [...session.signalsSeen],
        finalSuspicion: session.suspicion,
        finalReportPressure: session.reportPressure,
        ledgerEventCount: session.world.ledger.length,
        route,
        providerProfile: session.lastProposalMeta.profileId,
        fallbackCount: session.fallbackCount,
      },
    };
  }

  private async buildNextTurn(session: SessionState): Promise<NextTurn> {
    const beat = session.storylet.beats[session.beatIndex];
    const actor = this.actorContext(session, beat.speakerId);
    const observePacket = assembleObservePacket(session.world, {
      actor,
      goals: [beat.objective],
      policy: DEFAULT_ROLE_POLICIES[actor.role],
      memory: this.memoryFor(session, beat.speakerId),
      heardSpeech: session.turns.slice(-3).map(turn => turn.line),
    });
    const resolved = await this.proposalPort.proposeConversationTurn({
      sessionId: session.sessionId,
      locale: session.locale,
      beatId: beat.beatId,
      actorId: beat.speakerId,
      objective: beat.objective,
      sceneFacts: [session.storylet.scenePremise, ...beat.sceneFacts],
      observePacket,
      conversationHistory: session.dialogue.slice(-10),
    });
    this.trackProposalMeta(session, [resolved.meta]);
    session.dialogue.push({ speakerId: beat.speakerId, line: resolved.proposal.utterance });
    const choiceSetId = `${beat.promptId}.generated`;
    const turnId = `${session.storylet.conversationId}#${session.beatIndex}#${session.turnCount}`;
    return {
      turnId,
      beatId: beat.beatId,
      promptId: beat.promptId,
      choiceSetId,
      speakerId: beat.speakerId,
      prompt: resolved.proposal.utterance,
      acceptsFreeInput: beat.acceptsFreeInput,
      continueConversation: resolved.proposal.continueConversation,
      choices: resolved.proposal.suggestedReplies.map((reply, index) => ({
        choiceId: `${beat.beatId}.generated.${index + 1}`,
        intent: reply.intent,
        line: reply.text,
      })),
      proposalMeta: resolved.meta,
      ...(beat.hesitationMs !== undefined ? { hesitationMs: beat.hesitationMs } : {}),
    };
  }

  private classifyAnswer(session: SessionState, answer: SessionAnswer): {
    line: string;
    intent?: ConversationChoiceIntent;
    choiceId?: string;
    freeInputHash?: string;
  } {
    if (answer.type === "choice") {
      const choice = session.activeTurn?.choices.find(candidate => candidate.choiceId === answer.choiceId);
      if (!choice) throw new SessionError(`unknown choice: ${answer.choiceId ?? "(none)"}`, "unknown_choice");
      return { line: choice.line, intent: choice.intent, choiceId: choice.choiceId };
    }
    if (answer.type === "free_input") {
      const text = (answer.text ?? "").trim();
      if (!text) throw new SessionError("free_input requires non-empty text", "invalid_answer");
      return { line: text, freeInputHash: hashText(text) };
    }
    return { line: "(응답 지연)" };
  }

  private projectRoute(session: SessionState): RouteId {
    const { softReport, inquest } = session.storylet.thresholds;
    if (session.reportPressure >= inquest) return "hard_inquest";
    if (session.reportPressure >= softReport) return "soft_report";
    if (session.signalsSeen.size > 0 || session.suspicion > 0) return "repair_recovery";
    return "clean_cover";
  }

  private resolveWhyLines(storylet: Storylet, signals: ConversationSuspicionSignal[]): string[] {
    return signals.length === 0
      ? [storylet.whyLines.none]
      : signals.map(signal => storylet.whyLines[signal] ?? storylet.whyLines.none);
  }

  private routeState(
    stage: RouteState["stage"],
    projectedRoute: RouteId,
    terminal: boolean,
    session: SessionState,
  ): RouteState {
    return {
      stage,
      projectedRoute,
      terminal,
      suspicion: session.suspicion,
      reportPressure: session.reportPressure,
    };
  }

  private stageForBeat(beat: StoryletBeat | undefined): RouteState["stage"] {
    if (!beat) return "resolved";
    if (beat.beatId === "probe") return "probe";
    if (beat.beatId === "reconciliation") return "reconciliation";
    return "routine";
  }

  private actorContext(session: SessionState, actorId: string): ActorContextLite {
    const role = this.roleForActor(session, actorId);
    return {
      actorId,
      role,
      landmarkId: session.storylet.actors.find(actor => actor.actorId === actorId)?.landmarkId ?? "Store",
      knownActorIds: session.storylet.actors.map(actor => actor.actorId).filter(id => id !== actorId),
      knownLandmarkIds: session.storylet.landmarks.map(landmark => landmark.landmarkId),
    };
  }

  private roleForActor(session: SessionState, actorId: string): WorldRole {
    return session.storylet.actors.find(actor => actor.actorId === actorId)?.role ?? "store_clerk";
  }

  private memoryFor(session: SessionState, actorId: string): ActorMemory {
    return session.memory.get(actorId) ?? {
      actorId,
      ownActionNotes: [],
      observedLedgerEventIds: [],
    };
  }

  private reactionForAction(role: WorldRole, action: NpcAction): NpcReaction {
    return {
      actorId: action.actorId,
      role,
      kind: action.tool === "talk_to" ? "speech" : "action",
      utterance: action.utterance,
      tool: action.tool,
      ledgerEventId: action.ledgerEventId,
      whyLine: action.validationResult.note,
      proposalMeta: action.proposalMeta,
    };
  }

  private trackProposalMeta(session: SessionState, metas: ProposalMeta[]): void {
    for (const meta of metas) {
      session.lastProposalMeta = meta;
      if (meta.usedFallback) session.fallbackCount += 1;
    }
  }

  private buildWorldSnapshot(session: SessionState): WorldSnapshot {
    const beat = session.terminal ? undefined : session.storylet.beats[session.beatIndex];
    return {
      landmarks: session.storylet.landmarks.map(landmark => ({ ...landmark })),
      actors: session.storylet.actors.map(actor => ({ ...actor })),
      recordProps: visibleObjects(session.world, "player").map(object => ({
        objectId: object.objectId,
        label: object.label,
        state: object.state,
        visibleTo: object.visibleTo,
        recordId: object.recordId,
      })),
      civicEconomy: { ...session.world.economy },
      hudState: {
        suspicion: session.suspicion,
        reportPressure: session.reportPressure,
        stage: session.terminal ? "resolved" : this.stageForBeat(beat),
        projectedRoute: session.finalRoute ?? this.projectRoute(session),
        ledgerCount: session.world.ledger.length,
        activePromptId: beat?.promptId ?? null,
        providerProfile: session.lastProposalMeta.profileId,
        providerTransport: session.lastProposalMeta.transport,
        providerFallbackReason: session.lastProposalMeta.fallbackReason,
      },
    };
  }
}

export { ROUTE_IDS };
export type { RouteId };

import { createHash, randomUUID } from "node:crypto";
import {
  DEFAULT_ROLE_POLICIES,
  assembleObservePacket,
  type ActorMemory,
} from "../../agentloop/context.js";
import { runBeat, type NpcAction } from "../../agentloop/engine.js";
import type { ActorContextLite } from "../../agentloop/tools.js";
import { TranscriptStore, type TranscriptEntry } from "../../agentloop/transcript.js";
import {
  playerStatementEvidenceId,
  ProviderFailureError,
  type NpcProposalPort,
  type ProposalMeta,
  type SuggestedReply,
} from "../../providers/ports.js";
import { createProviderFromEnvironment } from "../../providers/registry.js";
import { procedureContent } from "../../localization/procedure-content.js";
import {
  requireSupportedGameplayLocale,
  type GameplayLocale,
} from "../../localization/supported-locales.js";
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
  choices: Array<{
    choiceId: string;
    intent: ConversationChoiceIntent;
    line: string;
    evidenceIds: string[];
    introducesNewClaim: boolean;
  }>;
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
      | "invalid_locale"
      | "storylet_not_found",
  ) {
    super(message);
  }
}

interface SessionState {
  sessionId: string;
  storylet: Storylet;
  locale: GameplayLocale;
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
  dialogue: Array<{ speakerId: string; line: string; evidenceId: string | null }>;
  processedTurnIds: Set<string>;
  finalRoute?: RouteId;
  terminal: boolean;
  turnCount: number;
  /** Speaker agent beat deferred until after the player-facing answer returns. */
  pendingAftermath?: {
    speakerId: string;
    playerLine: string;
    statementEvidenceId: string;
    goal: string;
  };
  /** Latest deferred speaker beat results (tests / client drain). */
  lastAftermath?: {
    npcReactions: NpcReaction[];
    ledgerEvents: LedgerEvent[];
    transcriptDeltas: TranscriptEntry[];
  };
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
    let sessionLocale: GameplayLocale;
    try {
      sessionLocale = requireSupportedGameplayLocale(locale);
    } catch {
      throw new SessionError(`unsupported gameplay locale: ${locale}`, "invalid_locale");
    }
    if (storylet.locale !== sessionLocale) {
      throw new SessionError(
        `storylet ${storyletId} is authored for ${storylet.locale}, not ${sessionLocale}`,
        "invalid_locale",
      );
    }
    const sessionId = `sess-${randomUUID()}`;
    const initialMeta: ProposalMeta = {
      profileId: this.proposalPort.profileId,
      transport: "live",
      usedFallback: false,
    };
    const session: SessionState = {
      sessionId,
      storylet,
      locale: sessionLocale,
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
    try {
      session.activeTurn = await this.buildNextTurn(session);
    } catch (error) {
      this.sessions.delete(sessionId);
      throw error;
    }
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
    const resultPromise = this.serialize(sessionId, () => this.resolveAnswer(sessionId, turnId, answer));
    // Append the speaker agent beat onto the same serialize chain so later
    // mutations (and session/end) wait for it, while the answer HTTP response
    // can return as soon as the merged call finishes.
    this.sessionChains.set(
      sessionId,
      resultPromise
        .then(
          () => this.runAnswerAftermath(sessionId),
          () => undefined,
        )
        .then(
          () => undefined,
          () => undefined,
        ),
    );
    return resultPromise;
  }

  /** Test helper: wait until the session serialize queue (including aftermath) is idle. */
  async awaitIdle(sessionId: string): Promise<void> {
    await this.sessionChains.get(sessionId);
  }

  /** Test helper: latest deferred speaker-beat results after awaitIdle. */
  takeLastAftermath(sessionId: string): SessionState["lastAftermath"] {
    const session = this.require(sessionId);
    const value = session.lastAftermath;
    session.lastAftermath = undefined;
    return value;
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
    const priorContinue = session.activeTurn.continueConversation;
    const classified = this.classifyAnswer(session, answer);
    const statementEvidenceId = playerStatementEvidenceId(
      sessionId,
      session.activeTurn.turnId,
    );
    const judgmentHistory = session.dialogue.slice(-10);

    const actor = this.actorContext(session, beat.speakerId);
    const memory = this.memoryFor(session, beat.speakerId);
    const observePacket = assembleObservePacket(session.world, {
      actor,
      goals: [beat.objective],
      policy: DEFAULT_ROLE_POLICIES[actor.role],
      memory,
      heardSpeech: [{
        speakerActorId: "player",
        source: { kind: "player_statement", id: statementEvidenceId },
        line: classified.line,
      }],
    });

    // Next-beat context shapes the reply half of the merged call when the
    // prior turn still wanted to continue; route gating still happens after.
    const candidateNext = beat.next
      ? session.storylet.beats.find(candidate => candidate.beatId === beat.next)
      : undefined;
    const proposeBeat = priorContinue && candidateNext ? candidateNext : beat;

    // Single player-blocking provider call: judgment + next NPC reply + suggestions.
    const merged = await this.proposalPort.judgeAndProposeConversationTurn({
      sessionId,
      locale: session.locale,
      beatId: proposeBeat.beatId,
      promptId: beat.promptId,
      actorId: beat.speakerId,
      playerLine: classified.line,
      playerStatementEvidenceId: statementEvidenceId,
      conversationHistory: judgmentHistory,
      observePacket,
      suspicionBefore: session.suspicion,
      reportPressureBefore: session.reportPressure,
      objective: proposeBeat.objective,
      sceneFacts: [session.storylet.scenePremise, ...proposeBeat.sceneFacts],
    });
    this.rejectFallbackProposalMeta(merged.meta, "conversation_turn");
    this.trackProposalMeta(session, [merged.meta]);
    session.processedTurnIds.add(turnId);
    session.turnCount += 1;
    session.dialogue.push({
      speakerId: "player",
      line: classified.line,
      evidenceId: statementEvidenceId,
    });

    const suspicionBefore = session.suspicion;
    const reportPressureBefore = session.reportPressure;
    session.suspicion = clampConversationScore(
      suspicionBefore + clampJudgmentDelta(merged.proposal.suspicionDelta, JUDGMENT_SUSPICION_DELTA_CAP),
    );
    session.reportPressure = clampConversationScore(
      reportPressureBefore + clampJudgmentDelta(merged.proposal.reportDelta, JUDGMENT_REPORT_DELTA_CAP),
    );
    for (const signal of merged.proposal.signals) session.signalsSeen.add(signal);
    session.turns.push({
      turnId,
      promptId: beat.promptId,
      statementEvidenceId,
      line: classified.line,
      selectedChoiceId: classified.choiceId,
      freeInputHash: classified.freeInputHash,
      intent: classified.intent,
      evidenceIds: classified.evidenceIds,
      introducesNewClaim: classified.introducesNewClaim,
      signals: merged.proposal.signals,
    });

    const projectedRoute = this.projectRoute(session);
    const nextBeatAllowed =
      priorContinue &&
      !!candidateNext &&
      (!candidateNext.onlyWhenRoute || candidateNext.onlyWhenRoute.includes(projectedRoute));

    let nextTurn: NextTurn | null = null;
    let routeState: RouteState;
    if (nextBeatAllowed && candidateNext) {
      session.beatIndex = session.storylet.beats.indexOf(candidateNext);
      nextTurn = this.nextTurnFromMerged(session, candidateNext, merged.proposal, merged.meta);
      session.activeTurn = nextTurn;
      session.dialogue.push({
        speakerId: candidateNext.speakerId,
        line: merged.proposal.utterance,
        evidenceId: null,
      });
      routeState = this.routeState(this.stageForBeat(candidateNext), projectedRoute, false, session);
    } else {
      session.finalRoute = projectedRoute;
      session.terminal = true;
      session.activeTurn = null;
      routeState = this.routeState("resolved", projectedRoute, true, session);
    }

    session.pendingAftermath = {
      speakerId: beat.speakerId,
      playerLine: classified.line,
      statementEvidenceId,
      goal: `conversation: beat=${beat.beatId} suspicion=${session.suspicion} reportPressure=${session.reportPressure}`,
    };

    const reactions: NpcReaction[] = nextTurn
      ? [
          {
            actorId: beat.speakerId,
            role: actor.role,
            kind: "speech",
            utterance: nextTurn.prompt,
            proposalMeta: nextTurn.proposalMeta,
          },
        ]
      : [];

    return {
      signals: merged.proposal.signals,
      whyLines: [merged.proposal.whyLine],
      suspicionDelta: session.suspicion - suspicionBefore,
      reportPressure: session.reportPressure,
      npcReactions: reactions,
      ledgerEvents: [],
      transcriptDeltas: [],
      routeState,
      nextTurn,
    };
  }

  private async runAnswerAftermath(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingAftermath) {
      return;
    }
    const pending = session.pendingAftermath;
    session.pendingAftermath = undefined;
    const actor = this.actorContext(session, pending.speakerId);
    const memory = this.memoryFor(session, pending.speakerId);
    const beatResult = await runBeat({
      sessionId,
      locale: session.locale,
      world: session.world,
      actor,
      policy: DEFAULT_ROLE_POLICIES[actor.role],
      memory,
      goal: pending.goal,
      heardSpeech: [{
        speakerActorId: "player",
        source: { kind: "player_statement", id: pending.statementEvidenceId },
        line: pending.playerLine,
      }],
      proposalPort: this.proposalPort,
      transcript: session.transcript,
      budget: 3,
    });
    session.world = beatResult.world;
    session.memory.set(pending.speakerId, beatResult.memory);
    this.trackProposalMeta(session, beatResult.actions.map(action => action.proposalMeta));
    session.lastAftermath = {
      npcReactions: beatResult.actions.map(action => this.reactionForAction(actor.role, action)),
      ledgerEvents: beatResult.events,
      transcriptDeltas: beatResult.transcriptDeltas,
    };
  }

  private nextTurnFromMerged(
    session: SessionState,
    beat: StoryletBeat,
    merged: {
      utterance: string;
      suggestedReplies: [SuggestedReply, SuggestedReply, SuggestedReply];
      continueConversation: boolean;
    },
    meta: ProposalMeta,
  ): NextTurn {
    const choiceSetId = `${beat.promptId}.generated`;
    const turnId = `${session.storylet.conversationId}#${session.beatIndex}#${session.turnCount}`;
    return {
      turnId,
      beatId: beat.beatId,
      promptId: beat.promptId,
      choiceSetId,
      speakerId: beat.speakerId,
      prompt: merged.utterance,
      acceptsFreeInput: beat.acceptsFreeInput,
      continueConversation: merged.continueConversation,
      choices: merged.suggestedReplies.map((reply, index) => ({
        choiceId: `${beat.beatId}.generated.${index + 1}`,
        intent: reply.intent,
        line: reply.text,
        evidenceIds: [...reply.evidenceIds],
        introducesNewClaim: reply.introducesNewClaim,
      })),
      proposalMeta: meta,
      ...(beat.hesitationMs !== undefined ? { hesitationMs: beat.hesitationMs } : {}),
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
        locale: session.locale,
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

  end(sessionId: string): Promise<SessionEndResult> {
    return this.serialize(sessionId, () => this.resolveEnd(sessionId));
  }

  private async resolveEnd(sessionId: string): Promise<SessionEndResult> {
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
      heardSpeech: session.turns.slice(-3).map(turn => ({
        speakerActorId: "player",
        source: {
          kind: "player_statement" as const,
          id:
            turn.statementEvidenceId,
        },
        line: turn.line,
      })),
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
    this.rejectFallbackProposalMeta(resolved.meta, "conversation");
    this.trackProposalMeta(session, [resolved.meta]);
    session.dialogue.push({
      speakerId: beat.speakerId,
      line: resolved.proposal.utterance,
      evidenceId: null,
    });
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
        evidenceIds: [...reply.evidenceIds],
        introducesNewClaim: reply.introducesNewClaim,
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
    evidenceIds: string[];
    introducesNewClaim: boolean | null;
  } {
    if (answer.type === "choice") {
      const choice = session.activeTurn?.choices.find(candidate => candidate.choiceId === answer.choiceId);
      if (!choice) throw new SessionError(`unknown choice: ${answer.choiceId ?? "(none)"}`, "unknown_choice");
      return {
        line: choice.line,
        intent: choice.intent,
        choiceId: choice.choiceId,
        evidenceIds: [...choice.evidenceIds],
        introducesNewClaim: choice.introducesNewClaim,
      };
    }
    if (answer.type === "free_input") {
      const text = (answer.text ?? "").trim();
      if (!text) throw new SessionError("free_input requires non-empty text", "invalid_answer");
      return {
        line: text,
        freeInputHash: hashText(text),
        evidenceIds: [],
        introducesNewClaim: null,
      };
    }
    return {
      line: procedureContent(session.locale).hesitationMarker,
      evidenceIds: [],
      introducesNewClaim: null,
    };
  }

  private projectRoute(session: SessionState): RouteId {
    const { softReport, inquest } = session.storylet.thresholds;
    if (session.reportPressure >= inquest) return "hard_inquest";
    if (session.reportPressure >= softReport) return "soft_report";
    if (session.signalsSeen.size > 0 || session.suspicion > 0) return "repair_recovery";
    return "clean_cover";
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
      evidence: [],
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

  private rejectFallbackProposalMeta(
    meta: ProposalMeta,
    purpose: ConstructorParameters<typeof ProviderFailureError>[2],
  ): void {
    if (meta.transport !== "fallback" && !meta.usedFallback) return;
    throw new ProviderFailureError(
      meta.profileId,
      meta.fallbackReason ?? "invalid_envelope",
      purpose,
    );
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

import { createHash, randomUUID } from "node:crypto";
import type { ConversationChoiceIntent, ConversationSuspicionSignal } from "../../contracts/types.js";
import {
  evaluateConversationTurn,
  type ConversationMemoryLine,
} from "../conversation-suspicion.js";
import {
  createSameOrderWorld,
  visibleLedger,
  visibleObjects,
  visibleRecords,
  type CivicEconomy,
  type LedgerEvent,
  type WorldRole,
  type WorldState,
} from "../world/index.js";
import { loadStorylet, ROUTE_IDS, type RouteId, type Storylet, type StoryletBeat } from "../storylet.js";
import { DEFAULT_ROLE_POLICIES, type ActorMemory } from "../../agentloop/context.js";
import { runBeat, type NpcAction } from "../../agentloop/engine.js";
import type { ActorContextLite, ToolCall } from "../../agentloop/tools.js";
import { TranscriptStore, type TranscriptEntry } from "../../agentloop/transcript.js";

export type AnswerType = "choice" | "free_input" | "hesitation";

export interface SessionAnswer {
  type: AnswerType;
  choiceId?: string;
  text?: string;
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
}

export interface RouteState {
  stage: "routine" | "probe" | "reconciliation" | "resolved";
  projectedRoute: RouteId;
  terminal: boolean;
  suspicion: number;
  reportPressure: number;
}

export interface HudState {
  suspicion: number;
  reportPressure: number;
  stage: RouteState["stage"];
  projectedRoute: RouteId;
  ledgerCount: number;
  activePromptId: string | null;
}

export interface WorldSnapshot {
  landmarks: Array<{ landmarkId: string; label: string }>;
  actors: Array<{ actorId: string; role: WorldRole; name: string; landmarkId: string }>;
  recordProps: Array<{ objectId: string; label: string; state: string; visibleTo: WorldRole[]; recordId?: string }>;
  civicEconomy: CivicEconomy;
  hudState: HudState;
}

export interface SessionStartResult {
  sessionId: string;
  worldSnapshot: WorldSnapshot;
  ledgerEvents: LedgerEvent[];
  nextTurn: NextTurn;
}

export interface NextTurn {
  turnId: string;
  beatId: string;
  promptId: string;
  choiceSetId: string;
  speakerId: string;
  prompt: string;
  acceptsFreeInput: boolean;
  choices: Array<{ choiceId: string; intent: ConversationChoiceIntent; line: string }>;
}

export interface AnswerResult {
  signals: ConversationSuspicionSignal[];
  whyLines: string[];
  suspicionDelta: number;
  reportPressure: number;
  npcReactions: NpcReaction[];
  ledgerEvents: LedgerEvent[];
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
  }>;
  ledgerEvents: LedgerEvent[];
  transcriptDeltas: TranscriptEntry[];
}

export interface FullSnapshot {
  sessionId: string;
  storyletId: string;
  worldSnapshot: WorldSnapshot;
  records: Array<{ recordId: string; kind: string; authorRole: WorldRole; stateBody: string; visibleTo: WorldRole[]; lastLedgerEventId?: string }>;
  ledgerEvents: LedgerEvent[];
  routeState: RouteState;
  nextTurn: NextTurn | null;
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
  suspicion: number;
  reportPressure: number;
  signalsSeen: Set<ConversationSuspicionSignal>;
  turns: ConversationMemoryLine[];
  processedTurnIds: Set<string>;
  routeApplied: boolean;
  finalRoute?: RouteId;
  terminal: boolean;
  citedLedgerIds: string[];
  turnCount: number;
}

function turnIdFor(storylet: Storylet, beatIndex: number, beatId: string): string {
  return `${storylet.conversationId}#${beatIndex}#${beatId}`;
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export class SessionService {
  private readonly sessions = new Map<string, SessionState>();
  private readonly storyletCache = new Map<string, Storylet>();

  constructor(private readonly clock: () => number = () => Date.now()) {}

  private getStorylet(storyletId: string): Storylet {
    const cached = this.storyletCache.get(storyletId);
    if (cached) {
      return cached;
    }
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
    if (!session) {
      throw new SessionError(`unknown session: ${sessionId}`, "session_not_found");
    }
    return session;
  }

  start(storyletId: string, locale: string): SessionStartResult {
    const storylet = this.getStorylet(storyletId);
    const world = createSameOrderWorld();
    const sessionId = `sess-${randomUUID()}`;
    const session: SessionState = {
      sessionId,
      storylet,
      locale,
      world,
      transcript: new TranscriptStore(),
      memory: new Map(),
      beatIndex: 0,
      suspicion: 0,
      reportPressure: 0,
      signalsSeen: new Set(),
      turns: [],
      processedTurnIds: new Set(),
      routeApplied: false,
      terminal: false,
      citedLedgerIds: [],
      turnCount: 0,
    };
    this.sessions.set(sessionId, session);

    return {
      sessionId,
      worldSnapshot: this.buildWorldSnapshot(session),
      ledgerEvents: [],
      nextTurn: this.buildNextTurn(session),
    };
  }

  answer(sessionId: string, turnId: string, answer: SessionAnswer): AnswerResult {
    const session = this.require(sessionId);
    if (session.terminal) {
      throw new SessionError("session already reached a terminal state", "session_ended");
    }
    const beat = session.storylet.beats[session.beatIndex];
    const expectedTurnId = turnIdFor(session.storylet, session.beatIndex, beat.beatId);
    if (turnId !== expectedTurnId) {
      throw new SessionError(
        `unexpected turn: got ${turnId}, expected ${expectedTurnId}`,
        "unexpected_turn",
      );
    }
    if (session.processedTurnIds.has(turnId)) {
      // Ordered turns are processed exactly once; no latest-wins coalescing.
      throw new SessionError(`turn already processed: ${turnId}`, "unexpected_turn");
    }

    const classified = this.classifyAnswer(session, beat, answer);
    session.processedTurnIds.add(turnId);
    session.turnCount += 1;

    const evaluation = evaluateConversationTurn({
      conversationId: session.storylet.conversationId,
      turnId,
      promptId: beat.promptId,
      choiceSetId: beat.choiceSetId,
      line: classified.line,
      selectedChoiceId: classified.choiceId,
      freeInputHash: classified.freeInputHash,
      intent: classified.intent,
      authoredSignals: classified.authoredSignals,
      memory: session.turns,
      suspicionBefore: session.suspicion,
      reportWeightBefore: session.reportPressure,
    });

    const suspicionDelta = evaluation.suspicionDelta;
    session.suspicion = evaluation.suspicionAfter;
    session.reportPressure = evaluation.reportWeightAfter;
    for (const signal of evaluation.suspicionSignals) {
      session.signalsSeen.add(signal);
    }
    session.turns.push({
      turnId,
      promptId: beat.promptId,
      line: classified.line,
      selectedChoiceId: classified.choiceId,
      freeInputHash: classified.freeInputHash,
      intent: classified.intent,
      signals: evaluation.suspicionSignals,
    });

    const whyLines = this.resolveWhyLines(session.storylet, evaluation.suspicionSignals);
    const projectedRoute = this.projectRoute(session);

    // Determine progression and NPC reactions.
    const npcReactions: NpcReaction[] = [];
    const ledgerEvents: LedgerEvent[] = [];

    // The examiner acknowledges verbally (non-mutating speech).
    npcReactions.push({
      actorId: beat.speakerId,
      role: this.roleForActor(session, beat.speakerId),
      kind: "speech",
      utterance: classified.speakerResponse,
    });

    let routeState: RouteState;
    let nextTurn: NextTurn | null;

    // Beat progression: advance along `beat.next`, but a route-gated beat
    // (e.g. the Station reconciliation, gated to hard_inquest) is only entered
    // when the projected route allows it. Otherwise the conversation resolves.
    const nextBeat = beat.next
      ? session.storylet.beats.find(b => b.beatId === beat.next)
      : undefined;
    const nextBeatAllowed =
      !!nextBeat && (!nextBeat.onlyWhenRoute || nextBeat.onlyWhenRoute.includes(projectedRoute));

    if (nextBeatAllowed && nextBeat) {
      // Entering a route-gated Station beat applies that route's record chain
      // now (the records that opened the Station), so the prompt is cited.
      if (nextBeat.onlyWhenRoute && nextBeat.onlyWhenRoute.length > 0) {
        const applied = this.applyRoute(session, projectedRoute);
        npcReactions.push(...applied.reactions);
        ledgerEvents.push(...applied.events);
      }
      session.beatIndex = session.storylet.beats.indexOf(nextBeat);
      routeState = this.routeState(this.stageForBeat(nextBeat), projectedRoute, false, session);
      nextTurn = this.buildNextTurn(session);
    } else {
      // Conversation resolves here.
      const applied = this.applyRoute(session, projectedRoute);
      npcReactions.push(...applied.reactions);
      ledgerEvents.push(...applied.events);
      session.finalRoute = projectedRoute;
      session.terminal = true;
      routeState = this.routeState("resolved", projectedRoute, true, session);
      nextTurn = null;
    }

    return {
      signals: evaluation.suspicionSignals,
      whyLines,
      suspicionDelta,
      reportPressure: session.reportPressure,
      npcReactions,
      ledgerEvents,
      routeState,
      nextTurn,
    };
  }

  decision(sessionId: string, beat: number): DecisionResult {
    const session = this.require(sessionId);
    // Beat tick: scheduled NPCs run an ambient agent-loop step. Deterministic,
    // low budget; observation-only tools so the tick never changes route truth.
    const actorId = "NPC_Waiting_Customer";
    const actor = this.actorContext(session, actorId);
    const memory = this.memoryFor(session, actorId);
    const goals: Array<{ call: ToolCall; goalLabel: string }> = [
      { call: { tool: "look", args: { targetId: "store_queue_mark" } }, goalLabel: "watch queue" },
      { call: { tool: "look", args: { targetId: "store_counter" } }, goalLabel: "watch counter" },
      { call: { tool: "wait", args: { reason: `beat ${beat}` } }, goalLabel: "hold position" },
    ];
    const result = runBeat({
      world: session.world,
      actor,
      policy: DEFAULT_ROLE_POLICIES[actor.role],
      memory,
      goals,
      transcript: session.transcript,
      heardSpeech: [],
      budget: 3,
    });
    session.world = result.world;
    session.memory.set(actorId, result.memory);
    return {
      npcActions: result.actions.map(a => ({
        actorId: a.actorId,
        tool: a.tool,
        args: a.args,
        utterance: a.utterance,
        validationResult: a.validationResult,
      })),
      ledgerEvents: result.events,
      transcriptDeltas: result.transcriptDeltas,
    };
  }

  snapshot(sessionId: string): FullSnapshot {
    const session = this.require(sessionId);
    const beat = session.terminal ? undefined : session.storylet.beats[session.beatIndex];
    return {
      sessionId,
      storyletId: session.storylet.storyletId,
      worldSnapshot: this.buildWorldSnapshot(session),
      records: visibleRecords(session.world, "player").map(r => ({
        recordId: r.recordId,
        kind: r.kind,
        authorRole: r.authorRole,
        stateBody: r.stateBody,
        visibleTo: r.visibleTo,
        lastLedgerEventId: r.lastLedgerEventId,
      })),
      ledgerEvents: visibleLedger(session.world, "player"),
      routeState: this.routeState(
        session.terminal ? "resolved" : this.stageForBeat(beat),
        session.finalRoute ?? this.projectRoute(session),
        session.terminal,
        session,
      ),
      nextTurn: session.terminal ? null : this.buildNextTurn(session),
    };
  }

  end(sessionId: string): SessionEndResult {
    const session = this.require(sessionId);
    const route = session.finalRoute ?? this.projectRoute(session);
    if (!session.terminal) {
      // Allow ending mid-conversation: resolve to the current projection.
      if (!session.routeApplied) {
        const applied = this.applyRoute(session, route);
        session.citedLedgerIds.push(...applied.events.map(e => e.eventId));
      }
      session.finalRoute = route;
      session.terminal = true;
    }
    const routeDef = session.storylet.routes[route];
    return {
      route,
      outcomePanel: {
        title: routeDef.title,
        body: routeDef.body,
        citedLedgerIds: [...session.citedLedgerIds],
      },
      telemetrySummary: {
        turns: session.turnCount,
        signalsSeen: [...session.signalsSeen],
        finalSuspicion: session.suspicion,
        finalReportPressure: session.reportPressure,
        ledgerEventCount: session.world.ledger.length,
        route,
      },
    };
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  private classifyAnswer(
    session: SessionState,
    beat: StoryletBeat,
    answer: SessionAnswer,
  ): {
    line: string;
    intent?: ConversationChoiceIntent;
    authoredSignals: ConversationSuspicionSignal[];
    choiceId?: string;
    freeInputHash?: string;
    speakerResponse: string;
  } {
    if (answer.type === "choice") {
      const choice = beat.choices.find(c => c.choiceId === answer.choiceId);
      if (!choice) {
        throw new SessionError(`unknown choice: ${answer.choiceId ?? "(none)"}`, "unknown_choice");
      }
      return {
        line: choice.line,
        intent: choice.intent,
        authoredSignals: [...choice.signals],
        choiceId: choice.choiceId,
        speakerResponse: choice.clerkResponse,
      };
    }
    if (answer.type === "free_input") {
      const text = (answer.text ?? "").trim();
      if (text.length === 0) {
        throw new SessionError("free_input requires non-empty text", "invalid_answer");
      }
      if (!beat.acceptsFreeInput) {
        throw new SessionError("this beat does not accept free input", "invalid_answer");
      }
      // Typed speech is treated in-fiction as a recorded statement (risky lane);
      // classification of the text itself is deterministic (conversation-suspicion).
      return {
        line: text,
        intent: "risky/weird",
        authoredSignals: [],
        freeInputHash: hashText(text),
        speakerResponse: "그 표현은 접수 형식으로 넘기겠습니다.",
      };
    }
    // hesitation
    return {
      line: "(응답 지연)",
      intent: undefined,
      authoredSignals: [session.storylet.hesitation.signal],
      speakerResponse: "대답이 늦으시네요. 확인이 필요합니다.",
    };
  }

  private resolveWhyLines(storylet: Storylet, signals: ConversationSuspicionSignal[]): string[] {
    if (signals.length === 0) {
      return [storylet.whyLines.none];
    }
    return signals.map(signal => storylet.whyLines[signal] ?? storylet.whyLines.none);
  }

  private projectRoute(session: SessionState): RouteId {
    const { softReport, inquest } = session.storylet.thresholds;
    if (session.reportPressure >= inquest) {
      return "hard_inquest";
    }
    if (session.reportPressure >= softReport) {
      return "soft_report";
    }
    if (session.signalsSeen.size > 0 || session.suspicion > 0) {
      return "repair_recovery";
    }
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
    if (!beat) {
      return "resolved";
    }
    if (beat.beatId === "routine") return "routine";
    if (beat.beatId === "probe") return "probe";
    if (beat.beatId === "reconciliation") return "reconciliation";
    return "routine";
  }

  private applyRoute(session: SessionState, routeId: RouteId): { reactions: NpcReaction[]; events: LedgerEvent[] } {
    const reactions: NpcReaction[] = [];
    const events: LedgerEvent[] = [];
    if (session.routeApplied) {
      return { reactions, events };
    }
    const route = session.storylet.routes[routeId];
    let previousActor: string | undefined;

    for (const consequence of route.consequences) {
      const actor = this.actorContext(session, consequence.actorId);
      const memory = this.memoryFor(session, consequence.actorId);

      let citedLedgerEventId: string | undefined;
      if (consequence.citeLedgerKind) {
        const cited = session.world.ledger.find(e => e.kind === consequence.citeLedgerKind);
        citedLedgerEventId = cited?.eventId;
        if (cited) {
          session.citedLedgerIds.push(cited.eventId);
        }
      }

      const record = consequence.record
        ? {
            recordId: consequence.record.recordId,
            kind: consequence.record.kind,
            targetId: consequence.record.targetId,
            stateBody: consequence.record.stateBody,
            visibleTo: [...consequence.record.visibleTo],
            capturedLine: consequence.record.captureSelectedLine
              ? this.lastPlayerLine(session)
              : undefined,
          }
        : undefined;

      const tool: ToolCall["tool"] = record ? "write_record" : "use_object";
      const call: ToolCall = {
        tool,
        args: {
          objectId: consequence.objectId,
          toState: consequence.toState,
          ledgerKind: consequence.ledgerKind,
          record,
          economyDelta: consequence.economyDelta,
          citedLedgerEventId,
          whyLine: consequence.whyLine,
        },
        utterance: consequence.whyLine,
      };

      const result = runBeat({
        world: session.world,
        actor,
        policy: DEFAULT_ROLE_POLICIES[actor.role],
        memory,
        goals: [{ call, goalLabel: consequence.ledgerKind }],
        transcript: session.transcript,
        heardSpeech: [],
        budget: 3,
      });
      session.world = result.world;
      session.memory.set(consequence.actorId, result.memory);

      for (const event of result.events) {
        events.push(event);
        session.citedLedgerIds.push(event.eventId);
      }
      for (const action of result.actions) {
        const reaction: NpcReaction = {
          actorId: action.actorId,
          role: actor.role,
          kind: "action",
          tool: action.tool,
          utterance: consequence.whyLine,
          ledgerEventId: action.ledgerEventId,
          whyLine: consequence.whyLine,
        };
        if (previousActor && previousActor !== consequence.actorId) {
          reaction.influence = { from: previousActor, to: consequence.actorId };
        }
        reactions.push(reaction);
      }
      previousActor = consequence.actorId;
    }

    session.routeApplied = true;
    // De-duplicate cited ids while preserving order.
    session.citedLedgerIds = [...new Set(session.citedLedgerIds)];
    return { reactions, events };
  }

  private lastPlayerLine(session: SessionState): string | undefined {
    const last = session.turns[session.turns.length - 1];
    return last?.line;
  }

  private actorContext(session: SessionState, actorId: string): ActorContextLite {
    const role = this.roleForActor(session, actorId);
    const knownActorIds = session.storylet.actors.map(a => a.actorId).filter(id => id !== actorId);
    const knownLandmarkIds = session.storylet.landmarks.map(l => l.landmarkId);
    const landmarkId = session.storylet.actors.find(a => a.actorId === actorId)?.landmarkId ?? "Store";
    return { actorId, role, landmarkId, knownActorIds, knownLandmarkIds };
  }

  private roleForActor(session: SessionState, actorId: string): WorldRole {
    return session.storylet.actors.find(a => a.actorId === actorId)?.role ?? "store_clerk";
  }

  private memoryFor(session: SessionState, actorId: string): ActorMemory {
    return (
      session.memory.get(actorId) ?? {
        actorId,
        ownActionNotes: [],
        observedLedgerEventIds: [],
      }
    );
  }

  private buildWorldSnapshot(session: SessionState): WorldSnapshot {
    const beat = session.terminal ? undefined : session.storylet.beats[session.beatIndex];
    return {
      landmarks: session.storylet.landmarks.map(l => ({ landmarkId: l.landmarkId, label: l.label })),
      actors: session.storylet.actors.map(a => ({
        actorId: a.actorId,
        role: a.role,
        name: a.name,
        landmarkId: a.landmarkId,
      })),
      recordProps: visibleObjects(session.world, "player").map(o => ({
        objectId: o.objectId,
        label: o.label,
        state: o.state,
        visibleTo: o.visibleTo,
        recordId: o.recordId,
      })),
      civicEconomy: { ...session.world.economy },
      hudState: {
        suspicion: session.suspicion,
        reportPressure: session.reportPressure,
        stage: session.terminal ? "resolved" : this.stageForBeat(beat),
        projectedRoute: session.finalRoute ?? this.projectRoute(session),
        ledgerCount: session.world.ledger.length,
        activePromptId: beat?.promptId ?? null,
      },
    };
  }

  private buildNextTurn(session: SessionState): NextTurn {
    const beat = session.storylet.beats[session.beatIndex];
    return {
      turnId: turnIdFor(session.storylet, session.beatIndex, beat.beatId),
      beatId: beat.beatId,
      promptId: beat.promptId,
      choiceSetId: beat.choiceSetId,
      speakerId: beat.speakerId,
      prompt: beat.prompt,
      acceptsFreeInput: beat.acceptsFreeInput,
      choices: beat.choices.map(c => ({ choiceId: c.choiceId, intent: c.intent, line: c.line })),
    };
  }
}

export { ROUTE_IDS };
export type { RouteId };

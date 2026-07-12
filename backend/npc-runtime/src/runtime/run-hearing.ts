import type {
  CoarseStance,
  HearingContactBasis,
} from "../contracts/types.js";
import type { GameplayLocale } from "../localization/supported-locales.js";
import type {
  RunActor,
  RunLedgerEvent,
  RunMemory,
  RunRecord,
} from "./run-schema.js";

export interface HearingMemoryView {
  memoryId: string;
  kind: RunMemory["kind"];
  sourceActorId: string;
  text: string;
  whyLine?: string;
  meaningfulFirsthand: boolean;
}

export interface HearingRecordView {
  recordId: string;
  kind: RunRecord["kind"];
  authorActorId: string;
  stateBody: string;
  lastLedgerEventId: string;
}

export interface HearingLedgerEventView {
  eventId: string;
  kind: RunLedgerEvent["kind"];
  actorId: string;
  recordId: string;
  sourceMemoryId: string;
  whyLine: string;
}

/** One resident's complete, visibility-safe run-owned evidence at the hearing. */
export interface HearingResidentView {
  actorId: string;
  role: RunActor["role"];
  stanceBefore: CoarseStance;
  hasMeaningfulFirsthandConversation: boolean;
  memories: HearingMemoryView[];
}

/** Provider request assembled only from actual state owned by the run. */
export interface HearingJudgmentRequest {
  runId: string;
  hearingId: string;
  locale: GameplayLocale;
  finalDefense: string;
  institutionalPressure: number;
  residents: [
    HearingResidentView,
    HearingResidentView,
    HearingResidentView,
    HearingResidentView,
    HearingResidentView,
    HearingResidentView,
  ];
  records: HearingRecordView[];
  ledgerEvents: HearingLedgerEventView[];
}

export interface HearingResidentAssessment {
  actorId: string;
  contactBasis: HearingContactBasis;
  proposedStance: CoarseStance;
  testimonyLine: string;
  citedMemoryIds: string[];
}

/** Model-owned meaning; RunService still validates every cited id and the quorum. */
export interface HearingJudgment {
  residentAssessments: [
    HearingResidentAssessment,
    HearingResidentAssessment,
    HearingResidentAssessment,
    HearingResidentAssessment,
    HearingResidentAssessment,
    HearingResidentAssessment,
  ];
  proposedVerdict: "ordinary" | "abnormal";
  verdictWhyLine: string;
  officerLine: string;
  citedRecordIds: string[];
  citedLedgerEventIds: string[];
}

export interface ValidatedHearingResidentAssessment extends HearingResidentAssessment {
  appliedStance: CoarseStance;
}

export interface ValidatedHearingJudgment {
  residentAssessments: [
    ValidatedHearingResidentAssessment,
    ValidatedHearingResidentAssessment,
    ValidatedHearingResidentAssessment,
    ValidatedHearingResidentAssessment,
    ValidatedHearingResidentAssessment,
    ValidatedHearingResidentAssessment,
  ];
  proposedVerdict: "ordinary" | "abnormal";
  verdictWhyLine: string;
  officerLine: string;
  citedRecordIds: string[];
  citedLedgerEventIds: string[];
  evidencedVouchCount: number;
}

/** Exact procedural contact basis derived only from one resident's memories. */
export function hearingContactBasisForMemories(
  memories: readonly HearingMemoryView[],
): HearingContactBasis {
  const playerConversations = memories.filter(
    memory => memory.kind === "player_conversation" && memory.sourceActorId === "player",
  );
  if (playerConversations.some(memory => memory.meaningfulFirsthand)) {
    return "meaningful_firsthand";
  }
  return playerConversations.length > 0 ? "limited_firsthand" : "never_conversed";
}

export function normalizeHearingMemory(memory: RunMemory): HearingMemoryView {
  if (memory.kind === "npc_utterance") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: memory.sourceActorId,
      text: memory.line,
      meaningfulFirsthand: false,
    };
  }
  if (memory.kind === "player_conversation") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: "player",
      text: `${memory.playerLine} / ${memory.npcLine}`,
      whyLine: memory.whyLine,
      meaningfulFirsthand: memory.meaningfulFirsthand,
    };
  }
  if (memory.kind === "ambient_utterance") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: memory.speakerActorId,
      text: memory.line,
      meaningfulFirsthand: false,
    };
  }
  if (memory.kind === "ambient_stance_judgment") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: memory.sourceActorId,
      text: memory.whyLine,
      whyLine: memory.whyLine,
      meaningfulFirsthand: false,
    };
  }
  if (memory.kind === "record_read") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: memory.sourceActorId,
      text: memory.stateBody,
      whyLine: memory.whyLine,
      meaningfulFirsthand: false,
    };
  }
  if (memory.kind === "player_contact_outcome") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: "player",
      text: memory.outcome,
      whyLine: memory.contactReason,
      meaningfulFirsthand: false,
    };
  }
  if (memory.kind === "prop_handling_observation") {
    return {
      memoryId: memory.memoryId,
      kind: memory.kind,
      sourceActorId: "player",
      text: `${memory.action}:${memory.propId}`,
      meaningfulFirsthand: false,
    };
  }
  return {
    memoryId: memory.memoryId,
    kind: memory.kind,
    sourceActorId: "player",
    text: memory.whyLine,
    whyLine: memory.whyLine,
    meaningfulFirsthand: false,
  };
}

export function buildHearingJudgmentRequest(options: {
  runId: string;
  hearingId: string;
  locale: GameplayLocale;
  finalDefense: string;
  institutionalPressure: number;
  actors: RunActor[];
  records: RunRecord[];
  ledgerEvents: RunLedgerEvent[];
}): HearingJudgmentRequest {
  if (options.actors.length !== 6) throw new Error("hearing requires exactly six residents");
  const residents = options.actors.map(actor => {
    const memories = actor.memories.map(normalizeHearingMemory);
    return {
      actorId: actor.actorId,
      role: actor.role,
      stanceBefore: actor.stance,
      hasMeaningfulFirsthandConversation:
        hearingContactBasisForMemories(memories) === "meaningful_firsthand",
      memories,
    };
  }) as HearingJudgmentRequest["residents"];
  return {
    runId: options.runId,
    hearingId: options.hearingId,
    locale: options.locale,
    finalDefense: options.finalDefense,
    institutionalPressure: options.institutionalPressure,
    residents,
    records: options.records.map(record => ({
      recordId: record.recordId,
      kind: record.kind,
      authorActorId: record.authorActorId,
      stateBody: record.stateBody,
      lastLedgerEventId: record.lastLedgerEventId,
    })),
    ledgerEvents: options.ledgerEvents.map(event => ({
      eventId: event.eventId,
      kind: event.kind,
      actorId: event.actorId,
      recordId: event.recordId,
      sourceMemoryId: event.sourceMemoryId,
      whyLine: event.whyLine,
    })),
  };
}

export function validateHearingJudgment(
  request: HearingJudgmentRequest,
  judgment: HearingJudgment,
): { ok: true; value: ValidatedHearingJudgment } | { ok: false; reason: string } {
  const expectedIds = request.residents.map(resident => resident.actorId).sort();
  const assessmentIds = judgment.residentAssessments.map(assessment => assessment.actorId);
  if (
    assessmentIds.length !== 6 ||
    new Set(assessmentIds).size !== 6 ||
    JSON.stringify([...assessmentIds].sort()) !== JSON.stringify(expectedIds)
  ) {
    return { ok: false, reason: "resident assessments must name the exact six run actors" };
  }
  if (
    !judgment.verdictWhyLine.trim() ||
    !judgment.officerLine.trim() ||
    new Set(judgment.citedRecordIds).size !== judgment.citedRecordIds.length ||
    new Set(judgment.citedLedgerEventIds).size !== judgment.citedLedgerEventIds.length
  ) {
    return { ok: false, reason: "hearing judgment has empty prose or duplicate citations" };
  }
  const knownRecordIds = new Set(request.records.map(record => record.recordId));
  const knownLedgerIds = new Set(request.ledgerEvents.map(event => event.eventId));
  if (judgment.citedRecordIds.some(recordId => !knownRecordIds.has(recordId))) {
    return { ok: false, reason: "hearing judgment cites an unknown record" };
  }
  if (judgment.citedLedgerEventIds.some(eventId => !knownLedgerIds.has(eventId))) {
    return { ok: false, reason: "hearing judgment cites an unknown ledger event" };
  }

  const validated: ValidatedHearingResidentAssessment[] = [];
  for (const assessment of judgment.residentAssessments) {
    const resident = request.residents.find(candidate => candidate.actorId === assessment.actorId);
    if (!resident || !assessment.testimonyLine.trim()) {
      return { ok: false, reason: "hearing assessment is missing its resident or testimony" };
    }
    if (new Set(assessment.citedMemoryIds).size !== assessment.citedMemoryIds.length) {
      return { ok: false, reason: "hearing assessment repeats a memory citation" };
    }
    const citedMemories = assessment.citedMemoryIds.map(memoryId =>
      resident.memories.find(memory => memory.memoryId === memoryId)
    );
    if (citedMemories.some(memory => memory === undefined)) {
      return { ok: false, reason: `hearing assessment cites memory outside ${resident.actorId}` };
    }
    const expectedContactBasis = hearingContactBasisForMemories(resident.memories);
    if (assessment.contactBasis !== expectedContactBasis) {
      return {
        ok: false,
        reason: `hearing assessment contact basis contradicts ${resident.actorId} memories`,
      };
    }
    const evidencedVouch = Boolean(
      expectedContactBasis === "meaningful_firsthand" &&
      citedMemories.some(memory =>
        memory?.kind === "player_conversation" &&
        memory.sourceActorId === "player" &&
        memory.meaningfulFirsthand
      )
    );
    validated.push({
      ...assessment,
      appliedStance:
        assessment.proposedStance === "vouch" && !evidencedVouch
          ? "uncertain"
          : assessment.proposedStance,
    });
  }
  const evidencedVouchCount = validated.filter(
    assessment => assessment.appliedStance === "vouch",
  ).length;
  return {
    ok: true,
    value: {
      residentAssessments: validated as ValidatedHearingJudgment["residentAssessments"],
      proposedVerdict: judgment.proposedVerdict,
      verdictWhyLine: judgment.verdictWhyLine,
      officerLine: judgment.officerLine,
      citedRecordIds: [...judgment.citedRecordIds],
      citedLedgerEventIds: [...judgment.citedLedgerEventIds],
      evidencedVouchCount,
    },
  };
}

import assert from "node:assert/strict";
import { test } from "bun:test";
import { assembleObservePacket, DEFAULT_ROLE_POLICIES } from "../../src/agentloop/context.js";
import { fallbackContent } from "../../src/localization/fallback-content.js";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import {
  ambientReplyJudgmentJsonSchema,
  ambientReplyJudgmentSchemaForLocale,
  agentStepProposalJsonSchema,
  agentStepProposalSchemaForLocale,
  hearingJudgmentJsonSchema,
  hearingJudgmentSchemaForLocale,
} from "../../src/providers/envelope.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { createProviderFromEnvironment, loadProviderConfig } from "../../src/providers/registry.js";
import { ProviderService } from "../../src/providers/service.js";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import {
  providerAuditSnapshotSchema,
  providerRuntimeTraceSchema,
} from "../../src/runtime/run-schema.js";
import type {
  AmbientReplyRequest,
  HearingJudgment,
  HearingJudgmentRequest,
  ProviderFailureReason,
  TextGenPort,
  TextGenRequest,
  TextGenResult,
} from "../../src/providers/ports.js";

class FakeTextGen implements TextGenPort {
  readonly adapterId = "fake";
  readonly requests: TextGenRequest[] = [];

  constructor(
    private readonly outputs: Array<TextGenResult | Error>,
    private readonly available = true,
    private readonly unavailableReason: ProviderFailureReason = "missing_credentials",
  ) {}

  async preflight(): Promise<{ available: boolean; reason?: ProviderFailureReason }> {
    return this.available ? { available: true } : { available: false, reason: this.unavailableReason };
  }

  async generate(request: TextGenRequest): Promise<TextGenResult> {
    this.requests.push(request);
    const next = this.outputs.shift();
    if (!next) throw new Error("no fake output");
    if (next instanceof Error) throw next;
    return next;
  }
}

function observePacket() {
  const packet = assembleObservePacket(createSameOrderWorld(), {
    actor: {
      actorId: "NPC_Store_Clerk",
      role: "store_clerk",
      landmarkId: "Store",
      knownActorIds: ["player", "NPC_Store_Manager"],
      knownLandmarkIds: ["Store", "Station"],
    },
    goals: ["평소 주문을 확인한다"],
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: { actorId: "NPC_Store_Clerk", ownActionNotes: [], observedLedgerEventIds: [] },
    heardSpeech: [],
  });
  packet.audibleActorIds = ["player", "NPC_Store_Manager"];
  return packet;
}

function conversationRequest() {
  return {
    sessionId: "session-provider-test",
    locale: "ko-KR",
    beatId: "routine",
    actorId: "NPC_Store_Clerk",
    objective: "평소 주문을 확인한다.",
    sceneFacts: ["플레이어는 단골로 취급된다."],
    observePacket: observePacket(),
    conversationHistory: [],
  };
}

const validConversation = JSON.stringify({
  utterance: "평소 주문으로 준비할까요?",
  suggestedReplies: [
    { text: "네, 부탁합니다.", intent: "safe/local" },
    { text: "제가 뭘 주문했죠?", intent: "uncertain/repair" },
    { text: "처음 왔습니다.", intent: "risky/weird" },
  ],
  continueConversation: true,
});

function judgmentRequest() {
  return {
    sessionId: "session-provider-test",
    locale: "ko-KR",
    beatId: "routine",
    promptId: "store.same_order.routine",
    actorId: "NPC_Store_Clerk",
    playerLine: "꿈에서 봤던 세계라서 기억이 흐려요.",
    conversationHistory: [
      { speakerId: "NPC_Store_Clerk", line: "오늘도 같은 걸로 드릴까요?" },
    ],
    observePacket: observePacket(),
    suspicionBefore: 0,
    reportPressureBefore: 0,
  };
}

const validJudgment = JSON.stringify({
  suspicionDelta: 35,
  reportDelta: 20,
  signals: ["dream_language_leak"],
  whyLine: "그 표현은 꿈 바깥의 말이라 점원이 기억해 둘 만합니다.",
});

const validMergedTurn = JSON.stringify({
  suspicionDelta: -10,
  reportDelta: 0,
  signals: [],
  whyLine: "방문 이유를 분명하게 설명해 의문이 줄었습니다.",
  stance: "vouch",
  meaningfulFirsthand: true,
  openQuestion: null,
  utterance: "방문 목적을 확인했습니다.",
  suggestedReplies: [
    { text: "확인해 주셔서 감사합니다.", intent: "safe/local" },
    { text: "다음 절차를 알려 주세요.", intent: "uncertain/repair" },
    { text: "더 말하지 않겠습니다.", intent: "risky/weird" },
  ],
  continueConversation: false,
});

function ambientReplyRequest(locale = "ko-KR"): AmbientReplyRequest {
  const packet = observePacket();
  packet.visibleActors = ["NPC_Store_Manager"];
  packet.audibleActorIds = ["NPC_Store_Manager"];
  packet.heardSpeech = ["NPC_Store_Manager: 방문자가 앞서 다른 설명을 했습니다."];
  return {
    sessionId: "run-ambient-provider-test",
    locale,
    wakeId: "wake-ambient-provider-test",
    conversationId: "ambient:wake-ambient-provider-test",
    sourceSpeakerActorId: "NPC_Store_Manager",
    sourceUtterance: "방문자가 앞서 다른 설명을 했습니다.",
    listenerActorId: "NPC_Store_Clerk",
    targetActorId: "NPC_Store_Manager",
    stanceBefore: "uncertain",
    suspicionBefore: 10,
    hasMeaningfulFirsthandConversation: false,
    observePacket: packet,
    budgetCeiling: { maxCalls: 100, maxTokens: 250_000 },
  };
}

const validAmbientReply = JSON.stringify({
  toolCall: { tool: "talk_to", args: { actorId: "NPC_Store_Manager" } },
  utterance: "그 설명이 왜 달랐는지 직접 확인해 보겠습니다.",
  rationale: "관리자에게 들은 구체적인 말이 방문자에 대한 의문을 키웠습니다.",
  done: true,
  suspicionDelta: 18,
  proposedStance: "oppose",
  whyLine: "관리자에게 들은 설명 차이 때문에 방문자를 경계하게 됐습니다.",
  openQuestion: {
    status: "open",
    text: "방문자는 왜 서로 다른 설명을 했을까?",
    whyLine: "전해 들은 설명의 차이를 직접 확인해야 합니다.",
  },
});

const HEARING_RESIDENTS = [
  ["NPC_Studio_Receptionist", "studio_receptionist"],
  ["NPC_Studio_Manager", "studio_manager"],
  ["NPC_Office_Worker", "office_worker"],
  ["NPC_Park_Caretaker", "park_caretaker"],
  ["NPC_Station_Officer", "station_officer"],
  ["NPC_Roaming_Liaison", "roaming_liaison"],
] as const;

function hearingRequest(
  evidencedVouches = 4,
  locale: HearingJudgmentRequest["locale"] = "ko-KR",
): HearingJudgmentRequest {
  const residents = HEARING_RESIDENTS.map(([actorId, role], index) => {
    const hasMeaningfulFirsthandConversation = index < 5;
    return {
      actorId,
      role,
      stanceBefore: index < evidencedVouches ? "vouch" as const : "uncertain" as const,
      hasMeaningfulFirsthandConversation,
      memories: hasMeaningfulFirsthandConversation
        ? [{
            memoryId: `mem-hearing-${index + 1}`,
            kind: "player_conversation" as const,
            sourceActorId: "player",
            text: "방문자가 절차를 차분히 설명했습니다.",
            whyLine: "직접 들은 설명이 앞선 정황과 맞았습니다.",
            meaningfulFirsthand: true,
          }]
        : [],
    };
  }) as HearingJudgmentRequest["residents"];
  return {
    runId: "run-hearing-provider-test",
    hearingId: "hearing-provider-test",
    locale,
    finalDefense: "주민들과 직접 나눈 대화를 확인해 주십시오.",
    institutionalPressure: 35,
    residents,
    records: [{
      recordId: "record-hearing-1",
      kind: "note",
      authorActorId: "NPC_Office_Worker",
      stateBody: "방문자가 절차를 확인했다는 기록입니다.",
      lastLedgerEventId: "ledger-hearing-1",
    }],
    ledgerEvents: [{
      eventId: "ledger-hearing-1",
      kind: "record_written",
      actorId: "NPC_Office_Worker",
      recordId: "record-hearing-1",
      sourceMemoryId: "mem-hearing-3",
      whyLine: "직접 들은 설명을 기록했습니다.",
    }],
  };
}

function validHearingJudgment(): HearingJudgment {
  return {
    residentAssessments: HEARING_RESIDENTS.map(([actorId], index) => ({
      actorId,
      proposedStance: index < 4 ? "vouch" as const : "uncertain" as const,
      testimonyLine: index === 5
        ? "직접 대화한 적이 없어 보증할 수 없습니다."
        : "직접 들은 설명이 앞선 정황과 맞았습니다.",
      citedMemoryIds: index === 5 ? [] : [`mem-hearing-${index + 1}`],
    })) as HearingJudgment["residentAssessments"],
    proposedVerdict: "ordinary",
    verdictWhyLine: "직접 대화에 근거한 보증과 최종 진술이 서로 맞았습니다.",
    officerLine: "제출된 증언을 검토했습니다. 평범한 사람으로 판정합니다.",
    citedRecordIds: ["record-hearing-1"],
    citedLedgerEventIds: ["ledger-hearing-1"],
  };
}

function assertEveryObjectPropertyIsRequired(value: unknown, path = "root"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertEveryObjectPropertyIsRequired(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const schema = value as Record<string, unknown>;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    const propertyNames = Object.keys(schema.properties as Record<string, unknown>).sort();
    const required = Array.isArray(schema.required)
      ? schema.required.filter((entry): entry is string => typeof entry === "string").sort()
      : [];
    assert.deepEqual(required, propertyNames, `${path} must require every declared property`);
  }
  for (const [key, child] of Object.entries(schema)) {
    assertEveryObjectPropertyIsRequired(child, `${path}.${key}`);
  }
}

test("agent-step strict schema requires every property in every object branch", () => {
  assertEveryObjectPropertyIsRequired(agentStepProposalJsonSchema);
});

test("ambient reply schema keeps the exact talk target and all listener judgment fields strict", () => {
  assertEveryObjectPropertyIsRequired(ambientReplyJudgmentJsonSchema);
  const valid = JSON.parse(validAmbientReply);
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse(valid).success, true);
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse({
    ...valid,
    rationale: "NPC_Store_Clerk compared sourceMemoryId mem-ambient-1 with current context.",
  }).success, true, "internal rationale may contain stable ids and English diagnostics");
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse({
    ...valid,
    done: false,
  }).success, false);
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse({
    ...valid,
    whyLine: "관리자에게 들은 說明이 달랐습니다.",
  }).success, false);
});

test("hearing strict schema requires every property and exactly six unique residents", () => {
  assertEveryObjectPropertyIsRequired(hearingJudgmentJsonSchema);
  const residentArray = (
    hearingJudgmentJsonSchema.properties as Record<string, Record<string, unknown>>
  ).residentAssessments;
  assert.equal(residentArray.minItems, 6);
  assert.equal(residentArray.maxItems, 6);

  const valid = validHearingJudgment();
  assert.equal(hearingJudgmentSchemaForLocale("ko-KR").safeParse(valid).success, true);
  const duplicate = structuredClone(valid);
  duplicate.residentAssessments[5].actorId = duplicate.residentAssessments[0].actorId;
  assert.equal(hearingJudgmentSchemaForLocale("ko-KR").safeParse(duplicate).success, false);
  const missing = {
    ...valid,
    residentAssessments: valid.residentAssessments.slice(0, 5),
  };
  assert.equal(hearingJudgmentSchemaForLocale("ko-KR").safeParse(missing).success, false);
});

test("Korean agent-step validation covers provider-authored administrative questions", () => {
  const proposal = {
    toolCall: {
      tool: "write_record",
      args: {
        recordKind: "note",
        sourceMemoryId: "mem-question-source",
        stateBody: "방문 경위를 추가로 확인해야 합니다.",
        whyLine: "접수 기록이 의문을 남겼습니다.",
        institutionalPressureDelta: 10,
        textSurfaceId: "TS_Studio_ReviewRecords",
        openQuestion: {
          status: "open",
          text: "방문자의 來歷은 무엇인가?",
          whyLine: "기록의 根據를 다시 확인해야 합니다.",
        },
      },
    },
    utterance: null,
    rationale: "접수 기록을 남깁니다.",
    done: true,
  };
  assert.equal(agentStepProposalSchemaForLocale("ko-KR").safeParse(proposal).success, false);
  assert.equal(agentStepProposalSchemaForLocale("en-US").safeParse(proposal).success, true);
  proposal.toolCall.args.openQuestion = {
    status: "open",
    text: "방문 경위는 무엇인가?",
    whyLine: "기록의 근거를 다시 확인해야 합니다.",
  };
  assert.equal(agentStepProposalSchemaForLocale("ko-KR").safeParse(proposal).success, true);
});

test("deterministic fallback keeps a grounded player contact opportunity playable", async () => {
  const packet = observePacket();
  packet.playerContact = {
    available: true,
    targetActorId: "player",
    interactionZoneId: "ParkConversation",
    playerLocationId: "Park",
    visible: true,
    audible: true,
    reachable: true,
    safeDistanceM: 2.2,
  };
  const resolved = await new RuleFallbackNpcAdapter().proposeNextStep({
    sessionId: "fallback-contact",
    locale: "ko-KR",
    iteration: 0,
    goal: "방문자에게 직접 확인할지 판단한다.",
    observePacket: packet,
    blockedSignatures: [],
  });
  assert.deepEqual(resolved.proposal.toolCall, {
    tool: "move_to",
    args: { targetId: "player" },
  });
  assert.equal(resolved.meta.transport, "fallback");
});

test("provider service returns schema-validated live conversation proposals", async () => {
  const textGen = new FakeTextGen([
    { text: validConversation, usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } },
  ]);
  const service = new ProviderService({
    profileId: "test/live",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.proposeConversationTurn(conversationRequest());
  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.suggestedReplies.length, 3);
  assert.equal(textGen.requests[0].schemaName, "npc_conversation_turn");
  assert.deepEqual(service.auditSnapshot("session-provider-test"), {
    callsUsed: 1,
    tokensUsed: 50,
    inFlightCalls: 0,
    inFlightTokens: 0,
    complete: true,
    truncated: false,
    droppedCount: 0,
    calls: [{
      seq: 1,
      purpose: "conversation",
      profileId: "test/live",
      transport: "live",
      usedFallback: false,
      outcome: "success",
      failureReason: null,
      chargedTokens: 50,
    }],
    resolutions: [{
      seq: 1,
      purpose: "conversation",
      profileId: "test/live",
      transport: "live",
      usedFallback: false,
      fallbackReason: null,
      callSeqs: [1],
    }],
  });
  providerAuditSnapshotSchema.parse(service.auditSnapshot("session-provider-test"));
});

test("ambient reply is one schema-validated call with its own audit purpose and neutral localized fallback", async () => {
  const internalRationale =
    "NPC_Store_Clerk compared sourceMemoryId mem-ambient-1 with current context.";
  const textGen = new FakeTextGen([
    {
      text: JSON.stringify({
        ...JSON.parse(validAmbientReply),
        rationale: internalRationale,
      }),
      usage: { inputTokens: 12, outputTokens: 18, totalTokens: 30 },
    },
  ]);
  const service = new ProviderService({
    profileId: "test/ambient-reply",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const request = ambientReplyRequest();
  const result = await service.judgeAndProposeAmbientReply(request);
  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.fallbackReason, undefined);
  assert.equal(result.proposal.proposedStance, "oppose");
  assert.equal(result.proposal.suspicionDelta, 18);
  assert.equal(result.proposal.rationale, internalRationale);
  assert.equal(textGen.requests.length, 1);
  assert.equal(textGen.requests[0]?.purpose, "ambient_reply");
  assert.equal(textGen.requests[0]?.schemaName, "npc_ambient_reply_judgment");
  assert.match(textGen.requests[0]?.instructions ?? "", /NPC hearsay, not a new player answer/);
  const input = JSON.parse(textGen.requests[0]?.input ?? "{}");
  assert.equal(input.sourceUtterance, request.sourceUtterance);
  assert.equal(input.listenerActorId, request.listenerActorId);
  assert.deepEqual(service.auditSnapshot(request.sessionId).resolutions, [{
    seq: 1,
    purpose: "ambient_reply",
    profileId: "test/ambient-reply",
    transport: "live",
    usedFallback: false,
    fallbackReason: null,
    callSeqs: [1],
  }]);

  const unavailable = new ProviderService({
    profileId: "test/ambient-unavailable",
    textGen: new FakeTextGen([], false),
    fallback: new RuleFallbackNpcAdapter(),
  });
  const fallback = await unavailable.judgeAndProposeAmbientReply(request);
  assert.equal(fallback.meta.fallbackReason, "missing_credentials");
  assert.equal(fallback.proposal.suspicionDelta, 0);
  assert.equal(fallback.proposal.proposedStance, request.stanceBefore);
  assert.equal(
    fallback.proposal.whyLine,
    fallbackContent("ko-KR").agent.ambientNoChangeWhy,
  );
  assert.doesNotMatch(fallback.proposal.whyLine, /답변/);
});

test("provider service returns one live evidence-grounded hearing judgment", async () => {
  const judgment = validHearingJudgment();
  const textGen = new FakeTextGen([{ text: JSON.stringify(judgment) }]);
  const service = new ProviderService({
    profileId: "test/hearing-live",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const request = hearingRequest();
  const result = await service.judgeHearing(request);

  assert.equal(result.meta.transport, "live");
  assert.deepEqual(result.proposal, judgment);
  assert.equal(textGen.requests.length, 1);
  assert.equal(textGen.requests[0].purpose, "hearing_verdict");
  assert.equal(textGen.requests[0].schemaName, "station_hearing_judgment");
  assert.match(textGen.requests[0].instructions, /resident's own supplied memories/);
  assert.match(textGen.requests[0].instructions, /at least four evidence-backed vouches/);
  assert.match(textGen.requests[0].instructions, /may still propose abnormal/);
  assert.match(textGen.requests[0].instructions, /run locale is ko-KR/);
  const providerInput = JSON.parse(textGen.requests[0].input);
  assert.equal(providerInput.residents.length, 6);
  assert.deepEqual(providerInput.records, request.records);
  assert.deepEqual(providerInput.ledgerEvents, request.ledgerEvents);
});

test("an invalid hearing envelope receives one repair before fallback", async () => {
  const invalid = validHearingJudgment();
  invalid.residentAssessments[5].actorId = invalid.residentAssessments[0].actorId;
  invalid.residentAssessments[0].testimonyLine = "직접 들은 來歷을 확인했습니다.";
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalid) },
    { text: JSON.stringify(validHearingJudgment()) },
  ]);
  const service = new ProviderService({
    profileId: "test/hearing-repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeHearing(hearingRequest());

  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 2);
  assert.equal(textGen.requests[1].purpose, "repair");
  assert.equal(result.proposal.residentAssessments.length, 6);
  assert.doesNotMatch(
    result.proposal.residentAssessments[0].testimonyLine,
    /[\p{Script=Latin}\p{Script=Han}]/u,
  );
});

test("hearing fallback is terminal, preserves stances, and needs four evidenced vouches", async () => {
  const fallback = new RuleFallbackNpcAdapter();
  const fourRequest = hearingRequest(4);
  const four = await fallback.judgeHearing(fourRequest);
  assert.equal(four.proposal.proposedVerdict, "ordinary");
  assert.equal(four.proposal.residentAssessments.length, 6);
  assert.deepEqual(
    four.proposal.residentAssessments.map(assessment => assessment.proposedStance),
    fourRequest.residents.map(resident => resident.stanceBefore),
  );
  assert.equal(
    four.proposal.residentAssessments[5].testimonyLine,
    fallbackContent("ko-KR").hearing.neverMetTestimony,
  );
  assert.deepEqual(four.proposal.residentAssessments[5].citedMemoryIds, []);
  assert.doesNotMatch(
    four.proposal.residentAssessments[0].testimonyLine,
    /NPC_|mem-hearing/,
    "fallback testimony must not expose raw ids in player prose",
  );

  const three = await fallback.judgeHearing(hearingRequest(3));
  assert.equal(three.proposal.proposedVerdict, "abnormal");
  const unsupportedFourth = hearingRequest(4);
  unsupportedFourth.residents[3].memories = [];
  const unsupported = await fallback.judgeHearing(unsupportedFourth);
  assert.equal(unsupported.proposal.proposedVerdict, "abnormal");

  const unavailable = new ProviderService({
    profileId: "test/hearing-unavailable",
    textGen: new FakeTextGen([], false),
    fallback,
  });
  const terminal = await unavailable.judgeHearing(fourRequest);
  assert.equal(terminal.meta.transport, "fallback");
  assert.equal(terminal.meta.fallbackReason, "missing_credentials");
  assert.equal(terminal.proposal.proposedVerdict, "ordinary");
  assert.ok(terminal.proposal.officerLine.length > 0);
  assert.ok(terminal.proposal.verdictWhyLine.length > 0);
});

test("scripted provider tests may configure an exact hearing verdict", async () => {
  const expected = validHearingJudgment();
  expected.proposedVerdict = "abnormal";
  const adapter = new ScriptedNpcAdapter({
    conversation: () => JSON.parse(validConversation),
    nextStep: () => ({ rationale: "테스트를 마칩니다.", done: true }),
    hearing: () => expected,
  });
  const result = await adapter.judgeHearing(hearingRequest());
  assert.equal(result.meta.transport, "scripted");
  assert.equal(result.proposal.proposedVerdict, "abnormal");
});

test("the model judges suspicion live; the rule classifier answers only as fallback", async () => {
  const judgmentTextGen = new FakeTextGen([{ text: validJudgment }]);
  const live = new ProviderService({
    profileId: "test/judgment",
    textGen: judgmentTextGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const judged = await live.judgeConversationTurn(judgmentRequest());
  assert.equal(judged.meta.transport, "live");
  assert.equal(judged.proposal.suspicionDelta, 35);
  assert.deepEqual(judged.proposal.signals, ["dream_language_leak"]);
  assert.match(judged.proposal.whyLine, /[가-힣]/);
  assert.match(judgmentTextGen.requests[0].instructions, /0\.\.125 game scale/);
  assert.match(judgmentTextGen.requests[0].instructions, /not tiny 1\.\.5 ratings/);
  assert.match(judgmentTextGen.requests[0].instructions, /do not mix Latin letters, Chinese characters/);

  const down = new ProviderService({
    profileId: "test/judgment-down",
    textGen: new FakeTextGen([], false),
    fallback: new RuleFallbackNpcAdapter(),
  });
  const fallback = await down.judgeConversationTurn(judgmentRequest());
  assert.equal(fallback.meta.transport, "fallback");
  assert.equal(fallback.meta.fallbackReason, "missing_credentials");
  // The dream-language line still registers through the deterministic classifier.
  assert.ok(fallback.proposal.signals.includes("dream_language_leak"));
  assert.ok(fallback.proposal.suspicionDelta > 0);
});

test("the one blocking merged call returns model-owned stance with firsthand grounding", async () => {
  const textGen = new FakeTextGen([{ text: validMergedTurn }]);
  const service = new ProviderService({
    profileId: "test/merged-stance",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeAndProposeConversationTurn({
    ...judgmentRequest(),
    objective: "방문 이유를 확인한다.",
    sceneFacts: ["스튜디오 접수대에서 직접 대화하고 있다."],
    stanceBefore: "uncertain",
    hasMeaningfulFirsthandConversation: false,
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(result.proposal.stance, "vouch");
  assert.equal(result.proposal.meaningfulFirsthand, true);
  assert.equal(textGen.requests.length, 1);
  assert.equal(textGen.requests[0].schemaName, "npc_merged_conversation_turn");
  assert.match(textGen.requests[0].instructions, /vouch requires it/);
  const input = JSON.parse(textGen.requests[0].input);
  assert.equal(input.stanceBefore, "uncertain");
  assert.equal(input.hasMeaningfulFirsthandConversation, false);
});

test("agent-step prompts keep visible language Korean and stop successful repetition", async () => {
  const textGen = new FakeTextGen([
    {
      text: JSON.stringify({
        toolCall: null,
        utterance: null,
        rationale: "기록을 이미 읽었으므로 행동을 마칩니다.",
        done: true,
      }),
    },
  ]);
  const service = new ProviderService({
    profileId: "test/agent-language",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.proposeNextStep({
    sessionId: "session-agent-language",
    locale: "ko-KR",
    iteration: 2,
    goal: "보이는 기록을 읽고 반응한다.",
    observePacket: observePacket(),
    previousResult: {
      tool: "read_record",
      args: { recordId: "rec-1" },
      ok: true,
      note: "record read",
    },
    blockedSignatures: [],
  });
  assert.equal(result.meta.transport, "live");
  assert.equal(result.proposal.done, true);
  assert.match(textGen.requests[0].instructions, /run locale is ko-KR/);
  assert.match(textGen.requests[0].instructions, /natural modern Korean/);
  assert.match(textGen.requests[0].instructions, /Never repeat an identical successful tool call/);

  const ambientFallback = await new RuleFallbackNpcAdapter().proposeNextStep({
    sessionId: "run-ambient-fallback",
    locale: "ko-KR",
    iteration: 0,
    goal: "곁에 있는 주민과 직접 말한다.",
    observePacket: observePacket(),
    blockedSignatures: [],
    requiredToolCall: { tool: "talk_to", actorId: "NPC_Store_Manager" },
    requireUtterance: true,
  });
  assert.equal(ambientFallback.proposal.toolCall?.tool, "talk_to");
  assert.equal(ambientFallback.proposal.toolCall?.args.actorId, "NPC_Store_Manager");
  assert.match(ambientFallback.proposal.utterance ?? "", /[가-힣]/);
  assert.doesNotMatch(
    ambientFallback.proposal.utterance ?? "",
    /[\p{Script=Latin}\p{Script=Han}]/u,
  );
  const mismatchedPacket = observePacket();
  mismatchedPacket.audibleActorIds = ["player"];
  const exactTargetFallback = await new RuleFallbackNpcAdapter().proposeNextStep({
    sessionId: "run-ambient-exact-target",
    locale: "ko-KR",
    iteration: 0,
    goal: "지정된 주민에게만 답한다.",
    observePacket: mismatchedPacket,
    blockedSignatures: [],
    requiredToolCall: { tool: "talk_to", actorId: "NPC_Store_Manager" },
    requireUtterance: true,
  });
  assert.notEqual(exactTargetFallback.proposal.toolCall?.tool, "talk_to");
});

test("mixed-script player text gets one repair before it reaches the game", async () => {
  const mixedScriptJudgment = JSON.stringify({
    suspicionDelta: 45,
    reportDelta: 30,
    signals: ["dream_language_leak"],
    whyLine: "꿈이라는 단어를公然히 사용했습니다.",
  });
  const textGen = new FakeTextGen([{ text: mixedScriptJudgment }, { text: validJudgment }]);
  const service = new ProviderService({
    profileId: "test/korean-repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeConversationTurn(judgmentRequest());
  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 2);
  assert.equal(textGen.requests[1].purpose, "repair");
  assert.doesNotMatch(result.proposal.whyLine, /[\p{Script=Latin}\p{Script=Han}]/u);
});

test("provider prompts and validation follow a non-Korean run locale without another adapter", async () => {
  const textGen = new FakeTextGen([
    {
      text: JSON.stringify({
        suspicionDelta: -5,
        reportDelta: 0,
        signals: [],
        whyLine: "That answer fits the facts established so far.",
      }),
    },
  ]);
  const service = new ProviderService({
    profileId: "test/english-locale",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeConversationTurn({
    ...judgmentRequest(),
    locale: "en-US",
    playerLine: "I came to confirm the registration procedure.",
  });
  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 1);
  assert.match(textGen.requests[0].instructions, /run locale is en-US/);
  assert.match(textGen.requests[0].instructions, /natural American English/);
  assert.doesNotMatch(textGen.requests[0].instructions, /do not mix Latin letters/);
  assert.equal(JSON.parse(textGen.requests[0].input).locale, "en-US");
});

test("invalid provider JSON gets one bounded repair attempt", async () => {
  const textGen = new FakeTextGen([
    { text: "not json", usage: { inputTokens: 5, outputTokens: 1, totalTokens: 6 } },
    { text: validConversation, usage: { inputTokens: 7, outputTokens: 2, totalTokens: 9 } },
  ]);
  const service = new ProviderService({
    profileId: "test/repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.proposeConversationTurn(conversationRequest());
  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 2);
  assert.equal(textGen.requests[1].purpose, "repair");
  assert.deepEqual(service.accountingSnapshot("session-provider-test"), {
    callsUsed: 2,
    tokensUsed: 15,
  });
  assert.equal(result.meta.usage?.totalTokens, 15);
  const repairAudit = service.auditSnapshot("session-provider-test");
  assert.equal(repairAudit.calls.length, 2);
  assert.deepEqual(repairAudit.calls.map(call => [call.seq, call.purpose, call.chargedTokens]), [
    [1, "conversation", 6],
    [2, "repair", 9],
  ]);
  assert.equal(repairAudit.resolutions.length, 1);
  assert.deepEqual(repairAudit.resolutions[0]?.callSeqs, [1, 2]);
  assert.equal(repairAudit.resolutions[0]?.transport, "live");
  assert.equal(repairAudit.tokensUsed, repairAudit.calls.reduce(
    (total, call) => total + call.chargedTokens,
    0,
  ));
});

test("missing credentials and exhausted budget use explicit fallback metadata", async () => {
  const unavailable = new ProviderService({
    profileId: "test/missing",
    textGen: new FakeTextGen([], false),
    fallback: new RuleFallbackNpcAdapter(),
  });
  const missing = await unavailable.proposeConversationTurn(conversationRequest());
  assert.equal(missing.meta.transport, "fallback");
  assert.equal(missing.meta.fallbackReason, "missing_credentials");
  assert.equal(unavailable.accountingSnapshot("session-provider-test").callsUsed, 0);
  assert.deepEqual(unavailable.auditSnapshot("session-provider-test").calls, []);
  assert.deepEqual(unavailable.auditSnapshot("session-provider-test").resolutions, [{
    seq: 1,
    purpose: "conversation",
    profileId: "test/missing",
    transport: "fallback",
    usedFallback: true,
    fallbackReason: "missing_credentials",
    callSeqs: [],
  }]);

  const budgeted = new ProviderService({
    profileId: "test/budget",
    textGen: new FakeTextGen([{ text: validConversation }]),
    fallback: new RuleFallbackNpcAdapter(),
    maxCallsPerSession: 1,
  });
  const first = await budgeted.proposeConversationTurn(conversationRequest());
  const second = await budgeted.proposeConversationTurn(conversationRequest());
  assert.equal(first.meta.transport, "live");
  assert.equal(second.meta.fallbackReason, "budget_exhausted");
  assert.equal(budgeted.accountingSnapshot("session-provider-test").callsUsed, 1);

  const repairCeilingTextGen = new FakeTextGen([
    { text: "not json", usage: { inputTokens: 5, outputTokens: 1, totalTokens: 6 } },
    {
      text: JSON.stringify({
        toolCall: { tool: "talk_to", args: { actorId: "NPC_Store_Manager" } },
        utterance: "지금 확인한 내용을 서로 맞춰 보겠습니다.",
        rationale: "곁에 있는 주민과 직접 말합니다.",
        done: true,
      }),
    },
  ]);
  const repairCeiling = new ProviderService({
    profileId: "test/ambient-repair-ceiling",
    textGen: repairCeilingTextGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const stoppedBeforeRepair = await repairCeiling.proposeNextStep({
    sessionId: "run-ambient-repair-ceiling",
    locale: "ko-KR",
    iteration: 0,
    goal: "곁에 있는 주민과 직접 말한다.",
    observePacket: observePacket(),
    blockedSignatures: [],
    requiredToolCall: { tool: "talk_to", actorId: "NPC_Store_Manager" },
    requireUtterance: true,
    budgetCeiling: { maxCalls: 1, maxTokens: 50_000 },
  });
  assert.equal(stoppedBeforeRepair.meta.fallbackReason, "budget_exhausted");
  assert.equal(repairCeilingTextGen.requests.length, 1, "repair cannot enter the reserved call slot");
  assert.equal(
    repairCeiling.accountingSnapshot("run-ambient-repair-ceiling").callsUsed,
    1,
  );

  const tokenCeilingTextGen = new FakeTextGen([{ text: validConversation }]);
  const tokenCeiling = new ProviderService({
    profileId: "test/ambient-token-ceiling",
    textGen: tokenCeilingTextGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const stoppedBeforeSpend = await tokenCeiling.proposeNextStep({
    sessionId: "run-ambient-token-ceiling",
    locale: "ko-KR",
    iteration: 0,
    goal: "곁에 있는 주민과 직접 말한다.",
    observePacket: observePacket(),
    blockedSignatures: [],
    requiredToolCall: { tool: "talk_to", actorId: "NPC_Store_Manager" },
    requireUtterance: true,
    budgetCeiling: { maxCalls: 100, maxTokens: 1 },
  });
  assert.equal(stoppedBeforeSpend.meta.fallbackReason, "budget_exhausted");
  assert.equal(tokenCeilingTextGen.requests.length, 0);
  assert.equal(tokenCeiling.accountingSnapshot("run-ambient-token-ceiling").callsUsed, 0);
});

test("provider timeout falls back without blocking the session", async () => {
  const never: TextGenPort = {
    adapterId: "never",
    preflight: async () => ({ available: true }),
    generate: async () => await new Promise<TextGenResult>(() => {}),
  };
  const service = new ProviderService({
    profileId: "test/timeout",
    textGen: never,
    fallback: new RuleFallbackNpcAdapter(),
    timeoutMs: 5,
  });
  const result = await service.proposeConversationTurn(conversationRequest());
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.fallbackReason, "timeout");
  assert.equal(service.accountingSnapshot("session-provider-test").callsUsed, 1);
  const audit = service.auditSnapshot("session-provider-test");
  assert.equal(audit.calls[0]?.outcome, "error");
  assert.equal(audit.calls[0]?.failureReason, "timeout");
  assert.deepEqual(audit.resolutions[0]?.callSeqs, [1]);
  assert.equal(audit.resolutions[0]?.fallbackReason, "timeout");
});

test("provider audit retains an early fallback followed by a live resolution", async () => {
  let available = false;
  const requests: TextGenRequest[] = [];
  const textGen: TextGenPort = {
    adapterId: "fallback-then-live",
    preflight: async () => available
      ? { available: true }
      : { available: false, reason: "missing_credentials" },
    generate: async request => {
      requests.push(request);
      return {
        text: validConversation,
        usage: { inputTokens: 11, outputTokens: 7, totalTokens: 18 },
      };
    },
  };
  const service = new ProviderService({
    profileId: "test/fallback-then-live",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const fallback = await service.proposeConversationTurn(conversationRequest());
  available = true;
  const live = await service.proposeConversationTurn(conversationRequest());

  assert.equal(fallback.meta.transport, "fallback");
  assert.equal(live.meta.transport, "live");
  assert.equal(requests.length, 1);
  const audit = service.auditSnapshot("session-provider-test");
  assert.equal(audit.callsUsed, 1);
  assert.equal(audit.tokensUsed, 18);
  assert.deepEqual(audit.resolutions.map(resolution => ({
    transport: resolution.transport,
    fallbackReason: resolution.fallbackReason,
    callSeqs: resolution.callSeqs,
  })), [
    { transport: "fallback", fallbackReason: "missing_credentials", callSeqs: [] },
    { transport: "live", fallbackReason: null, callSeqs: [1] },
  ]);
});

test("provider audit isolates run scopes and starts a new scope empty", async () => {
  const service = new ProviderService({
    profileId: "test/scope-isolation",
    textGen: new FakeTextGen([
      { text: validConversation, usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 } },
    ]),
    fallback: new RuleFallbackNpcAdapter(),
  });
  await service.proposeConversationTurn({
    ...conversationRequest(),
    sessionId: "run-scope-a",
  });

  assert.equal(service.auditSnapshot("run-scope-a").callsUsed, 1);
  assert.deepEqual(service.auditSnapshot("run-scope-b"), {
    callsUsed: 0,
    tokensUsed: 0,
    inFlightCalls: 0,
    inFlightTokens: 0,
    complete: true,
    truncated: false,
    droppedCount: 0,
    calls: [],
    resolutions: [],
  });
});

test("provider audit retains a live transport error before deterministic fallback", async () => {
  const service = new ProviderService({
    profileId: "test/transport-error",
    textGen: new FakeTextGen([new Error("connection reset")]),
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.proposeConversationTurn(conversationRequest());

  assert.equal(result.meta.fallbackReason, "transport_error");
  const audit = service.auditSnapshot("session-provider-test");
  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0]?.outcome, "error");
  assert.equal(audit.calls[0]?.failureReason, "transport_error");
  assert.equal(audit.calls[0]?.chargedTokens, audit.tokensUsed);
  assert.deepEqual(audit.resolutions[0]?.callSeqs, [1]);
  assert.equal(audit.resolutions[0]?.fallbackReason, "transport_error");
});

test("provider audit wire schema rejects accounting and completeness drift", () => {
  const valid = {
    callsUsed: 1,
    tokensUsed: 5,
    inFlightCalls: 0,
    inFlightTokens: 0,
    complete: true,
    truncated: false,
    droppedCount: 0,
    calls: [{
      seq: 1,
      purpose: "conversation" as const,
      profileId: "test/schema",
      transport: "live" as const,
      usedFallback: false as const,
      outcome: "success" as const,
      failureReason: null,
      chargedTokens: 5,
    }],
    resolutions: [{
      seq: 1,
      purpose: "conversation" as const,
      profileId: "test/schema",
      transport: "live" as const,
      usedFallback: false,
      fallbackReason: null,
      callSeqs: [1],
    }],
  };
  providerAuditSnapshotSchema.parse(valid);
  assert.equal(providerAuditSnapshotSchema.safeParse({ ...valid, tokensUsed: 4 }).success, false);
  assert.equal(providerAuditSnapshotSchema.safeParse({ ...valid, complete: false }).success, false);
  assert.equal(providerAuditSnapshotSchema.safeParse({
    ...valid,
    resolutions: [{ ...valid.resolutions[0], callSeqs: [2] }],
  }).success, false);
  assert.equal(providerAuditSnapshotSchema.safeParse({
    ...valid,
    resolutions: [{ ...valid.resolutions[0], callSeqs: [] }],
  }).success, false, "live resolutions require a transport call");
  assert.equal(providerAuditSnapshotSchema.safeParse({
    ...valid,
    calls: [{ ...valid.calls[0], purpose: "agent_step" }],
  }).success, false, "the first transport purpose must match the resolution");

  const repaired = {
    ...valid,
    callsUsed: 2,
    tokensUsed: 8,
    calls: [
      valid.calls[0],
      { ...valid.calls[0], seq: 2, purpose: "repair" as const, chargedTokens: 3 },
    ],
    resolutions: [{ ...valid.resolutions[0], callSeqs: [1, 2] }],
  };
  providerAuditSnapshotSchema.parse(repaired);
  assert.equal(providerAuditSnapshotSchema.safeParse({
    ...repaired,
    calls: [repaired.calls[0], { ...repaired.calls[1], purpose: "conversation" }],
  }).success, false, "only repair calls may follow the first call");
  assert.equal(providerAuditSnapshotSchema.safeParse({
    ...repaired,
    resolutions: [{ ...repaired.resolutions[0], callSeqs: [2, 1] }],
  }).success, false, "resolution call order is monotonic");
});

test("runtime proposal metadata cannot disguise live or scripted work as fallback", () => {
  const base = {
    complete: true,
    truncated: false,
    droppedCount: 0,
    entries: [{
      seq: 1,
      meta: {
        profileId: "test/runtime-meta",
        transport: "live" as const,
        usedFallback: false,
      },
    }],
  };
  providerRuntimeTraceSchema.parse(base);
  assert.equal(providerRuntimeTraceSchema.safeParse({
    ...base,
    entries: [{
      ...base.entries[0],
      meta: { ...base.entries[0].meta, fallbackReason: "timeout" },
    }],
  }).success, false);
  assert.equal(providerRuntimeTraceSchema.safeParse({
    ...base,
    entries: [{
      ...base.entries[0],
      meta: {
        ...base.entries[0].meta,
        transport: "scripted",
        fallbackReason: "invalid_envelope",
      },
    }],
  }).success, false);
});

test("provider audit exposes in-flight accounting without pretending to be complete", async () => {
  let resolveGeneration: ((result: TextGenResult) => void) | undefined;
  let markEntered: (() => void) | undefined;
  const entered = new Promise<void>(resolve => {
    markEntered = resolve;
  });
  const textGen: TextGenPort = {
    adapterId: "audit-in-flight",
    preflight: async () => ({ available: true }),
    generate: async () => {
      markEntered?.();
      return await new Promise<TextGenResult>(resolve => {
        resolveGeneration = resolve;
      });
    },
  };
  const service = new ProviderService({
    profileId: "test/audit-in-flight",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const pending = service.proposeConversationTurn(conversationRequest());
  await entered;

  const inFlight = service.auditSnapshot("session-provider-test");
  assert.equal(inFlight.callsUsed, 1);
  assert.equal(inFlight.inFlightCalls, 1);
  assert.ok(inFlight.inFlightTokens > 0);
  assert.equal(inFlight.tokensUsed, inFlight.inFlightTokens);
  assert.equal(inFlight.complete, false);
  assert.deepEqual(inFlight.calls, []);
  assert.deepEqual(inFlight.resolutions, []);

  assert.ok(resolveGeneration);
  resolveGeneration({
    text: validConversation,
    usage: { inputTokens: 4, outputTokens: 6, totalTokens: 10 },
  });
  await pending;
  const completed = service.auditSnapshot("session-provider-test");
  assert.equal(completed.complete, true);
  assert.equal(completed.inFlightCalls, 0);
  assert.equal(completed.inFlightTokens, 0);
  assert.equal(completed.tokensUsed, 10);
});

test("concurrent provider operations keep invocation-local call sequences", async () => {
  let enteredCount = 0;
  let resolveBothEntered: (() => void) | undefined;
  const bothEntered = new Promise<void>(resolve => {
    resolveBothEntered = resolve;
  });
  let resolveConversation: ((result: TextGenResult) => void) | undefined;
  let resolveAgent: ((result: TextGenResult) => void) | undefined;
  const textGen: TextGenPort = {
    adapterId: "audit-concurrent",
    preflight: async () => ({ available: true }),
    generate: async request => {
      enteredCount += 1;
      if (enteredCount === 2) resolveBothEntered?.();
      return await new Promise<TextGenResult>(resolve => {
        if (request.purpose === "conversation") resolveConversation = resolve;
        else if (request.purpose === "agent_step") resolveAgent = resolve;
        else throw new Error(`unexpected concurrent purpose: ${request.purpose}`);
      });
    },
  };
  const service = new ProviderService({
    profileId: "test/audit-concurrent",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const conversation = service.proposeConversationTurn({
    ...conversationRequest(),
    sessionId: "run-concurrent",
  });
  const agent = service.proposeNextStep({
    sessionId: "run-concurrent",
    locale: "ko-KR",
    iteration: 0,
    goal: "주변 상황을 확인한다.",
    observePacket: observePacket(),
    blockedSignatures: [],
  });
  await bothEntered;

  assert.ok(resolveAgent);
  resolveAgent({
    text: JSON.stringify({
      toolCall: null,
      utterance: null,
      rationale: "상황 확인을 마칩니다.",
      done: true,
    }),
    usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
  });
  await agent;
  assert.ok(resolveConversation);
  resolveConversation({
    text: validConversation,
    usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
  });
  await conversation;

  const audit = service.auditSnapshot("run-concurrent");
  assert.deepEqual(audit.calls.map(call => [call.seq, call.purpose]), [
    [1, "conversation"],
    [2, "agent_step"],
  ]);
  const byPurpose = new Map(audit.resolutions.map(resolution => [
    resolution.purpose,
    resolution.callSeqs,
  ]));
  assert.deepEqual(byPurpose.get("conversation"), [1]);
  assert.deepEqual(byPurpose.get("agent_step"), [2]);
});

test("provider audit marks resolution truncation explicitly", async () => {
  const service = new ProviderService({
    profileId: "test/audit-truncation",
    textGen: new FakeTextGen([], false),
    fallback: new RuleFallbackNpcAdapter(),
  });
  const request = { ...conversationRequest(), sessionId: "run-truncated-audit" };
  for (let index = 0; index < 257; index += 1) {
    await service.proposeConversationTurn(request);
  }
  const audit = service.auditSnapshot(request.sessionId);
  assert.equal(audit.callsUsed, 0);
  assert.equal(audit.resolutions.length, 256);
  assert.equal(audit.droppedCount, 1);
  assert.equal(audit.truncated, true);
  assert.equal(audit.complete, false);
  providerAuditSnapshotSchema.parse(audit);
});

test("production registry contains no scripted profile", () => {
  const config = loadProviderConfig();
  assert.equal(config.selection.default, "openai/gpt-5.4-mini");
  assert.equal(Object.keys(config.profiles).some(profile => profile.startsWith("scripted/")), false);
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.model, "Qwen-Ambassador/Qwen3.7-Plus");
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.params.enableThinking, false);
  assert.ok(
    (config.profiles["modelscope/qwen3.7-plus"]?.params.maxTokens ?? 0) >= 1_200,
    "the Qwen profile needs room for the exact-six hearing envelope",
  );
});

test("OpenAI-compatible profiles require their configured base URL and local may be keyless", async () => {
  const missingBase = createProviderFromEnvironment({
    NPC_PROVIDER_PROFILE: "local/openai-compatible",
  });
  assert.deepEqual(await missingBase.proposalPort.preflight(), {
    available: false,
    reason: "unavailable",
  });

  const local = createProviderFromEnvironment({
    NPC_PROVIDER_PROFILE: "local/openai-compatible",
    LOCAL_LLM_BASE_URL: "http://127.0.0.1:11434/v1",
  });
  assert.deepEqual(await local.proposalPort.preflight(), { available: true });
});

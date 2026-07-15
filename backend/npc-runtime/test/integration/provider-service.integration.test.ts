import assert from "node:assert/strict";
import { test } from "bun:test";
import { assembleObservePacket, DEFAULT_ROLE_POLICIES } from "../../src/agentloop/context.js";
import { fallbackContent } from "../../src/localization/fallback-content.js";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import {
  ambientReplyJudgmentJsonSchema,
  ambientReplyJudgmentJsonSchemaForTarget,
  ambientReplyJudgmentSchemaForLocale,
  ambientReplyJudgmentSchemaForRequest,
  agentStepProposalJsonSchema,
  agentStepProposalJsonSchemaForTools,
  agentStepProposalSchemaForLocale,
  agentStepProposalSchemaForRequest,
  conversationJudgmentSchemaForLocale,
  conversationProposalSchemaForLocale,
  hearingJudgmentJsonSchema,
  hearingJudgmentSchemaForLocale,
  hearingJudgmentSchemaForRequest,
  TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
} from "../../src/providers/envelope.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import {
  createProviderFromConfig,
  createProviderFromEnvironment,
  loadProviderConfig,
} from "../../src/providers/registry.js";
import { ProviderService } from "../../src/providers/service.js";
import { ProviderBudgetReservedError } from "../../src/providers/ports.js";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import { validateHearingJudgment } from "../../src/runtime/run-hearing.js";
import {
  providerAuditSnapshotSchema,
  providerRuntimeTraceSchema,
  runSessionAnswerRequestSchema,
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

function requestScopedPacket() {
  const packet = observePacket();
  packet.visibleObjects = [{ objectId: "Prop_Visible", label: "보이는 물건", state: "idle" }];
  packet.visibleActors = ["NPC_Store_Manager", "NPC_Visible_Silent"];
  packet.audibleActorIds = ["NPC_Store_Manager"];
  packet.reachableAnchorRefs = ["Park.allowed_anchor"];
  packet.playerContact = null;
  return packet;
}

function m3rAdministrativePacket() {
  const packet = requestScopedPacket();
  packet.administrativeSources = [{
    memoryId: "mem-visible-source",
    kind: "player_conversation",
    originActorId: "player",
    summary: "방문자가 접수 경위를 설명했습니다.",
    whyLine: "직접 들은 설명입니다.",
    reportDelta: 0,
  }];
  packet.administrativeAuthority = {
    allowedRecordKinds: ["note"],
    writableTextSurfaceIds: ["TS_Visible"],
  };
  packet.visibleRecords = [{
    recordId: "record-visible",
    kind: "note",
    stateBody: "방문 경위를 확인한 기록입니다.",
    recordRevision: 2,
    authorActorId: packet.actorId,
    sourceMemoryId: "mem-prior-source",
    textSurfaceId: "TS_Visible",
  }];
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
  suspicionDelta: 0,
  reportDelta: 0,
  signals: [],
  whyLine: "방문 이유를 분명하게 설명해 새로운 의심이 생기지 않았습니다.",
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
    const hasMeaningfulFirsthandConversation = index < 4;
    const hasLimitedFirsthandConversation = index === 4;
    return {
      actorId,
      role,
      stanceBefore: index < evidencedVouches ? "vouch" as const : "uncertain" as const,
      hasMeaningfulFirsthandConversation,
      memories: hasMeaningfulFirsthandConversation || hasLimitedFirsthandConversation
        ? [{
            memoryId: `mem-hearing-${index + 1}`,
            kind: "player_conversation" as const,
            sourceActorId: "player",
            text: "방문자가 절차를 차분히 설명했습니다.",
            whyLine: "직접 들은 설명이 앞선 정황과 맞았습니다.",
            meaningfulFirsthand: hasMeaningfulFirsthandConversation,
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
      contactBasis: index < 4
        ? "meaningful_firsthand" as const
        : index === 4
          ? "limited_firsthand" as const
          : "never_conversed" as const,
      proposedStance: index < 4 ? "vouch" as const : "uncertain" as const,
      testimonyLine: index === 5
        ? "직접 대화한 적이 없어 보증할 수 없습니다."
        : index === 4
          ? "직접 대화는 짧았고 보증할 만큼 충분하지 않았습니다."
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

function agentStepToolArgsJsonSchema(
  schemaValue: Record<string, unknown>,
  tool: string,
): Array<Record<string, Record<string, unknown>>> {
  const properties = schemaValue.properties as Record<string, Record<string, unknown>>;
  const branches = properties.toolCall.anyOf as Array<Record<string, unknown>>;
  return branches.flatMap(branch => {
    const branchProperties = branch.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (branchProperties?.tool.const !== tool) return [];
    return [
      (branchProperties.args.properties ?? {}) as Record<string, Record<string, unknown>>,
    ];
  });
}

test("agent-step strict schema requires every property in every object branch", () => {
  assertEveryObjectPropertyIsRequired(agentStepProposalJsonSchema);
});

test("required talk_to narrows transport and Zod contracts and repairs an invalid target", async () => {
  const targetActorId = "NPC_Store_Manager";
  const invalidReply = {
    toolCall: { tool: "talk_to", args: { actorId: "player" } },
    utterance: null,
    rationale: "The wrong actor was selected and no utterance was returned.",
    done: false,
  };
  const repairedReply = {
    ...invalidReply,
    toolCall: { tool: "talk_to", args: { actorId: targetActorId } },
    utterance: "관리자에게 확인 내용을 말하겠습니다.",
    done: true,
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalidReply) },
    { text: JSON.stringify(repairedReply) },
  ]);
  const service = new ProviderService({
    profileId: "test/agent-step-repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const packet = observePacket();
  packet.toolCatalog = ["talk_to", "wait"];

  const result = await service.proposeNextStep({
    sessionId: "run-agent-step-repair",
    locale: "ko-KR",
    iteration: 0,
    goal: "지정된 주민에게 확인 내용을 한 번 말한다.",
    observePacket: packet,
    blockedSignatures: [],
    requiredToolCall: { tool: "talk_to", actorId: targetActorId },
    requireUtterance: true,
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.utterance, repairedReply.utterance);
  assert.deepEqual(textGen.requests.map(request => request.purpose), ["agent_step", "repair"]);
  assert.match(textGen.requests[0].instructions, /exactly four top-level keys/);
  assert.match(textGen.requests[0].instructions, /toolCall and utterance must both be non-null/);
  assert.match(textGen.requests[0].instructions, /Never copy an actor, object, record/);
  assert.match(textGen.requests[0].instructions, /Tool argument guide for the currently offered branches/);
  assert.match(textGen.requests[0].instructions, /- talk_to: \{actorId\}/);
  assert.match(
    textGen.requests[0].instructions,
    /Only use actors, objects, records, and tool names present in the observe packet/,
  );
  assert.doesNotMatch(
    textGen.requests[0].instructions,
    /\n- (?:move_to|look|wait|use_object|write_record|read_record|request)(?:\s|:)/,
  );
  assert.match(textGen.requests[1].instructions, /complete replacement JSON value/);

  const firstInput = JSON.parse(textGen.requests[0].input);
  assert.equal(firstInput.observe.resident.actorId, packet.actorId);
  assert.deepEqual(firstInput.observe.visibleActorIds, packet.visibleActors);
  assert.deepEqual(firstInput.observe.audibleActorIds, packet.audibleActorIds);
  assert.equal("visibleObjects" in firstInput.observe, false);
  assert.equal("visibleRecords" in firstInput.observe, false);
  assert.equal("administrativeSources" in firstInput.observe, false);

  const repairInput = JSON.parse(textGen.requests[1].input) as {
    validationIssues: Array<{ path: string; message: string }>;
  };
  assert.deepEqual(repairInput.validationIssues, [
    {
      path: "toolCall.args.actorId",
      message: `required talk_to actorId must equal ${targetActorId}`,
    },
    {
      path: "done",
      message: "required talk_to reply must finish with done=true",
    },
    {
      path: "utterance",
      message: "required utterance must be nonempty",
    },
  ]);

  const schema = textGen.requests[0].jsonSchema as {
    properties: {
      toolCall: {
        anyOf: Array<{
          type: string;
          properties?: {
            tool: { const: string };
            args: { properties: { actorId?: { const?: string } } };
          };
        }>;
      };
    };
  };
  assertEveryObjectPropertyIsRequired(schema);
  assert.deepEqual(
    Object.keys((textGen.requests[0].jsonSchema as { properties: Record<string, unknown> }).properties),
    ["toolCall", "utterance", "rationale", "done"],
  );
  assert.deepEqual(
    schema.properties.toolCall.anyOf.map(branch =>
      branch.type === "null" ? null : branch.properties?.tool.const
    ),
    ["talk_to"],
  );
  const talkToBranch = schema.properties.toolCall.anyOf.find(
    branch => branch.properties?.tool.const === "talk_to",
  );
  assert.equal(talkToBranch?.properties?.args.properties.actorId?.const, targetActorId);
  const utteranceSchema = (
    textGen.requests[0].jsonSchema as { properties: { utterance: Record<string, unknown> } }
  ).properties.utterance;
  assert.equal(utteranceSchema.type, "string");
  assert.equal(utteranceSchema.minLength, 1);
  assert.match(String(utteranceSchema.description), /Never include an internal stable id/);
  assert.match(String(utteranceSchema.description), /Hangul-dominant natural Korean/);
  const doneSchema = (
    textGen.requests[0].jsonSchema as { properties: { done: Record<string, unknown> } }
  ).properties.done;
  assert.deepEqual(doneSchema, { type: "boolean", const: true });

  const requestSchema = agentStepProposalSchemaForRequest("ko-KR", {
    effectiveTools: ["talk_to"],
    observePacket: packet,
    recordContracts: {},
    requiredToolCall: { tool: "talk_to", actorId: targetActorId },
    requireUtterance: true,
  });
  for (const invalid of [
    { ...repairedReply, toolCall: null },
    { ...repairedReply, toolCall: { tool: "talk_to", args: { actorId: "player" } } },
    { ...repairedReply, utterance: null },
    { ...repairedReply, utterance: "   " },
    { ...repairedReply, done: false },
  ]) {
    assert.equal(requestSchema.safeParse(invalid).success, false);
  }
  assert.equal(requestSchema.safeParse(repairedReply).success, true);

  const catalogSchema = agentStepProposalJsonSchemaForTools({
    effectiveTools: ["look", "wait"],
    observePacket: packet,
    recordContracts: {},
  }) as typeof schema;
  assert.deepEqual(
    catalogSchema.properties.toolCall.anyOf.map(branch =>
      branch.type === "null" ? null : branch.properties?.tool.const
    ),
    [null, "look", "wait"],
  );

  const audit = service.auditSnapshot("run-agent-step-repair");
  assert.deepEqual(audit.resolutions.map(resolution => ({
    purpose: resolution.purpose,
    transport: resolution.transport,
    fallbackReason: resolution.fallbackReason,
    callSeqs: resolution.callSeqs,
  })), [{
    purpose: "agent_step",
    transport: "live",
    fallbackReason: null,
    callSeqs: [1, 2],
  }]);
});

test("Korean agent-step repair rewrites a lowercase Latin utterance instead of falling back", async () => {
  const targetActorId = "NPC_Store_Manager";
  const invalidReply = {
    toolCall: { tool: "talk_to", args: { actorId: targetActorId } },
    utterance: "studio에서 확인한 내용을 전하겠습니다.",
    rationale: "확인한 내용을 관리자에게 전달합니다.",
    done: true,
  };
  const repairedReply = {
    ...invalidReply,
    utterance: "스튜디오에서 확인한 내용을 전하겠습니다.",
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalidReply) },
    { text: JSON.stringify(repairedReply) },
  ]);
  const service = new ProviderService({
    profileId: "test/agent-step-korean-utterance-repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const result = await service.proposeNextStep({
    sessionId: "run-agent-step-korean-utterance-repair",
    locale: "ko-KR",
    iteration: 0,
    goal: "지정된 주민에게 확인 내용을 한 번 말한다.",
    observePacket: observePacket(),
    blockedSignatures: [],
    requiredToolCall: { tool: "talk_to", actorId: targetActorId },
    requireUtterance: true,
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.utterance, repairedReply.utterance);
  assert.deepEqual(textGen.requests.map(request => request.purpose), ["agent_step", "repair"]);
  assert.match(textGen.requests[0].instructions, /Studio as 스튜디오/);
  assert.match(textGen.requests[1].instructions, /rewrite that entire field from scratch/);
  const repairInput = JSON.parse(textGen.requests[1].input) as {
    validationIssues: Array<{
      path: string;
      message: string;
      offendingLatinTokens?: string[];
    }>;
  };
  assert.deepEqual(repairInput.validationIssues, [{
    path: "utterance",
    message:
      "player-visible Korean text may use Latin script only for title-case names or short uppercase acronyms",
    offendingLatinTokens: ["studio"],
  }]);
  const schema = textGen.requests[0].jsonSchema as {
    properties: { utterance: { description?: string } };
  };
  assert.match(schema.properties.utterance.description ?? "", /Hangul-dominant natural Korean/);
});

test("locale-specific agent-step schemas do not contaminate later provider requests", () => {
  const targetActorId = "NPC_Store_Manager";
  const packet = requestScopedPacket();
  packet.visibleActors = [targetActorId];
  packet.audibleActorIds = [targetActorId];
  packet.toolCatalog = ["talk_to"];
  const constraints = {
    effectiveTools: ["talk_to"] as const,
    observePacket: packet,
    recordContracts: {},
    requiredToolCall: { tool: "talk_to" as const, actorId: targetActorId },
    requireUtterance: true,
  };

  const koreanSchema = agentStepProposalJsonSchemaForTools(constraints, "ko-KR");
  const englishSchema = agentStepProposalJsonSchemaForTools(constraints, "en-US");
  const koreanText = JSON.stringify(koreanSchema);
  const englishText = JSON.stringify(englishSchema);
  assert.match(koreanText, /natural modern Korean/);
  assert.doesNotMatch(koreanText, /natural American English/);
  assert.match(englishText, /natural American English/);
  assert.doesNotMatch(englishText, /natural modern Korean/);
});

test("required move_to player narrows transport and Zod contracts without requiring speech", async () => {
  const liveReply = {
    toolCall: { tool: "move_to", args: { targetId: "player" } },
    utterance: null,
    rationale: "확인이 필요한 방문자에게 직접 다가갑니다.",
    done: true,
  };
  const textGen = new FakeTextGen([{ text: JSON.stringify(liveReply) }]);
  const service = new ProviderService({
    profileId: "test/required-player-approach",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const packet = requestScopedPacket();
  packet.toolCatalog = ["move_to", "talk_to", "wait"];
  packet.playerContact = {
    available: true,
    targetActorId: "player",
    interactionZoneId: "StationIntakeConversation",
    playerLocationId: "Station",
    visible: true,
    audible: true,
    reachable: true,
    safeDistanceM: 2.2,
  };
  const requiredToolCall = { tool: "move_to" as const, targetId: "player" as const };

  const result = await service.proposeNextStep({
    sessionId: "run-required-player-approach",
    locale: "ko-KR",
    iteration: 0,
    goal: "대기 중인 심문을 위해 방문자에게 접근한다.",
    observePacket: packet,
    blockedSignatures: [],
    requiredToolCall,
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.deepEqual(result.proposal.toolCall, liveReply.toolCall);
  assert.equal(result.proposal.utterance, undefined);
  assert.equal(textGen.requests.length, 1, "a conforming live-shaped reply needs no repair");
  assert.match(textGen.requests[0].instructions, /only move_to targeting the exact id player/);
  assert.match(textGen.requests[0].instructions, /utterance may be null/);
  assert.doesNotMatch(textGen.requests[0].instructions, /only talk_to targeting/);

  const schema = textGen.requests[0].jsonSchema as {
    properties: {
      toolCall: {
        anyOf: Array<{
          properties?: {
            tool: { const: string };
            args: { properties: { targetId?: { const?: string } } };
          };
        }>;
      };
      utterance: Record<string, unknown>;
      done: Record<string, unknown>;
    };
  };
  assert.deepEqual(
    schema.properties.toolCall.anyOf.map(branch => branch.properties?.tool.const),
    ["move_to"],
  );
  assert.equal(
    schema.properties.toolCall.anyOf[0]?.properties?.args.properties.targetId?.const,
    "player",
  );
  assert.deepEqual(schema.properties.utterance.type, ["string", "null"]);
  assert.match(
    String(schema.properties.utterance.description),
    /Never include an internal stable id/,
  );
  assert.deepEqual(schema.properties.done, { type: "boolean", const: true });

  const requestSchema = agentStepProposalSchemaForRequest("ko-KR", {
    effectiveTools: ["move_to"],
    observePacket: packet,
    recordContracts: {},
    requiredToolCall,
  });
  assert.equal(requestSchema.safeParse(liveReply).success, true);
  for (const invalid of [
    { ...liveReply, toolCall: null },
    { ...liveReply, toolCall: { tool: "move_to", args: { targetId: "Park.allowed_anchor" } } },
    {
      ...liveReply,
      toolCall: { tool: "talk_to", args: { actorId: "NPC_Store_Manager" } },
      utterance: "다른 주민에게 말합니다.",
    },
    { ...liveReply, done: false },
  ]) {
    assert.equal(requestSchema.safeParse(invalid).success, false);
  }
  const spokenMoveSchema = agentStepProposalSchemaForRequest("ko-KR", {
    effectiveTools: ["move_to"],
    observePacket: packet,
    recordContracts: {},
    requiredToolCall,
    requireUtterance: true,
  });
  assert.equal(spokenMoveSchema.safeParse(liveReply).success, false);
  assert.equal(spokenMoveSchema.safeParse({
    ...liveReply,
    utterance: "확인을 위해 직접 다가가겠습니다.",
  }).success, true);
});

test("allowed talk actor scope narrows transport and Zod schemas while omission keeps visible-audible scope", async () => {
  const allowedActorId = "NPC_Office_Worker";
  const otherGroundedActorId = "NPC_Store_Manager";
  const packet = requestScopedPacket();
  packet.visibleActors = [otherGroundedActorId, allowedActorId];
  packet.audibleActorIds = [otherGroundedActorId, allowedActorId];
  packet.toolCatalog = ["talk_to", "wait"];
  const validReply = {
    toolCall: { tool: "talk_to", args: { actorId: allowedActorId } },
    utterance: "지금 확인한 내용을 전해 드리겠습니다.",
    rationale: "이번 요청에서 지정된 주민에게만 말합니다.",
    done: true,
  };
  const textGen = new FakeTextGen([{ text: JSON.stringify(validReply) }]);
  const service = new ProviderService({
    profileId: "test/allowed-talk-target-live",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const result = await service.proposeNextStep({
    sessionId: "run-allowed-talk-target-live",
    locale: "ko-KR",
    iteration: 0,
    goal: "지정된 주민에게만 확인 내용을 전한다.",
    observePacket: packet,
    blockedSignatures: [],
    allowedTalkActorIds: [allowedActorId],
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.toolCall?.tool, "talk_to");
  assert.equal(result.proposal.toolCall?.args.actorId, allowedActorId);
  assert.equal(textGen.requests.length, 1);
  assert.deepEqual(
    agentStepToolArgsJsonSchema(textGen.requests[0]?.jsonSchema ?? {}, "talk_to")[0]
      ?.actorId?.enum,
    [allowedActorId],
  );
  assert.match(textGen.requests[0]?.instructions ?? "", /exact allowed ids/);
  const input = JSON.parse(textGen.requests[0]?.input ?? "{}") as {
    allowedTalkActorIds?: string[] | null;
  };
  assert.deepEqual(input.allowedTalkActorIds, [allowedActorId]);

  const scopedConstraints = {
    effectiveTools: ["talk_to", "wait"] as const,
    observePacket: packet,
    recordContracts: {},
    allowedTalkActorIds: [allowedActorId],
  };
  const scopedZod = agentStepProposalSchemaForRequest("ko-KR", scopedConstraints);
  assert.equal(scopedZod.safeParse(validReply).success, true);
  assert.equal(scopedZod.safeParse({
    ...validReply,
    toolCall: { tool: "talk_to", args: { actorId: otherGroundedActorId } },
  }).success, false);

  const defaultConstraints = {
    effectiveTools: ["talk_to", "wait"] as const,
    observePacket: packet,
    recordContracts: {},
  };
  const defaultJson = agentStepProposalJsonSchemaForTools(defaultConstraints);
  assert.deepEqual(
    agentStepToolArgsJsonSchema(defaultJson, "talk_to")[0]?.actorId?.enum,
    [otherGroundedActorId, allowedActorId],
  );
  const defaultZod = agentStepProposalSchemaForRequest("ko-KR", defaultConstraints);
  assert.equal(defaultZod.safeParse({
    ...validReply,
    toolCall: { tool: "talk_to", args: { actorId: otherGroundedActorId } },
  }).success, true);
});

test("disallowed grounded talk target repairs once then uses deterministic invalid-envelope fallback", async () => {
  const allowedActorId = "NPC_Office_Worker";
  const disallowedActorId = "NPC_Store_Manager";
  const packet = requestScopedPacket();
  packet.visibleActors = [disallowedActorId, allowedActorId];
  packet.audibleActorIds = [disallowedActorId, allowedActorId];
  packet.toolCatalog = ["talk_to", "wait"];
  const invalidReply = {
    toolCall: { tool: "talk_to", args: { actorId: disallowedActorId } },
    utterance: "다른 주민에게 이 내용을 전하겠습니다.",
    rationale: "요청 범위와 다른 주민을 선택했습니다.",
    done: true,
  };
  const invalidOutput = { text: JSON.stringify(invalidReply) };
  const textGen = new FakeTextGen([invalidOutput, invalidOutput]);
  const service = new ProviderService({
    profileId: "test/allowed-talk-target-fallback",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const result = await service.proposeNextStep({
    sessionId: "run-allowed-talk-target-fallback",
    locale: "ko-KR",
    iteration: 0,
    goal: "지정된 주민에게만 확인 내용을 전한다.",
    observePacket: packet,
    blockedSignatures: [],
    allowedTalkActorIds: [allowedActorId],
  });

  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.fallbackReason, "invalid_envelope");
  assert.deepEqual(textGen.requests.map(request => request.purpose), ["agent_step", "repair"]);
  const repairInput = JSON.parse(textGen.requests[1]?.input ?? "{}") as {
    validationIssues: Array<{ path: string; message: string }>;
  };
  assert.deepEqual(repairInput.validationIssues, [{
    path: "toolCall.args.actorId",
    message: `talk_to target ${disallowedActorId} is outside this request's allowed talk scope`,
  }]);
  assert.equal(result.proposal.toolCall?.tool, "talk_to");
  assert.equal(result.proposal.toolCall?.args.actorId, allowedActorId);
  assert.deepEqual(
    agentStepToolArgsJsonSchema(textGen.requests[0]?.jsonSchema ?? {}, "talk_to")[0]
      ?.actorId?.enum,
    [allowedActorId],
  );
  const audit = service.auditSnapshot("run-allowed-talk-target-fallback");
  assert.equal(audit.callsUsed, 2);
  assert.deepEqual(audit.resolutions[0]?.callSeqs, [1, 2]);
});

test("agent-step record contracts select only M3R or legacy schemas and guides", async () => {
  const completedStep = JSON.stringify({
    toolCall: null,
    utterance: null,
    rationale: "현재 목표에 필요한 기록 작업을 마쳤습니다.",
    done: true,
  });
  const textGen = new FakeTextGen([{ text: completedStep }, { text: completedStep }]);
  const service = new ProviderService({
    profileId: "test/record-contracts",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const m3rPacket = observePacket();
  m3rPacket.toolCatalog = ["write_record", "read_record"];
  m3rPacket.administrativeSources = [{
    memoryId: "mem-m3r-source",
    kind: "player_conversation",
    originActorId: "player",
    summary: "방문자가 접수 경위를 설명했습니다.",
    whyLine: "직접 들은 설명입니다.",
    reportDelta: 0,
  }];
  m3rPacket.administrativeAuthority = {
    allowedRecordKinds: ["note"],
    writableTextSurfaceIds: ["TS_Studio_ReviewRecords"],
  };
  m3rPacket.visibleRecords = [{
    recordId: "record-m3r-1",
    kind: "note",
    stateBody: "접수 경위를 확인한 기록입니다.",
    recordRevision: 1,
    authorActorId: m3rPacket.actorId,
    sourceMemoryId: "mem-m3r-source",
    textSurfaceId: "TS_Studio_ReviewRecords",
  }];
  await service.proposeNextStep({
    sessionId: "run-record-contract-m3r",
    locale: "ko-KR",
    iteration: 0,
    goal: "필요한 행정 기록을 확인한다.",
    observePacket: m3rPacket,
    blockedSignatures: [],
  });

  const legacyPacket = observePacket();
  legacyPacket.toolCatalog = ["write_record", "read_record"];
  legacyPacket.administrativeSources = [];
  legacyPacket.administrativeAuthority.writableTextSurfaceIds = [];
  legacyPacket.visibleRecords = [{
    recordId: "record-legacy-1",
    kind: "receipt",
    stateBody: "기존 주문 기록입니다.",
  }];
  await service.proposeNextStep({
    sessionId: "session-record-contract-legacy",
    locale: "ko-KR",
    iteration: 0,
    goal: "기존 기록을 확인한다.",
    observePacket: legacyPacket,
    blockedSignatures: [],
  });

  const recordBranches = (schemaValue: Record<string, unknown>, tool: string) => {
    const properties = schemaValue.properties as Record<string, Record<string, unknown>>;
    const branches = properties.toolCall.anyOf as Array<Record<string, unknown>>;
    return branches.filter(branch => {
      const branchProperties = branch.properties as Record<string, Record<string, unknown>> | undefined;
      return branchProperties?.tool.const === tool;
    }).map(branch => {
      const branchProperties = branch.properties as Record<string, Record<string, unknown>>;
      const args = branchProperties.args;
      return Object.keys(args.properties as Record<string, unknown>).sort();
    });
  };
  const m3rSchema = textGen.requests[0].jsonSchema;
  assert.deepEqual(recordBranches(m3rSchema, "write_record"), [
    [
      "institutionalPressureDelta",
      "openQuestion",
      "recordKind",
      "sourceMemoryId",
      "stateBody",
      "textSurfaceId",
      "whyLine",
    ],
    [
      "institutionalPressureDelta",
      "openQuestion",
      "recordId",
      "recordKind",
      "sourceMemoryId",
      "stateBody",
      "textSurfaceId",
      "whyLine",
    ],
  ]);
  assert.deepEqual(recordBranches(m3rSchema, "read_record"), [[
    "institutionalPressureDelta",
    "openQuestion",
    "recordId",
    "whyLine",
  ]]);
  assert.match(textGen.requests[0].instructions, /write_record \(M3R administrativeAuthority\)/);
  assert.match(textGen.requests[0].instructions, /read_record \(M3R administrativeAuthority\)/);
  assert.doesNotMatch(textGen.requests[0].instructions, /legacy world path/);
  const pressureGuide = /M3R institutionalPressureDelta must be an integer from -25 through 25/g;
  assert.equal(
    textGen.requests[0].instructions.match(pressureGuide)?.length,
    1,
    "one M3R pressure guide covers write and read without duplication",
  );
  assert.match(textGen.requests[0].instructions, /negative lowers institutional pressure/);
  assert.match(textGen.requests[0].instructions, /zero leaves it unchanged/);
  assert.match(textGen.requests[0].instructions, /positive raises it/);
  assert.match(textGen.requests[0].instructions, /Judge both direction and magnitude from the supplied evidence/);
  assert.match(textGen.requests[0].instructions, /no direction is preferred/);
  assert.match(textGen.requests[0].instructions, /One independent non-record source may create positive pressure only once/);

  const m3rToolBranches = (
    (m3rSchema.properties as Record<string, Record<string, unknown>>).toolCall.anyOf
  ) as Array<{
      properties?: {
        tool?: { const?: string };
        args?: { properties?: Record<string, { description?: string }> };
      };
    }>;
  const m3rWriteBranches = m3rToolBranches.filter(
    branch => branch.properties?.tool?.const === "write_record",
  );
  assert.equal(m3rWriteBranches.length, 2);
  for (const branch of m3rWriteBranches) {
    assert.match(
      branch.properties?.args?.properties?.stateBody?.description ?? "",
      /Player-visible natural-language prose/,
    );
    assert.match(
      branch.properties?.args?.properties?.whyLine?.description ?? "",
      /Player-visible natural-language prose/,
    );
  }

  const legacySchema = textGen.requests[1].jsonSchema;
  assert.deepEqual(recordBranches(legacySchema, "write_record"), [[
    "citedLedgerEventId",
    "ledgerKind",
    "objectId",
    "record",
    "toState",
    "whyLine",
  ]]);
  assert.deepEqual(recordBranches(legacySchema, "read_record"), [["recordId"]]);
  assert.match(textGen.requests[1].instructions, /write_record \(legacy world path\)/);
  assert.match(textGen.requests[1].instructions, /read_record \(legacy world path\)/);
  assert.doesNotMatch(textGen.requests[1].instructions, /M3R administrativeAuthority/);
  assert.doesNotMatch(textGen.requests[1].instructions, pressureGuide);

  const stepWith = (toolCall: Record<string, unknown>) => ({
    toolCall,
    utterance: null,
    rationale: "현재 기록 맥락에 맞는 도구 인자입니다.",
    done: true,
  });
  const legacyWrite = {
    tool: "write_record",
    args: {
      objectId: null,
      toState: null,
      ledgerKind: "record_written",
      record: {
        recordId: "record-legacy-new",
        kind: "note",
        targetId: "player",
        stateBody: "방문자 설명을 적었습니다.",
        visibleTo: ["store_clerk"],
      },
      citedLedgerEventId: null,
      whyLine: "기존 기록 절차를 따랐습니다.",
    },
  };
  const m3rWrite = {
    tool: "write_record",
    args: {
      recordKind: "note",
      sourceMemoryId: "mem-m3r-source",
      stateBody: "방문자 설명을 적었습니다.",
      whyLine: "직접 들은 설명을 기록합니다.",
      institutionalPressureDelta: 0,
      textSurfaceId: "TS_Studio_ReviewRecords",
      openQuestion: null,
    },
  };
  const legacyRead = { tool: "read_record", args: { recordId: "record-legacy-1" } };
  const m3rRead = {
    tool: "read_record",
    args: {
      recordId: "record-m3r-1",
      whyLine: "보이는 기록을 처음 확인합니다.",
      institutionalPressureDelta: 0,
      openQuestion: null,
    },
  };
  for (const [tool, matchingCall, wrongCall] of [
    ["write_record", m3rWrite, legacyWrite],
    ["read_record", m3rRead, legacyRead],
  ] as const) {
    const schema = agentStepProposalSchemaForRequest("ko-KR", {
      effectiveTools: [tool],
      observePacket: m3rPacket,
      recordContracts: { [tool]: "m3r" },
    });
    assert.equal(schema.safeParse(stepWith(matchingCall)).success, true);
    assert.equal(schema.safeParse(stepWith(wrongCall)).success, false);
  }
  for (const [tool, matchingCall, wrongCall] of [
    ["write_record", legacyWrite, m3rWrite],
    ["read_record", legacyRead, m3rRead],
  ] as const) {
    const schema = agentStepProposalSchemaForRequest("ko-KR", {
      effectiveTools: [tool],
      observePacket: legacyPacket,
      recordContracts: { [tool]: "legacy" },
    });
    assert.equal(schema.safeParse(stepWith(matchingCall)).success, true);
    assert.equal(schema.safeParse(stepWith(wrongCall)).success, false);
  }
});

test("request-scoped Zod repairs unoffered tools and wrong M3R record args", async () => {
  const completedStep = {
    toolCall: null,
    utterance: null,
    rationale: "현재 목표에서 더 필요한 행동이 없습니다.",
    done: true,
  };
  const invalidUnofferedStep = {
    toolCall: { tool: "look", args: { targetId: "record-hidden" } },
    utterance: null,
    rationale: "제공되지 않은 단서를 보려고 했습니다.",
    done: false,
  };
  const invalidLegacyRead = {
    toolCall: { tool: "read_record", args: { recordId: "record-m3r-repair" } },
    utterance: null,
    rationale: "기록을 확인합니다.",
    done: true,
  };
  const repairedM3rRead = {
    ...invalidLegacyRead,
    toolCall: {
      tool: "read_record",
      args: {
        recordId: "record-m3r-repair",
        whyLine: "보이는 기록의 현재 개정을 처음 확인합니다.",
        institutionalPressureDelta: 0,
        openQuestion: null,
      },
    },
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalidUnofferedStep) },
    { text: JSON.stringify(completedStep) },
    { text: JSON.stringify(invalidLegacyRead) },
    { text: JSON.stringify(repairedM3rRead) },
  ]);
  const service = new ProviderService({
    profileId: "test/request-schema-repairs",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const waitOnlyPacket = observePacket();
  waitOnlyPacket.toolCatalog = ["wait"];
  const unofferedResult = await service.proposeNextStep({
    sessionId: "run-unoffered-tool-repair",
    locale: "ko-KR",
    iteration: 0,
    goal: "현재 맥락에서 가능한 행동만 고른다.",
    observePacket: waitOnlyPacket,
    blockedSignatures: [],
  });
  assert.equal(unofferedResult.meta.transport, "live");
  assert.equal(unofferedResult.proposal.done, true);

  const readOnlyPacket = observePacket();
  readOnlyPacket.toolCatalog = ["read_record"];
  readOnlyPacket.administrativeSources = [];
  readOnlyPacket.administrativeAuthority = {
    allowedRecordKinds: ["note"],
    writableTextSurfaceIds: [],
  };
  readOnlyPacket.visibleRecords = [{
    recordId: "record-m3r-repair",
    kind: "note",
    stateBody: "방문 경위를 확인한 기록입니다.",
    recordRevision: 2,
    authorActorId: "NPC_Studio_Receptionist",
    sourceMemoryId: "mem-m3r-repair",
    textSurfaceId: "TS_Studio_ReviewRecords",
  }];
  const recordResult = await service.proposeNextStep({
    sessionId: "run-m3r-record-repair",
    locale: "ko-KR",
    iteration: 0,
    goal: "보이는 행정 기록의 현재 개정을 확인한다.",
    observePacket: readOnlyPacket,
    blockedSignatures: [],
  });
  assert.equal(recordResult.meta.transport, "live");
  assert.equal(recordResult.proposal.toolCall?.tool, "read_record");
  assert.deepEqual(textGen.requests.map(request => request.purpose), [
    "agent_step",
    "repair",
    "agent_step",
    "repair",
  ]);

  const firstRepair = JSON.parse(textGen.requests[1].input) as {
    validationIssues: Array<{ path: string; message: string }>;
  };
  assert.deepEqual(firstRepair.validationIssues, [{
    path: "toolCall.tool",
    message: "tool look is not offered in this request",
  }]);
  const secondRepair = JSON.parse(textGen.requests[3].input) as {
    validationIssues: Array<{ path: string; message: string }>;
  };
  assert.deepEqual(secondRepair.validationIssues, [{
    path: "toolCall.args",
    message: "read_record args must match the m3r contract",
  }]);
});

test("request-scoped target validation repairs once then falls back for hidden authority", async () => {
  const step = (
    toolCall: { tool: string; args: Record<string, unknown> },
    utterance: string | null = null,
  ) => ({
    toolCall,
    utterance,
    rationale: "현재 관측에 근거해 행동합니다.",
    done: true,
  });
  const cases: Array<{
    name: string;
    tool: string;
    packet: () => ReturnType<typeof observePacket>;
    invalid: ReturnType<typeof step>;
    expectedIssuePath: string;
    assertTransportSchema: (schema: Record<string, unknown>) => void;
  }> = [
    {
      name: "hidden-look",
      tool: "look",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["look", "wait"];
        return packet;
      },
      invalid: step({ tool: "look", args: { targetId: "Prop_Hidden" } }),
      expectedIssuePath: "toolCall.args.targetId",
      assertTransportSchema: schema => {
        const [args] = agentStepToolArgsJsonSchema(schema, "look");
        const allowed = args?.targetId?.enum as string[] | undefined;
        assert.ok(allowed?.includes("NPC_Store_Manager"));
        assert.ok(allowed?.includes("NPC_Visible_Silent"));
        assert.ok(allowed?.includes("Prop_Visible"));
        assert.equal(allowed?.includes("Prop_Hidden"), false);
      },
    },
    {
      name: "unreachable-move",
      tool: "move_to",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["move_to", "wait"];
        return packet;
      },
      invalid: step({ tool: "move_to", args: { targetId: "Park.hidden_anchor" } }),
      expectedIssuePath: "toolCall.args.targetId",
      assertTransportSchema: schema => {
        const [args] = agentStepToolArgsJsonSchema(schema, "move_to");
        assert.deepEqual(args?.targetId?.enum, ["Park.allowed_anchor"]);
      },
    },
    {
      name: "inaudible-talk",
      tool: "talk_to",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["talk_to", "wait"];
        return packet;
      },
      invalid: step(
        { tool: "talk_to", args: { actorId: "NPC_Visible_Silent" } },
        "보이지만 들리지 않는 주민에게 말합니다.",
      ),
      expectedIssuePath: "toolCall.args.actorId",
      assertTransportSchema: schema => {
        const [args] = agentStepToolArgsJsonSchema(schema, "talk_to");
        assert.deepEqual(args?.actorId?.enum, ["NPC_Store_Manager"]);
      },
    },
    {
      name: "hidden-read-record",
      tool: "read_record",
      packet: () => {
        const packet = m3rAdministrativePacket();
        packet.toolCatalog = ["read_record", "wait"];
        return packet;
      },
      invalid: step({
        tool: "read_record",
        args: {
          recordId: "record-hidden",
          whyLine: "숨은 기록을 읽으려 합니다.",
          institutionalPressureDelta: 0,
          openQuestion: null,
        },
      }),
      expectedIssuePath: "toolCall.args.recordId",
      assertTransportSchema: schema => {
        const [args] = agentStepToolArgsJsonSchema(schema, "read_record");
        assert.deepEqual(args?.recordId?.enum, ["record-visible"]);
      },
    },
    {
      name: "unauthorized-write-record",
      tool: "write_record",
      packet: () => {
        const packet = m3rAdministrativePacket();
        packet.toolCatalog = ["write_record", "wait"];
        return packet;
      },
      invalid: step({
        tool: "write_record",
        args: {
          recordKind: "report",
          sourceMemoryId: "mem-hidden-source",
          stateBody: "숨은 정보로 기록을 만듭니다.",
          whyLine: "현재 권한에 없는 기록입니다.",
          institutionalPressureDelta: 0,
          textSurfaceId: "TS_Hidden",
          recordId: "record-hidden",
          openQuestion: null,
        },
      }),
      expectedIssuePath: "toolCall.args.recordKind",
      assertTransportSchema: schema => {
        const branches = agentStepToolArgsJsonSchema(schema, "write_record");
        assert.equal(branches.length, 2);
        for (const args of branches) {
          assert.deepEqual(args.recordKind?.enum, ["note"]);
          assert.deepEqual(args.sourceMemoryId?.enum, ["mem-visible-source"]);
          assert.deepEqual(args.textSurfaceId?.enum, ["TS_Visible"]);
        }
        assert.deepEqual(branches.find(args => args.recordId)?.recordId?.enum, [
          "record-visible",
        ]);
      },
    },
  ];

  for (const candidate of cases) {
    const invalidOutput = { text: JSON.stringify(candidate.invalid) };
    const textGen = new FakeTextGen([invalidOutput, invalidOutput]);
    const service = new ProviderService({
      profileId: `test/request-target-${candidate.name}`,
      textGen,
      fallback: new RuleFallbackNpcAdapter(),
    });
    const packet = candidate.packet();
    const sessionId = `run-request-target-${candidate.name}`;
    const result = await service.proposeNextStep({
      sessionId,
      locale: "ko-KR",
      iteration: 0,
      goal: "현재 관측과 권한 안에서만 행동한다.",
      observePacket: packet,
      blockedSignatures: [],
    });

    assert.equal(result.meta.transport, "fallback", candidate.name);
    assert.equal(result.meta.usedFallback, true, candidate.name);
    assert.equal(result.meta.fallbackReason, "invalid_envelope", candidate.name);
    assert.deepEqual(
      textGen.requests.map(request => request.purpose),
      ["agent_step", "repair"],
      candidate.name,
    );
    const repairInput = JSON.parse(textGen.requests[1]?.input ?? "{}") as {
      validationIssues: Array<{ path: string; message: string }>;
    };
    assert.ok(
      repairInput.validationIssues.some(issue => issue.path === candidate.expectedIssuePath),
      candidate.name,
    );
    candidate.assertTransportSchema(textGen.requests[0]?.jsonSchema ?? {});
    const audit = service.auditSnapshot(sessionId);
    assert.equal(audit.callsUsed, 2, candidate.name);
    assert.equal(audit.resolutions.length, 1, candidate.name);
    assert.equal(audit.resolutions[0]?.callSeqs.length, 2, candidate.name);
    assert.ok((audit.resolutions[0]?.callSeqs.length ?? 0) <= 2, candidate.name);
  }
});

test("request-scoped exact targets remain live and use one physical call", async () => {
  const step = (
    toolCall: { tool: string; args: Record<string, unknown> },
    utterance: string | null = null,
  ) => ({
    toolCall,
    utterance,
    rationale: "현재 관측에 확인된 대상을 선택합니다.",
    done: true,
  });
  const cases: Array<{
    name: string;
    packet: () => ReturnType<typeof observePacket>;
    valid: ReturnType<typeof step>;
  }> = [
    {
      name: "look",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["look", "wait"];
        return packet;
      },
      valid: step({ tool: "look", args: { targetId: "Prop_Visible" } }),
    },
    {
      name: "move-anchor",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["move_to", "wait"];
        return packet;
      },
      valid: step({ tool: "move_to", args: { targetId: "Park.allowed_anchor" } }),
    },
    {
      name: "move-player",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["move_to", "wait"];
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
        return packet;
      },
      valid: step({ tool: "move_to", args: { targetId: "player" } }),
    },
    {
      name: "talk",
      packet: () => {
        const packet = requestScopedPacket();
        packet.toolCatalog = ["talk_to", "wait"];
        return packet;
      },
      valid: step(
        { tool: "talk_to", args: { actorId: "NPC_Store_Manager" } },
        "지금 확인한 사실을 말씀드리겠습니다.",
      ),
    },
    {
      name: "read-record",
      packet: () => {
        const packet = m3rAdministrativePacket();
        packet.toolCatalog = ["read_record", "wait"];
        return packet;
      },
      valid: step({
        tool: "read_record",
        args: {
          recordId: "record-visible",
          whyLine: "보이는 기록의 현재 개정을 확인합니다.",
          institutionalPressureDelta: 0,
          openQuestion: null,
        },
      }),
    },
    {
      name: "write-record",
      packet: () => {
        const packet = m3rAdministrativePacket();
        packet.toolCatalog = ["write_record", "wait"];
        return packet;
      },
      valid: step({
        tool: "write_record",
        args: {
          recordKind: "note",
          sourceMemoryId: "mem-visible-source",
          stateBody: "방문자가 설명한 접수 경위를 기록합니다.",
          whyLine: "직접 들은 설명을 기록합니다.",
          institutionalPressureDelta: 0,
          textSurfaceId: "TS_Visible",
          openQuestion: null,
        },
      }),
    },
    {
      name: "update-owned-record",
      packet: () => {
        const packet = m3rAdministrativePacket();
        packet.toolCatalog = ["write_record", "wait"];
        return packet;
      },
      valid: step({
        tool: "write_record",
        args: {
          recordKind: "note",
          sourceMemoryId: "mem-visible-source",
          stateBody: "기존 기록을 직접 들은 설명으로 갱신합니다.",
          whyLine: "같은 표면의 본인 기록을 갱신합니다.",
          institutionalPressureDelta: 0,
          textSurfaceId: "TS_Visible",
          recordId: "record-visible",
          openQuestion: null,
        },
      }),
    },
  ];

  for (const candidate of cases) {
    const textGen = new FakeTextGen([{ text: JSON.stringify(candidate.valid) }]);
    const service = new ProviderService({
      profileId: `test/request-valid-${candidate.name}`,
      textGen,
      fallback: new RuleFallbackNpcAdapter(),
    });
    const sessionId = `run-request-valid-${candidate.name}`;
    const result = await service.proposeNextStep({
      sessionId,
      locale: "ko-KR",
      iteration: 0,
      goal: "현재 관측과 권한 안에서 행동한다.",
      observePacket: candidate.packet(),
      blockedSignatures: [],
    });

    assert.equal(result.meta.transport, "live", candidate.name);
    assert.equal(result.meta.usedFallback, false, candidate.name);
    assert.deepEqual(result.proposal.toolCall, candidate.valid.toolCall, candidate.name);
    const audit = service.auditSnapshot(sessionId);
    assert.equal(audit.callsUsed, 1, candidate.name);
    assert.deepEqual(audit.resolutions[0]?.callSeqs, [1], candidate.name);
  }
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
  }).success, true, "natural Korean may contain occasional Hanja");
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse({
    ...valid,
    whyLine: "NPC_Store_Manager의 설명을 다시 확인했습니다.",
  }).success, false, "player-visible judgment must not expose an actor id");
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse({
    ...valid,
    utterance: "mem-ambient-1을 읽어 보세요.",
  }).success, false, "player-visible speech must not expose a memory id");
  assert.equal(ambientReplyJudgmentSchemaForLocale("ko-KR").safeParse({
    ...valid,
    utterance: "가".repeat(TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS + 1),
  }).success, false, "transient ambient speech must fit its subtitle lifetime");
  const ambientProperties = ambientReplyJudgmentJsonSchema.properties as Record<
    string,
    Record<string, unknown>
  >;
  assert.equal(
    ambientProperties.utterance.maxLength,
    TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  );
  const agentStepProperties = agentStepProposalJsonSchema.properties as Record<
    string,
    Record<string, unknown>
  >;
  assert.equal(
    agentStepProperties.utterance.maxLength,
    TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS,
  );
  assert.equal(agentStepProposalSchemaForLocale("ko-KR").safeParse({
    toolCall: { tool: "talk_to", args: { actorId: "NPC_Store_Manager" } },
    utterance: "가".repeat(TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS + 1),
    rationale: "짧은 대답을 전합니다.",
    done: true,
  }).success, false, "all free-world NPC speech uses the same transient cap");

  const requestSchema = ambientReplyJudgmentJsonSchemaForTarget("NPC_Store_Manager");
  const requestProperties = requestSchema.properties as Record<string, Record<string, unknown>>;
  const toolCallProperties = requestProperties.toolCall.properties as Record<
    string,
    Record<string, unknown>
  >;
  const argsProperties = toolCallProperties.args.properties as Record<
    string,
    Record<string, unknown>
  >;
  assert.equal(argsProperties.actorId.const, "NPC_Store_Manager");
  assert.equal(
    ambientReplyJudgmentSchemaForRequest("ko-KR", "NPC_Store_Manager").safeParse(valid).success,
    true,
  );
  assert.equal(
    ambientReplyJudgmentSchemaForRequest("ko-KR", "NPC_Store_Manager").safeParse({
      ...valid,
      toolCall: { tool: "talk_to", args: { actorId: "NPC_Office_Worker" } },
    }).success,
    false,
  );
});

test("ambient reply repairs one wrong nonempty target then succeeds or falls back", async () => {
  const request = ambientReplyRequest();
  const valid = JSON.parse(validAmbientReply);
  const wrongTarget = {
    ...valid,
    toolCall: { tool: "talk_to", args: { actorId: "NPC_Office_Worker" } },
  };
  const usage = { inputTokens: 4, outputTokens: 6, totalTokens: 10 };

  const repairedTextGen = new FakeTextGen([
    { text: JSON.stringify(wrongTarget), usage },
    { text: validAmbientReply, usage },
  ]);
  const repairedService = new ProviderService({
    profileId: "test/ambient-target-repair",
    textGen: repairedTextGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const repaired = await repairedService.judgeAndProposeAmbientReply(request);

  assert.equal(repaired.meta.transport, "live");
  assert.equal(repaired.meta.usedFallback, false);
  assert.equal(repaired.proposal.toolCall.args.actorId, request.targetActorId);
  assert.deepEqual(
    repairedTextGen.requests.map(providerRequest => providerRequest.purpose),
    ["ambient_reply", "repair"],
  );
  const firstRequestProperties = repairedTextGen.requests[0]?.jsonSchema.properties as Record<
    string,
    Record<string, unknown>
  >;
  const firstToolCallProperties = firstRequestProperties.toolCall.properties as Record<
    string,
    Record<string, unknown>
  >;
  const firstArgsProperties = firstToolCallProperties.args.properties as Record<
    string,
    Record<string, unknown>
  >;
  assert.equal(firstArgsProperties.actorId.const, request.targetActorId);
  const repairInput = JSON.parse(repairedTextGen.requests[1]?.input ?? "{}") as {
    validationIssues: Array<{ path: string; message: string }>;
  };
  assert.deepEqual(repairInput.validationIssues, [{
    path: "toolCall.args.actorId",
    message: `ambient reply actorId must equal ${request.targetActorId}`,
  }]);
  assert.deepEqual(repairedService.auditSnapshot(request.sessionId).resolutions, [{
    seq: 1,
    purpose: "ambient_reply",
    profileId: "test/ambient-target-repair",
    transport: "live",
    usedFallback: false,
    fallbackReason: null,
    callSeqs: [1, 2],
  }]);

  const fallbackRequest = {
    ...request,
    sessionId: "run-ambient-target-fallback",
  };
  const invalidTextGen = new FakeTextGen([
    { text: JSON.stringify(wrongTarget), usage },
    { text: JSON.stringify(wrongTarget), usage },
  ]);
  const fallbackService = new ProviderService({
    profileId: "test/ambient-target-fallback",
    textGen: invalidTextGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const fallback = await fallbackService.judgeAndProposeAmbientReply(fallbackRequest);

  assert.equal(fallback.meta.transport, "fallback");
  assert.equal(fallback.meta.usedFallback, true);
  assert.equal(fallback.meta.fallbackReason, "invalid_envelope");
  assert.equal(fallback.proposal.toolCall.args.actorId, request.targetActorId);
  assert.deepEqual(
    invalidTextGen.requests.map(providerRequest => providerRequest.purpose),
    ["ambient_reply", "repair"],
  );
  assert.deepEqual(fallbackService.auditSnapshot(fallbackRequest.sessionId).resolutions, [{
    seq: 1,
    purpose: "ambient_reply",
    profileId: "test/ambient-target-fallback",
    transport: "fallback",
    usedFallback: true,
    fallbackReason: "invalid_envelope",
    callSeqs: [1, 2],
  }]);
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
  const missingContactBasis = structuredClone(valid) as Record<string, any>;
  delete missingContactBasis.residentAssessments[0].contactBasis;
  assert.equal(
    hearingJudgmentSchemaForLocale("ko-KR").safeParse(missingContactBasis).success,
    false,
  );
  const retiredTwoStateBasis = structuredClone(valid) as Record<string, any>;
  retiredTwoStateBasis.residentAssessments[5].contactBasis = "no_meaningful_firsthand";
  assert.equal(
    hearingJudgmentSchemaForLocale("ko-KR").safeParse(retiredTwoStateBasis).success,
    false,
  );
});

test("hearing contact basis distinguishes meaningful, limited, and never-conversed memory", () => {
  const request = hearingRequest();
  const valid = validHearingJudgment();
  assert.equal(validateHearingJudgment(request, valid).ok, true);
  assert.deepEqual(
    valid.residentAssessments.map(assessment => assessment.contactBasis),
    [
      "meaningful_firsthand",
      "meaningful_firsthand",
      "meaningful_firsthand",
      "meaningful_firsthand",
      "limited_firsthand",
      "never_conversed",
    ],
  );
  for (const [index, wrongBasis] of [
    [0, "limited_firsthand"],
    [4, "never_conversed"],
    [5, "meaningful_firsthand"],
  ] as const) {
    const mismatch = structuredClone(valid);
    mismatch.residentAssessments[index].contactBasis = wrongBasis;
    const result = validateHearingJudgment(request, mismatch);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /contact basis contradicts/);
  }
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
  assert.equal(
    agentStepProposalSchemaForLocale("ko-KR").safeParse(proposal).success,
    true,
    "natural Korean may contain occasional Hanja",
  );
  assert.equal(
    agentStepProposalSchemaForLocale("en-US").safeParse(proposal).success,
    false,
    "Korean source prose must not pass unchanged in an English run",
  );
  const englishProposal = structuredClone(proposal);
  englishProposal.toolCall.args.stateBody = "The visitor's purpose needs clarification.";
  englishProposal.toolCall.args.whyLine = "The reception note left a question open.";
  englishProposal.toolCall.args.openQuestion = {
    status: "open",
    text: "Why did the visitor come here?",
    whyLine: "The reason for the visit still needs clarification.",
  };
  assert.equal(
    agentStepProposalSchemaForLocale("en-US").safeParse(englishProposal).success,
    true,
  );
  proposal.toolCall.args.openQuestion = {
    status: "open",
    text: "來歷?",
    whyLine: "根據",
  };
  assert.equal(
    agentStepProposalSchemaForLocale("ko-KR").safeParse(proposal).success,
    false,
    "Hanja without Hangul is not Korean prose",
  );
});

test("Korean player-visible fields require Hangul but allow natural mixed content", () => {
  const base = {
    suspicionDelta: 0,
    reportDelta: 0,
    signals: [],
    whyLine: "확인했습니다.",
  };
  const accepted = [
    "Mira가 확인했습니다.",
    "QR 표식을 확인했습니다.",
    "기록 2개를 확인했습니다.",
    "방문자의 來歷을 확인했습니다.",
  ];
  for (const whyLine of accepted) {
    assert.equal(
      conversationJudgmentSchemaForLocale("ko-KR").safeParse({ ...base, whyLine }).success,
      true,
      whyLine,
    );
  }

  const contaminated = "방문자의 持ち物을 확인했습니다.";
  const contaminatedResult = conversationJudgmentSchemaForLocale("ko-KR").safeParse({
    ...base,
    whyLine: contaminated,
  });
  assert.equal(contaminatedResult.success, false);
  if (!contaminatedResult.success) {
    assert.equal(
      contaminatedResult.error.issues[0]?.message,
      "player-visible Korean text must not contain Japanese kana",
    );
  }
  assert.equal(
    conversationJudgmentSchemaForLocale("ja-JP").safeParse({
      ...base,
      whyLine: contaminated,
    }).success,
    true,
    "Japanese player-visible text remains valid in the Japanese locale",
  );

  const chineseClause = "주민이 为何 그렇게 말했는지 확인했습니다.";
  const chineseClauseResult = conversationJudgmentSchemaForLocale("ko-KR").safeParse({
    ...base,
    whyLine: chineseClause,
  });
  assert.equal(chineseClauseResult.success, false);
  if (!chineseClauseResult.success) {
    assert.equal(
      chineseClauseResult.error.issues[0]?.message,
      "player-visible Korean text must not contain Chinese function words or clauses",
    );
  }

  const lowercaseEnglish = "방문자가 목적을 stated하여 의문이 줄었습니다.";
  const lowercaseEnglishResult = conversationJudgmentSchemaForLocale("ko-KR").safeParse({
    ...base,
    whyLine: lowercaseEnglish,
  });
  assert.equal(lowercaseEnglishResult.success, false);
  if (!lowercaseEnglishResult.success) {
    assert.equal(
      lowercaseEnglishResult.error.issues[0]?.message,
      "player-visible Korean text may use Latin script only for title-case names or short uppercase acronyms",
    );
    assert.deepEqual(
      (lowercaseEnglishResult.error.issues[0] as {
        params?: { offendingLatinTokens?: string[] };
      } | undefined)?.params?.offendingLatinTokens,
      ["stated"],
    );
  }

  const rejected = ["Mira checked it.", "來歷確認", "确认来历", "2026", "?!…"];
  for (const whyLine of rejected) {
    const parsed = conversationJudgmentSchemaForLocale("ko-KR").safeParse({
      ...base,
      whyLine,
    });
    assert.equal(parsed.success, false, whyLine);
    if (!parsed.success) {
      assert.equal(
        parsed.error.issues[0]?.message,
        "player-visible Korean text must contain at least one Hangul code point",
      );
      assert.equal(parsed.error.issues[0]?.message.includes(whyLine), false);
    }
    assert.equal(
      conversationJudgmentSchemaForLocale("en-US").safeParse({ ...base, whyLine }).success,
      whyLine === "Mira checked it.",
      `English locale writing-system guard mismatch for ${whyLine}`,
    );
  }
});

test("all gameplay locales reject explicit game and model framing in player-visible prose", () => {
  const base = {
    suspicionDelta: 0,
    reportDelta: 0,
    signals: [],
  };
  const rejected: Array<[string, string]> = [
    ["ko-KR", "플레이어가 평범하게 답했습니다."],
    ["en-US", "The player answered coherently."],
    ["it-IT", "Il giocatore ha risposto con coerenza."],
    ["zh-CN", "玩家的回答前后一致。"],
    ["fr-FR", "Le joueur a répondu de manière cohérente."],
    ["ja-JP", "プレイヤーの回答には一貫性があります。"],
  ];
  for (const [locale, whyLine] of rejected) {
    const parsed = conversationJudgmentSchemaForLocale(locale).safeParse({
      ...base,
      whyLine,
    });
    assert.equal(parsed.success, false, `${locale}: ${whyLine}`);
    if (!parsed.success) {
      assert.ok(parsed.error.issues.some(issue =>
        issue.message ===
          "player-visible text must remain in fiction and must not expose game or model framing"
      ));
    }
  }

  for (const [locale, whyLine] of [
    ["ko-KR", "Player가 평범하게 답했습니다."],
    ["zh-CN", "The player 回答得很连贯。"],
    ["ja-JP", "playerは一貫して答えました。"],
    ["fr-FR", "The user answered coherently."],
  ] as const) {
    assert.equal(
      conversationJudgmentSchemaForLocale(locale).safeParse({ ...base, whyLine }).success,
      false,
      `${locale} must reject cross-language meta framing: ${whyLine}`,
    );
  }

  assert.equal(
    conversationJudgmentSchemaForLocale("en-US").safeParse({
      ...base,
      whyLine: "The visitor answered coherently.",
    }).success,
    true,
  );
  for (const [locale, whyLine] of [
    ["fr-FR", "J'ai répondu de manière cohérente."],
    ["fr-FR", "Cette procédure peut user la patience du visiteur."],
    ["it-IT", "Ho parlato ai presenti con calma."],
  ] as const) {
    assert.equal(
      conversationJudgmentSchemaForLocale(locale).safeParse({ ...base, whyLine }).success,
      true,
      `${locale} must not confuse ordinary local grammar with model framing`,
    );
  }
  for (const locale of ["ko-KR", "en-US", "it-IT", "zh-CN", "fr-FR", "ja-JP"] as const) {
    const whyLine = locale === "ko-KR"
      ? "AI가 답변을 생성했습니다."
      : locale === "zh-CN"
        ? "AI生成了这段回答。"
        : locale === "ja-JP"
          ? "AIが回答を生成しました。"
          : "AI generated this answer.";
    assert.equal(
      conversationJudgmentSchemaForLocale(locale).safeParse({ ...base, whyLine }).success,
      false,
      `${locale} must reject the uppercase AI acronym`,
    );
  }
});

test("stable-id validation preserves ordinary English compounds", () => {
  const base = {
    suspicionDelta: 0,
    reportDelta: 0,
    signals: [],
  };
  const accepted = [
    "Record-keeping is a run-of-the-mill duty.",
    "This is event-related, turn-based, contact-free, and session-long work.",
  ];
  for (const whyLine of accepted) {
    assert.equal(
      conversationJudgmentSchemaForLocale("en-US").safeParse({ ...base, whyLine }).success,
      true,
      whyLine,
    );
  }

  const rejected = [
    "sess-fixture-1",
    "rec-1",
    "goal:wake-abc-1",
    "hearing:hearing-fixture-1#0",
  ];
  for (const whyLine of rejected) {
    assert.equal(
      conversationJudgmentSchemaForLocale("en-US").safeParse({ ...base, whyLine }).success,
      false,
      whyLine,
    );
  }
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
  assert.match(textGen.requests[0].instructions, /Missing context means unknown, never absent/);
  assert.match(
    textGen.requests[0].instructions,
    /Suggested player replies are different: they are uncommitted possible utterances/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /risky\/weird may offer a bolder unsupported cover claim or lie/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /public role may ground generic job topics and ordinary capabilities/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /does not establish that this visitor has an appointment/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /must not claim a specific record or item exists, was checked, is missing, is required/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /silently perform this grounding check/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /but not a concrete appointment, reference number, notice, dossier, paperwork, visitor record/,
  );
  assert.match(
    JSON.stringify(textGen.requests[0].jsonSchema),
    /natural modern Korean/,
  );
  assert.match(
    JSON.stringify(textGen.requests[0].jsonSchema),
    /uncommitted candidate utterance/,
  );
  assert.match(
    JSON.stringify(textGen.requests[0].jsonSchema),
    /safe\/local is the least exposing plausible answer/,
  );
  const duplicateIntentProposal = JSON.parse(validConversation);
  duplicateIntentProposal.suggestedReplies[1].intent = "safe/local";
  assert.equal(
    conversationProposalSchemaForLocale("ko-KR").safeParse(duplicateIntentProposal).success,
    false,
    "a provider must return exactly one candidate in each social-risk lane",
  );
  const providerInput = JSON.parse(textGen.requests[0].input);
  assert.equal(
    providerInput.conversationFrame.residentSpeaker.actorId,
    conversationRequest().observePacket.actorId,
  );
  assert.equal(providerInput.conversationFrame.playerInterlocutor.actorId, "player");
  assert.equal("visibleObjects" in providerInput.residentContext, false);
  assert.equal("visibleRecords" in providerInput.residentContext, false);
  assert.equal("administrativeAuthority" in providerInput.residentContext, false);
  assert.deepEqual(
    providerInput.groundingContract.visibleObjectFacts,
    conversationRequest().observePacket.visibleObjects.map(object => ({
      label: object.label,
      state: object.state,
    })),
  );
  assert.ok(
    providerInput.groundingContract.validityRules.some((rule: string) =>
      rule.includes("Only the one the player selects or types")
    ),
  );
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

test("conversation openings keep resident, player, third-party speech, and locations structurally separate", async () => {
  const request = conversationRequest();
  request.actorId = "NPC_Roaming_Liaison";
  request.observePacket.actorId = request.actorId;
  request.observePacket.role = "roaming_liaison";
  request.observePacket.landmarkId = "Park";
  request.observePacket.actorPolicy = DEFAULT_ROLE_POLICIES.roaming_liaison;
  request.observePacket.actorMemory = {
    actorId: request.actorId,
    ownActionNotes: [
      "[heard_from=NPC_Station_Officer] 외부인은 스테이션에서 확인해야 합니다.",
      "[self_utterance] 그 방문자는 공원에서 기다리고 있었습니다.",
      "[player_utterance] 청문회 때문에 왔습니다. / [self_reply] 이유를 알겠습니다. / [judgment_reason] 직접 설명했습니다.",
    ],
    observedLedgerEventIds: [],
  };
  request.observePacket.visibleActors = ["NPC_Station_Officer"];
  request.observePacket.audibleActorIds = ["NPC_Station_Officer"];
  request.observePacket.playerContact = null;
  request.observePacket.heardSpeech = [
    "NPC_Station_Officer: 외부인은 스테이션에서 확인해야 합니다.",
    "방문 이유: 청문회 때문입니다.",
  ];

  const textGen = new FakeTextGen([{ text: validConversation }]);
  const service = new ProviderService({
    profileId: "test/conversation-role-separation",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  await service.proposeConversationTurn(request);

  const transport = textGen.requests[0];
  assert.ok(transport);
  const input = JSON.parse(transport.input);
  assert.deepEqual(input.conversationFrame, {
    phase: "opening",
    residentSpeaker: {
      actorId: "NPC_Roaming_Liaison",
      role: "roaming_liaison",
      locationId: "Park",
    },
    playerInterlocutor: {
      actorId: "player",
      role: "player",
      locationId: null,
      locationBasis: "not_supplied_for_opening",
    },
    thirdPartyActorIds: ["NPC_Station_Officer"],
  });
  assert.equal("actor" in input, false, "the old ambiguous actor projection must stay absent");
  assert.deepEqual(input.residentContext.memoryEvidence, [
    {
      evidenceType: "heard_third_party_npc",
      speakerActorId: "NPC_Station_Officer",
      note: "외부인은 스테이션에서 확인해야 합니다.",
    },
    {
      evidenceType: "resident_prior_utterance",
      speakerActorId: "NPC_Roaming_Liaison",
      note: "그 방문자는 공원에서 기다리고 있었습니다.",
    },
    {
      evidenceType: "player_conversation_exchange",
      playerSpeakerActorId: "player",
      residentSpeakerActorId: "NPC_Roaming_Liaison",
      playerLine: "청문회 때문에 왔습니다.",
      residentReply: "이유를 알겠습니다.",
      judgmentReason: "직접 설명했습니다.",
    },
  ]);
  assert.deepEqual(input.groundingContract.attributedHeardSpeech, [
    {
      sourceType: "third_party_npc",
      speakerActorId: "NPC_Station_Officer",
      line: "외부인은 스테이션에서 확인해야 합니다.",
    },
    {
      sourceType: "player",
      speakerActorId: "player",
      line: "방문 이유: 청문회 때문입니다.",
    },
  ]);
  assert.match(transport.instructions, /playerInterlocutor is always the person being addressed/);
  assert.match(transport.instructions, /residentSpeaker\.locationId belongs only to the resident/);
  assert.match(transport.instructions, /never replay either as if it were the resident's new opening line/);
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
  assert.match(
    textGen.requests[0]?.instructions ?? "",
    new RegExp(`no longer than ${TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS} Unicode code points`),
  );
  const input = JSON.parse(textGen.requests[0]?.input ?? "{}");
  assert.equal(input.sourceUtterance, request.sourceUtterance);
  assert.equal(input.listenerActorId, request.listenerActorId);
  assert.deepEqual(input.listener.otherHeardSpeech, []);
  assert.equal("visibleRecords" in input.listener, false);
  assert.equal("administrativeSources" in input.listener, false);
  assert.equal("reachableAnchorRefs" in input.listener, false);
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

test("an overlong transient ambient reply is repaired before it reaches the subtitle queue", async () => {
  const overlong = {
    ...JSON.parse(validAmbientReply),
    utterance: "가".repeat(TRANSIENT_WORLD_UTTERANCE_MAX_CODE_POINTS + 1),
  };
  const repaired = JSON.parse(validAmbientReply);
  const textGen = new FakeTextGen([
    { text: JSON.stringify(overlong) },
    { text: JSON.stringify(repaired) },
  ]);
  const service = new ProviderService({
    profileId: "test/ambient-subtitle-length-repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const result = await service.judgeAndProposeAmbientReply(ambientReplyRequest());

  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.utterance, repaired.utterance);
  assert.deepEqual(textGen.requests.map(request => request.purpose), [
    "ambient_reply",
    "repair",
  ]);
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
  assert.equal(textGen.requests[0].timeoutMs, 120_000);
  assert.match(textGen.requests[0].instructions, /resident's own supplied memories/);
  assert.match(textGen.requests[0].instructions, /publicIdentity and voice guide wording only/);
  assert.match(textGen.requests[0].instructions, /derive contactBasis exactly/);
  assert.match(textGen.requests[0].instructions, /vouch has the same bounded meaning/);
  assert.match(
    textGen.requests[0].instructions,
    /supporting meaningful_firsthand player-conversation memory.*do not require an external record/,
  );
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
  invalid.residentAssessments[0].testimonyLine = "Direct testimony was unavailable.";
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
  assert.match(result.proposal.residentAssessments[0].testimonyLine, /\p{Script=Hangul}/u);
});

test("request-scoped hearing semantic failures receive one repair and remain live", async () => {
  const request = hearingRequest();
  const cases: Array<{
    name: string;
    mutate: (judgment: HearingJudgment) => void;
    reason: RegExp;
  }> = [
    {
      name: "exact actor set",
      mutate: judgment => {
        judgment.residentAssessments[5].actorId = "NPC_Unknown_Resident";
      },
      reason: /exact six run actors/,
    },
    {
      name: "actor-owned memory citation",
      mutate: judgment => {
        judgment.residentAssessments[0].citedMemoryIds = ["mem-hearing-2"];
      },
      reason: /memory outside/,
    },
    {
      name: "contact basis",
      mutate: judgment => {
        judgment.residentAssessments[0].contactBasis = "limited_firsthand";
      },
      reason: /contact basis contradicts/,
    },
    {
      name: "evidenced-vouch quorum",
      mutate: judgment => {
        judgment.residentAssessments[3].proposedStance = "uncertain";
      },
      reason: /ordinary verdict requires at least four evidenced vouches/,
    },
  ];

  for (const candidate of cases) {
    const invalid = validHearingJudgment();
    candidate.mutate(invalid);
    assert.equal(
      hearingJudgmentSchemaForLocale(request.locale).safeParse(invalid).success,
      true,
      `${candidate.name} remains structurally valid`,
    );
    assert.equal(
      hearingJudgmentSchemaForRequest(request).safeParse(invalid).success,
      false,
      `${candidate.name} must fail request semantics`,
    );

    const repaired = validHearingJudgment();
    const textGen = new FakeTextGen([
      { text: JSON.stringify(invalid) },
      { text: JSON.stringify(repaired) },
    ]);
    const service = new ProviderService({
      profileId: `test/hearing-semantic-repair-${candidate.name}`,
      textGen,
      fallback: new RuleFallbackNpcAdapter(),
    });
    const result = await service.judgeHearing(request);

    assert.equal(result.meta.transport, "live", candidate.name);
    assert.equal(result.meta.usedFallback, false, candidate.name);
    assert.deepEqual(result.proposal, repaired, candidate.name);
    assert.deepEqual(
      textGen.requests.map(providerRequest => providerRequest.purpose),
      ["hearing_verdict", "repair"],
      candidate.name,
    );
    const repairInput = JSON.parse(textGen.requests[1]?.input ?? "{}") as {
      requestContext: unknown;
      validationIssues: Array<{ path: string; message: string }>;
    };
    assert.deepEqual(
      repairInput.requestContext,
      JSON.parse(textGen.requests[0]?.input ?? "{}"),
      `${candidate.name} repair keeps the evidence packet needed to correct semantics`,
    );
    assert.ok(
      repairInput.validationIssues.some(issue => candidate.reason.test(issue.message)),
      `${candidate.name} repair must receive the authoritative semantic reason`,
    );
    assert.deepEqual(
      service.auditSnapshot(request.runId).resolutions[0]?.callSeqs,
      [1, 2],
      candidate.name,
    );
  }
});

test("hearing semantic repair failure remains explicit provider fallback", async () => {
  const request = hearingRequest();
  const invalid = validHearingJudgment();
  invalid.residentAssessments[0].contactBasis = "limited_firsthand";
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalid) },
    { text: JSON.stringify(invalid) },
  ]);
  const service = new ProviderService({
    profileId: "test/hearing-semantic-repair-failure",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  let result;
  try {
    result = await service.judgeHearing(request);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(result?.meta.transport, "fallback");
  assert.equal(result?.meta.usedFallback, true);
  assert.equal(result?.meta.fallbackReason, "invalid_envelope");
  assert.deepEqual(
    textGen.requests.map(providerRequest => providerRequest.purpose),
    ["hearing_verdict", "repair"],
  );
  assert.equal(validateHearingJudgment(request, result!.proposal).ok, true);
  assert.equal(warnings.length, 1);
  assert.deepEqual(service.auditSnapshot(request.runId).resolutions, [{
    seq: 1,
    purpose: "hearing_verdict",
    profileId: "test/hearing-semantic-repair-failure",
    transport: "fallback",
    usedFallback: true,
    fallbackReason: "invalid_envelope",
    callSeqs: [1, 2],
  }]);
});

test("zero-vouch ordinary hearing repairs once to live abnormal under a narrowed schema", async () => {
  const request = hearingRequest(0);
  for (const resident of request.residents) {
    resident.stanceBefore = "uncertain";
    resident.hasMeaningfulFirsthandConversation = false;
    resident.memories = [];
  }
  const judgment = validHearingJudgment();
  judgment.residentAssessments = judgment.residentAssessments.map(assessment => ({
    ...assessment,
    contactBasis: "never_conversed",
    proposedStance: "uncertain",
    testimonyLine: "직접 대화한 적이 없어 보증할 수 없습니다.",
    citedMemoryIds: [],
  })) as HearingJudgment["residentAssessments"];
  judgment.proposedVerdict = "abnormal";
  judgment.citedRecordIds = [];
  judgment.citedLedgerEventIds = [];
  const invalid = structuredClone(judgment);
  invalid.proposedVerdict = "ordinary";
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalid) },
    { text: JSON.stringify(judgment) },
  ]);
  const service = new ProviderService({
    profileId: "test/hearing-zero-vouch-schema",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const result = await service.judgeHearing(request);
  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.proposedVerdict, "abnormal");
  assert.deepEqual(
    textGen.requests.map(providerRequest => providerRequest.purpose),
    ["hearing_verdict", "repair"],
  );
  const sentProperties = textGen.requests[0]?.jsonSchema.properties as Record<
    string,
    Record<string, unknown>
  >;
  assert.deepEqual(sentProperties.proposedVerdict.enum, ["abnormal"]);
  assert.deepEqual(
    service.auditSnapshot(request.runId).resolutions[0]?.callSeqs,
    [1, 2],
  );
  const genericProperties = hearingJudgmentJsonSchema.properties as Record<
    string,
    Record<string, unknown>
  >;
  assert.deepEqual(
    genericProperties.proposedVerdict.enum,
    ["ordinary", "abnormal"],
    "the generic exported schema stays unchanged",
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
  assert.equal(four.proposal.residentAssessments[5].contactBasis, "never_conversed");
  assert.equal(four.proposal.residentAssessments[4].contactBasis, "limited_firsthand");
  assert.equal(four.proposal.residentAssessments[0].contactBasis, "meaningful_firsthand");
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
  assert.match(
    judgmentTextGen.requests[0].instructions,
    /Never return a suspicionDelta that would move it below 0 or above 125/,
  );
  assert.match(judgmentTextGen.requests[0].instructions, /at least one Hangul code point/);
  assert.match(judgmentTextGen.requests[0].instructions, /QR or ID/);
  assert.match(judgmentTextGen.requests[0].instructions, /never copy stable ids/i);

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

test("standalone conversation judgments repair a delta above the suspicion ceiling", async () => {
  const unreachableJudgment = {
    ...JSON.parse(validJudgment),
    suspicionDelta: 15,
    whyLine: "그 표현 때문에 의심이 더 커졌습니다.",
  };
  const repairedJudgment = {
    ...unreachableJudgment,
    suspicionDelta: 0,
    whyLine: "이미 가장 강하게 의심하고 있어 판단이 더 바뀌지 않았습니다.",
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(unreachableJudgment) },
    { text: JSON.stringify(repairedJudgment) },
  ]);
  const service = new ProviderService({
    profileId: "test/reachable-standalone-suspicion-delta",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });

  const result = await service.judgeConversationTurn({
    ...judgmentRequest(),
    suspicionBefore: 125,
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.suspicionDelta, 0);
  assert.equal(result.proposal.whyLine, repairedJudgment.whyLine);
  assert.deepEqual(textGen.requests.map(request => request.purpose), [
    "conversation",
    "repair",
  ]);
});

test("merged conversation judgments repair a delta below the suspicion floor", async () => {
  const unreachableTurn = {
    ...JSON.parse(validMergedTurn),
    suspicionDelta: -15,
    whyLine: "방문 목적이 분명해 의심이 줄었습니다.",
  };
  const repairedTurn = JSON.parse(validMergedTurn);
  const textGen = new FakeTextGen([
    { text: JSON.stringify(unreachableTurn) },
    { text: JSON.stringify(repairedTurn) },
  ]);
  const service = new ProviderService({
    profileId: "test/reachable-suspicion-delta",
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
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.suspicionDelta, 0);
  assert.equal(result.proposal.whyLine, repairedTurn.whyLine);
  assert.deepEqual(textGen.requests.map(request => request.purpose), [
    "conversation_turn",
    "repair",
  ]);
  const repairInput = JSON.parse(textGen.requests[1].input) as {
    validationIssues: Array<{ path: string; message: string }>;
  };
  assert.deepEqual(repairInput.validationIssues, [{
    path: "suspicionDelta",
    message: "suspicionDelta must keep suspicion within 0..125 from current score 0",
  }]);
});

test("the one blocking merged call returns model-owned stance with firsthand grounding", async () => {
  const mixedNaturalKoreanTurn = {
    ...JSON.parse(validMergedTurn),
    openQuestion: {
      status: "open",
      text: "다음 확인 대상은 누구인가요?",
      whyLine: "Mira의 QR 기록과 2次 확인을 비교해야 합니다.",
    },
    suggestedReplies: [
      { text: "Mira에게 QR 기록 2개를 확인해 달라고 하겠습니다.", intent: "safe/local" },
      { text: "접수 메모와 來歷을 함께 살펴보겠습니다.", intent: "uncertain/repair" },
      { text: "3번 창구에서 다시 설명하겠습니다.", intent: "risky/weird" },
    ],
  };
  const textGen = new FakeTextGen([{ text: JSON.stringify(mixedNaturalKoreanTurn) }]);
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
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.openQuestion?.whyLine, mixedNaturalKoreanTurn.openQuestion.whyLine);
  assert.deepEqual(result.proposal.suggestedReplies, mixedNaturalKoreanTurn.suggestedReplies);
  assert.equal(textGen.requests[0].purpose, "conversation_turn");
  assert.equal(textGen.requests[0].schemaName, "npc_merged_conversation_turn");
  assert.match(textGen.requests[0].instructions, /Vouch requires meaningfulFirsthand/);
  assert.match(
    textGen.requests[0].instructions,
    /Vouch is bounded personal testimony/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /not proof of the player's identity, booking, institutional approval/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /honestly narrows.*vouch is normally appropriate/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /do not require an external record, prior acquaintance/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /external procedural question may remain open while stance is vouch/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /never leave an answered question stale/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /After stance becomes vouch, set continueConversation=false/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /Set meaningfulFirsthand=true.*coherent handling of a role-supported question/,
  );
  assert.match(
    textGen.requests[0].instructions,
    /actorContext and selfContext describe only this resident's authored identity/,
  );
  assert.match(textGen.requests[0].instructions, /Missing context means unknown, never absent/);
  assert.match(textGen.requests[0].instructions, /hard validity boundary/);
  assert.match(textGen.requests[0].instructions, /direct answer to answerBinding\.answeredNpcLine/);
  assert.match(textGen.requests[0].instructions, /does not become a claim about the player's identity/);
  const input = JSON.parse(textGen.requests[0].input);
  assert.equal(input.stanceBefore, "uncertain");
  assert.equal(input.hasMeaningfulFirsthandConversation, false);
  assert.equal(input.currentOpenQuestion, null);
  assert.equal(input.groundingContract.knowledgeMode, "closed_world");
  assert.deepEqual(input.groundingContract.suppliedPlayerStatements, [judgmentRequest().playerLine]);
  assert.ok(input.groundingContract.validityRules.length >= 3);
  assert.deepEqual(input.answerBinding, {
    answeredNpcLine: "오늘도 같은 걸로 드릴까요?",
  });
  assert.equal("visibleRecords" in input.residentContext, false);
  assert.equal("toolCatalog" in input.residentContext, false);
  assert.deepEqual(input.conversationFrame, {
    phase: "player_reply",
    residentSpeaker: {
      actorId: "NPC_Store_Clerk",
      role: "store_clerk",
      locationId: "Store",
    },
    playerInterlocutor: {
      actorId: "player",
      role: "player",
      locationId: null,
      locationBasis: "active_face_to_face_location_not_supplied",
    },
    thirdPartyActorIds: ["NPC_Store_Manager"],
  });
  const mergedSchemaText = JSON.stringify(textGen.requests[0].jsonSchema);
  assert.match(
    mergedSchemaText,
    /complete, self-contained, in-character first-person utterance/,
  );
  assert.match(
    mergedSchemaText,
    /becomes evidence only if selected/,
  );
  assert.match(
    mergedSchemaText,
    /speaker's own identity or possession/,
  );
  assert.match(
    mergedSchemaText,
    /Hangul-dominant natural Korean/,
  );
  assert.match(
    mergedSchemaText,
    /fixed array order: safe\/local first, uncertain\/repair second, risky\/weird third/,
  );
});

test("merged conversation normalizes only duplicate hidden intent labels without repair", async () => {
  const duplicateIntents = JSON.parse(validMergedTurn);
  duplicateIntents.suggestedReplies[0].intent = "safe/local";
  duplicateIntents.suggestedReplies[1].intent = "safe/local";
  duplicateIntents.suggestedReplies[2].intent = "risky/weird";
  const authoredTexts = duplicateIntents.suggestedReplies.map(
    (reply: { text: string }) => reply.text,
  );
  const authoredJudgment = {
    suspicionDelta: duplicateIntents.suspicionDelta,
    reportDelta: duplicateIntents.reportDelta,
    signals: duplicateIntents.signals,
    whyLine: duplicateIntents.whyLine,
    stance: duplicateIntents.stance,
    meaningfulFirsthand: duplicateIntents.meaningfulFirsthand,
    openQuestion: duplicateIntents.openQuestion,
    utterance: duplicateIntents.utterance,
    continueConversation: duplicateIntents.continueConversation,
  };
  const textGen = new FakeTextGen([{ text: JSON.stringify(duplicateIntents) }]);
  const service = new ProviderService({
    profileId: "test/merged-intent-normalization",
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
  assert.equal(result.meta.usedFallback, false);
  assert.equal(textGen.requests.length, 1, "hidden metadata must not spend a repair call");
  assert.deepEqual(
    result.proposal.suggestedReplies.map(reply => reply.text),
    authoredTexts,
    "provider-authored player-visible text stays byte-for-byte unchanged",
  );
  assert.deepEqual(
    result.proposal.suggestedReplies.map(reply => reply.intent),
    ["safe/local", "uncertain/repair", "risky/weird"],
  );
  assert.deepEqual({
    suspicionDelta: result.proposal.suspicionDelta,
    reportDelta: result.proposal.reportDelta,
    signals: result.proposal.signals,
    whyLine: result.proposal.whyLine,
    stance: result.proposal.stance,
    meaningfulFirsthand: result.proposal.meaningfulFirsthand,
    openQuestion: result.proposal.openQuestion,
    utterance: result.proposal.utterance,
    continueConversation: result.proposal.continueConversation,
  }, authoredJudgment, "judgment and NPC speech remain model-owned");
});

test("merged intent normalization never bypasses visible-text repair", async () => {
  const invalidVisibleText = JSON.parse(validMergedTurn);
  invalidVisibleText.utterance = "NPC_Studio_Manager에게 확인하겠습니다.";
  invalidVisibleText.suggestedReplies[1].intent = "safe/local";
  const repaired = JSON.parse(validMergedTurn);
  repaired.utterance = "스튜디오 책임자에게 확인하겠습니다.";
  repaired.suggestedReplies[1].intent = "safe/local";
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalidVisibleText) },
    { text: JSON.stringify(repaired) },
  ]);
  const service = new ProviderService({
    profileId: "test/merged-intent-normalization-after-repair",
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
  assert.equal(result.meta.usedFallback, false);
  assert.deepEqual(textGen.requests.map(request => request.purpose), [
    "conversation_turn",
    "repair",
  ]);
  assert.equal(result.proposal.utterance, repaired.utterance);
  assert.deepEqual(
    result.proposal.suggestedReplies.map(reply => reply.intent),
    ["safe/local", "uncertain/repair", "risky/weird"],
  );
});

test("merged Korean conversation repair receives every rejected Latin token", async () => {
  const invalidTurn = {
    ...JSON.parse(validMergedTurn),
    utterance: "studio의 OpenAI handler에게 확인하겠습니다.",
  };
  const repairedTurn = {
    ...invalidTurn,
    utterance: "스튜디오 담당자에게 확인하겠습니다.",
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(invalidTurn) },
    { text: JSON.stringify(repairedTurn) },
  ]);
  const service = new ProviderService({
    profileId: "test/merged-korean-latin-repair",
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
  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.proposal.utterance, repairedTurn.utterance);
  assert.deepEqual(textGen.requests.map(request => request.purpose), [
    "conversation_turn",
    "repair",
  ]);
  assert.match(textGen.requests[1].instructions, /every listed token/);
  const repairInput = JSON.parse(textGen.requests[1].input) as {
    validationIssues: Array<{
      path: string;
      message: string;
      offendingLatinTokens?: string[];
    }>;
  };
  assert.deepEqual(repairInput.validationIssues, [
    {
      path: "utterance",
      message:
        "player-visible text must remain in fiction and must not expose game or model framing",
    },
    {
      path: "utterance",
      message:
        "player-visible Korean text may use Latin script only for title-case names or short uppercase acronyms",
      offendingLatinTokens: ["studio", "OpenAI", "handler"],
    },
  ]);
});

test("typed multilingual player text keeps exact Unicode bytes in the provider request after edge trim", async () => {
  const expectedPlayerLine =
    "한국어 안내  中文登记、日本語の確認； città già pronta, français: «cafe\u0301 déjà prêt»?!";
  const submittedPlayerLine = ` \t\n${expectedPlayerLine}\u00a0 `;
  assert.notEqual(
    expectedPlayerLine.normalize("NFC"),
    expectedPlayerLine,
    "the fixture must retain a decomposed accent so normalization would be observable",
  );
  const parsedAnswer = runSessionAnswerRequestSchema.parse({
    runId: "run-multilingual-player-line",
    sessionId: "session-multilingual-player-line",
    turnId: "turn-multilingual-player-line",
    answer: { type: "free_input", text: submittedPlayerLine },
  });
  assert.equal(parsedAnswer.answer.text, expectedPlayerLine, "only outer whitespace is trimmed");

  const textGen = new FakeTextGen([{ text: validMergedTurn }]);
  const service = new ProviderService({
    profileId: "test/multilingual-player-line",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeAndProposeConversationTurn({
    ...judgmentRequest(),
    sessionId: parsedAnswer.runId,
    playerLine: parsedAnswer.answer.text,
    objective: "방문 이유를 확인한다.",
    sceneFacts: ["스튜디오 접수대에서 직접 대화하고 있다."],
    stanceBefore: "uncertain",
    hasMeaningfulFirsthandConversation: false,
  });

  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 1);
  const providerInput = JSON.parse(textGen.requests[0].input) as {
    playerLine: string;
    groundingContract?: {
      knowledgeMode?: string;
      suppliedPlayerStatements?: string[];
      validityRules?: string[];
    };
  };
  assert.equal(providerInput.playerLine, expectedPlayerLine);
  assert.equal(providerInput.playerLine.length, expectedPlayerLine.length, "text is not truncated");
  assert.deepEqual(
    Buffer.from(providerInput.playerLine),
    Buffer.from(expectedPlayerLine),
    "internal spaces, punctuation, and Unicode normalization form stay byte-exact",
  );
  assert.equal(providerInput.groundingContract?.knowledgeMode, "closed_world");
  assert.deepEqual(
    providerInput.groundingContract?.suppliedPlayerStatements,
    [expectedPlayerLine],
  );
  assert.ok((providerInput.groundingContract?.validityRules?.length ?? 0) >= 3);
});

test("player-visible stable ids get one bounded repair even when the prose contains Hangul", async () => {
  const leakedStableIds = {
    ...JSON.parse(validMergedTurn),
    openQuestion: {
      status: "open",
      text: "다음 확인 대상은 누구인가요?",
      whyLine: "NPC_Studio_Manager의 mem-question-1을 확인해야 합니다.",
    },
    suggestedReplies: [
      { text: "Mira에게 다시 묻겠습니다.", intent: "safe/local" },
      { text: "TS_Studio_ReviewRecords를 확인하겠습니다.", intent: "uncertain/repair" },
      { text: "아직 판단하지 않겠습니다.", intent: "risky/weird" },
    ],
  };
  const textGen = new FakeTextGen([
    {
      text: JSON.stringify(leakedStableIds),
      usage: { inputTokens: 30, outputTokens: 20, totalTokens: 50 },
    },
    {
      text: validMergedTurn,
      usage: { inputTokens: 35, outputTokens: 15, totalTokens: 50 },
    },
  ]);
  const service = new ProviderService({
    profileId: "test/stable-id-repair",
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
  assert.equal(result.meta.usedFallback, false);
  assert.equal(textGen.requests.length, 2);
  assert.equal(textGen.requests[1]?.purpose, "repair");
  assert.match(textGen.requests[1]?.instructions ?? "", /rewrite the whole affected field/);
  const repairInput = JSON.parse(textGen.requests[1]?.input ?? "{}") as {
    requestContext?: {
      playerLine?: string;
      conversationFrame?: { residentSpeaker?: { actorId?: string } };
    };
  };
  assert.equal(repairInput.requestContext?.playerLine, judgmentRequest().playerLine);
  assert.equal(
    repairInput.requestContext?.conversationFrame?.residentSpeaker?.actorId,
    judgmentRequest().observePacket.actorId,
  );
  const turnSchema = textGen.requests[0]?.jsonSchema as {
    properties?: { utterance?: { description?: string } };
  };
  assert.match(turnSchema.properties?.utterance?.description ?? "", /Never include an internal stable id/);
  assert.doesNotMatch(
    JSON.stringify({
      utterance: result.proposal.utterance,
      whyLine: result.proposal.whyLine,
      openQuestion: result.proposal.openQuestion,
      suggestedReplies: result.proposal.suggestedReplies,
    }),
    /NPC_|mem-|TS_/,
  );
});

test("an invalid-envelope fallback never promotes an uncertain resident to vouch", async () => {
  const leakedStableIdTurn = {
    ...JSON.parse(validMergedTurn),
    utterance: "NPC_Office_Worker의 답변을 확인했습니다.",
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(leakedStableIdTurn) },
    { text: JSON.stringify(leakedStableIdTurn) },
  ]);
  const service = new ProviderService({
    profileId: "test/stable-id-fallback-stance",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeAndProposeConversationTurn({
    ...judgmentRequest(),
    playerLine: "안내를 받으러 왔습니다.",
    objective: "방문 이유를 확인한다.",
    sceneFacts: ["사무실에서 직접 대화하고 있다."],
    stanceBefore: "uncertain",
    hasMeaningfulFirsthandConversation: false,
  });

  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.fallbackReason, "invalid_envelope");
  assert.equal(result.proposal.meaningfulFirsthand, true);
  assert.equal(result.proposal.stance, "uncertain");
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
    /NPC_|mem-|TS_/,
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

test("non-Korean player text gets one repair before it reaches the game", async () => {
  const nonKoreanJudgment = JSON.stringify({
    suspicionDelta: 45,
    reportDelta: 30,
    signals: ["dream_language_leak"],
    whyLine: "The player explicitly described another world.",
  });
  const textGen = new FakeTextGen([{ text: nonKoreanJudgment }, { text: validJudgment }]);
  const service = new ProviderService({
    profileId: "test/korean-repair",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const result = await service.judgeConversationTurn(judgmentRequest());
  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 2);
  assert.equal(textGen.requests[1].purpose, "repair");
  assert.match(result.proposal.whyLine, /\p{Script=Hangul}/u);
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
    suspicionBefore: 10,
  });
  assert.equal(result.meta.transport, "live");
  assert.equal(textGen.requests.length, 1);
  assert.match(textGen.requests[0].instructions, /run locale is en-US/);
  assert.match(textGen.requests[0].instructions, /natural American English/);
  assert.match(textGen.requests[0].instructions, /never copy stable ids/i);
  assert.doesNotMatch(textGen.requests[0].instructions, /Hangul code point/);
  assert.match(JSON.stringify(textGen.requests[0].jsonSchema), /natural American English/);
  assert.doesNotMatch(JSON.stringify(textGen.requests[0].jsonSchema), /natural modern Korean/);
  const providerInput = JSON.parse(textGen.requests[0].input) as {
    playerVisibleOutputContract?: {
      immutableRunLocale?: string;
      requiredLanguage?: string;
      sourceContextHandling?: string;
    };
  };
  assert.deepEqual(
    providerInput.playerVisibleOutputContract?.immutableRunLocale,
    "en-US",
  );
  assert.deepEqual(
    providerInput.playerVisibleOutputContract?.requiredLanguage,
    "natural American English",
  );
  assert.match(
    providerInput.playerVisibleOutputContract?.sourceContextHandling ?? "",
    /translate or naturally re-express/,
  );
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

test("invalid first and repair envelopes emit one sanitized structured warning", async () => {
  const sentinel = "PLAYER_PRIVATE_SENTINEL_DO_NOT_LOG";
  const offendingLatinToken = "secretword";
  const firstInvalid = {
    utterance: `방문자가 ${offendingLatinToken}를 말했습니다.`,
    suggestedReplies: [],
    continueConversation: true,
    [sentinel]: "private extra field",
  };
  const repairInvalid = {
    utterance: `방문자가 ${offendingLatinToken}를 다시 말했습니다.`,
    suggestedReplies: [
      { text: "I can explain the procedure.", intent: "safe/local" },
      { text: "Please clarify the question.", intent: "uncertain/repair" },
      { text: "I have nothing to add.", intent: "risky/weird" },
    ],
    continueConversation: "yes",
    [sentinel]: "private extra field",
  };
  const textGen = new FakeTextGen([
    { text: JSON.stringify(firstInvalid) },
    { text: JSON.stringify(repairInvalid) },
  ]);
  const service = new ProviderService({
    profileId: "test/sanitized-invalid-envelope-warning",
    textGen,
    fallback: new RuleFallbackNpcAdapter(),
  });
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  let result;
  try {
    result = await service.proposeConversationTurn({
      ...conversationRequest(),
      sessionId: "run-sanitized-invalid-envelope-warning",
      locale: "ko-KR",
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(result?.meta.transport, "fallback");
  assert.equal(result?.meta.fallbackReason, "invalid_envelope");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.length, 1);
  const warning = warnings[0]?.[0] as {
    event: string;
    purpose: string;
    firstIssues: Array<{ path: string; code: string; message: string }>;
    repairIssues: Array<{ path: string; code: string; message: string }>;
  };
  assert.equal(warning.event, "provider_invalid_envelope_after_repair");
  assert.equal(warning.purpose, "conversation");
  assert.ok(warning.firstIssues.some(issue =>
    issue.path === "suggestedReplies" && issue.code.length > 0 && issue.message.length > 0
  ));
  assert.ok(warning.repairIssues.some(issue =>
    issue.path === "continueConversation" && issue.code.length > 0 && issue.message.length > 0
  ));
  assert.ok([...warning.firstIssues, ...warning.repairIssues].some(issue =>
    issue.message.includes("[redacted]")
  ), "the warning must exercise value redaction instead of merely omitting output fields");
  assert.doesNotMatch(JSON.stringify(warning), new RegExp(sentinel));
  assert.doesNotMatch(JSON.stringify(warning), new RegExp(offendingLatinToken));
  assert.deepEqual(textGen.requests.map(request => request.purpose), ["conversation", "repair"]);
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
  const hardBudgetAudit = budgeted.auditSnapshot("session-provider-test");
  assert.equal(hardBudgetAudit.complete, true);
  assert.deepEqual(hardBudgetAudit.resolutions.at(-1), {
    seq: 2,
    purpose: "conversation",
    profileId: "test/budget",
    transport: "fallback",
    usedFallback: true,
    fallbackReason: "budget_exhausted",
    callSeqs: [],
  });

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
  const repairAudit = repairCeiling.auditSnapshot("run-ambient-repair-ceiling");
  assert.equal(repairAudit.complete, true);
  assert.equal(repairAudit.calls.length, 1);
  assert.equal(repairAudit.resolutions.length, 1);
  assert.equal(repairAudit.resolutions[0]?.fallbackReason, "budget_exhausted");
  assert.deepEqual(repairAudit.resolutions[0]?.callSeqs, [1]);

  const tokenCeilingTextGen = new FakeTextGen([{ text: validConversation }]);
  const tokenCeilingFallback = new RuleFallbackNpcAdapter();
  const originalTokenFallback = tokenCeilingFallback.proposeNextStep.bind(tokenCeilingFallback);
  let tokenFallbackCalls = 0;
  tokenCeilingFallback.proposeNextStep = async request => {
    tokenFallbackCalls += 1;
    return originalTokenFallback(request);
  };
  const tokenCeiling = new ProviderService({
    profileId: "test/ambient-token-ceiling",
    textGen: tokenCeilingTextGen,
    fallback: tokenCeilingFallback,
  });
  await assert.rejects(
    tokenCeiling.proposeNextStep({
      sessionId: "run-ambient-token-ceiling",
      locale: "ko-KR",
      iteration: 0,
      goal: "곁에 있는 주민과 직접 말한다.",
      observePacket: observePacket(),
      blockedSignatures: [],
      requiredToolCall: { tool: "talk_to", actorId: "NPC_Store_Manager" },
      requireUtterance: true,
      budgetCeiling: { maxCalls: 100, maxTokens: 1 },
    }),
    (error: unknown) =>
      error instanceof ProviderBudgetReservedError &&
      error.code === "provider_budget_reserved",
  );
  assert.equal(tokenCeilingTextGen.requests.length, 0);
  assert.equal(tokenFallbackCalls, 0);
  assert.equal(tokenCeiling.accountingSnapshot("run-ambient-token-ceiling").callsUsed, 0);
  const tokenCeilingAudit = tokenCeiling.auditSnapshot("run-ambient-token-ceiling");
  assert.equal(tokenCeilingAudit.complete, true);
  assert.deepEqual(tokenCeilingAudit.calls, []);
  assert.deepEqual(tokenCeilingAudit.resolutions, []);
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
  assert.equal(config.runtime.timeoutMs, 12_000);
  assert.equal(Object.keys(config.profiles).some(profile => profile.startsWith("scripted/")), false);
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.model, "Qwen-Ambassador/Qwen3.7-Plus");
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.timeoutMs, 30_000);
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.params.enableThinking, false);
  assert.ok(
    (config.profiles["modelscope/qwen3.7-plus"]?.params.maxTokens ?? 0) >= 1_200,
    "the Qwen profile needs room for the exact-six hearing envelope",
  );
});

test("Qwen profile timeout governs both its transport and ProviderService boundary", async () => {
  const server = Bun.serve({
    port: 0,
    async fetch() {
      await Bun.sleep(100);
      return Response.json({
        id: "chatcmpl-timeout-contract",
        object: "chat.completion",
        created: 0,
        model: "Qwen-Ambassador/Qwen3.7-Plus",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: validConversation },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
      });
    },
  });

  try {
    const config = structuredClone(loadProviderConfig());
    // If either the adapter or ProviderService accidentally receives the
    // runtime default, this deliberately slow compatible endpoint times out.
    config.runtime.timeoutMs = 20;
    config.profiles["modelscope/qwen3.7-plus"]!.timeoutMs = 3_000;
    const { proposalPort } = createProviderFromConfig(config, {
      NPC_PROVIDER_PROFILE: "modelscope/qwen3.7-plus",
      MODELSCOPE_BASE_URL: new URL("v1", server.url).toString(),
      MODELSCOPE_API_KEY: "test-only-key",
    });

    const result = await proposalPort.proposeConversationTurn({
      ...conversationRequest(),
      sessionId: "qwen-timeout-contract",
    });
    assert.equal(result.meta.profileId, "modelscope/qwen3.7-plus");
    assert.equal(result.meta.transport, "live");
    assert.equal(result.meta.usedFallback, false);
    assert.equal(proposalPort.auditSnapshot("qwen-timeout-contract").calls[0]?.outcome, "success");
  } finally {
    server.stop(true);
  }
});

test("the final hearing can outlive the ordinary Qwen profile timeout inside the game ceiling", async () => {
  const server = Bun.serve({
    port: 0,
    async fetch() {
      await Bun.sleep(80);
      return Response.json({
        id: "chatcmpl-hearing-timeout-contract",
        object: "chat.completion",
        created: 0,
        model: "Qwen-Ambassador/Qwen3.7-Plus",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: JSON.stringify(validHearingJudgment()) },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 101, completion_tokens: 67, total_tokens: 168 },
      });
    },
  });

  try {
    const config = structuredClone(loadProviderConfig());
    config.runtime.timeoutMs = 10;
    config.profiles["modelscope/qwen3.7-plus"]!.timeoutMs = 20;
    const { proposalPort } = createProviderFromConfig(config, {
      NPC_PROVIDER_PROFILE: "modelscope/qwen3.7-plus",
      MODELSCOPE_BASE_URL: new URL("v1", server.url).toString(),
      MODELSCOPE_API_KEY: "test-only-key",
    });

    const result = await proposalPort.judgeHearing(hearingRequest());
    assert.equal(result.meta.profileId, "modelscope/qwen3.7-plus");
    assert.equal(result.meta.transport, "live");
    assert.equal(result.meta.usedFallback, false);
    assert.equal(result.proposal.residentAssessments.length, 6);
    assert.equal(proposalPort.auditSnapshot(hearingRequest().runId).calls[0]?.outcome, "success");
  } finally {
    server.stop(true);
  }
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

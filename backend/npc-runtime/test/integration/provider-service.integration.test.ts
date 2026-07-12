import assert from "node:assert/strict";
import { test } from "bun:test";
import { assembleObservePacket, DEFAULT_ROLE_POLICIES } from "../../src/agentloop/context.js";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { createProviderFromEnvironment, loadProviderConfig } from "../../src/providers/registry.js";
import { ProviderService } from "../../src/providers/service.js";
import type {
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
  return assembleObservePacket(createSameOrderWorld(), {
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
  utterance: "방문 목적을 확인했습니다.",
  suggestedReplies: [
    { text: "확인해 주셔서 감사합니다.", intent: "safe/local" },
    { text: "다음 절차를 알려 주세요.", intent: "uncertain/repair" },
    { text: "더 말하지 않겠습니다.", intent: "risky/weird" },
  ],
  continueConversation: false,
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
  assert.match(judgmentTextGen.requests[0].instructions, /do not mix English, Chinese characters/);

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
  assert.match(textGen.requests[0].instructions, /player-visible.*in natural modern Korean only/);
  assert.match(textGen.requests[0].instructions, /Never repeat an identical successful tool call/);

  const ambientFallback = await new RuleFallbackNpcAdapter().proposeNextStep({
    sessionId: "run-ambient-fallback",
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
});

test("production registry contains no scripted profile", () => {
  const config = loadProviderConfig();
  assert.equal(config.selection.default, "openai/gpt-5.4-mini");
  assert.equal(Object.keys(config.profiles).some(profile => profile.startsWith("scripted/")), false);
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.model, "Qwen-Ambassador/Qwen3.7-Plus");
  assert.equal(config.profiles["modelscope/qwen3.7-plus"]?.params.enableThinking, false);
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

import assert from "node:assert/strict";
import { test } from "bun:test";
import { mergedConversationTurnSchema } from "../../src/providers/envelope.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import { ScriptedNpcAdapter } from "../../src/providers/testing/scripted-npc-adapter.js";
import type { MergedConversationTurnRequest } from "../../src/providers/ports.js";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import { DEFAULT_ROLE_POLICIES, assembleObservePacket } from "../../src/agentloop/context.js";

function sampleRequest(): MergedConversationTurnRequest {
  const world = createSameOrderWorld();
  return {
    sessionId: "sess-merged",
    locale: "ko-KR",
    beatId: "probe",
    promptId: "store.same_order.routine",
    actorId: "NPC_Store_Clerk",
    playerLine: "오늘 처음 왔는데요.",
    conversationHistory: [{ speakerId: "NPC_Store_Clerk", line: "오늘도 같은 걸로 드릴까요?" }],
    observePacket: assembleObservePacket(world, {
      actor: {
        actorId: "NPC_Store_Clerk",
        role: "store_clerk",
        landmarkId: "Store",
        knownActorIds: ["player", "NPC_Store_Manager"],
        knownLandmarkIds: ["Store", "Station"],
      },
      goals: ["어제 기록과 맞춰 본다."],
      policy: DEFAULT_ROLE_POLICIES.store_clerk,
      memory: { actorId: "NPC_Store_Clerk", ownActionNotes: [], observedLedgerEventIds: [] },
      heardSpeech: ["오늘 처음 왔는데요."],
    }),
    suspicionBefore: 0,
    reportPressureBefore: 0,
    objective: "어제 기록과 맞춰 본다.",
    sceneFacts: ["점원은 상점 기록만 인용한다."],
  };
}

test("merged conversation turn schema accepts a valid judgment-plus-reply envelope", () => {
  const parsed = mergedConversationTurnSchema.parse({
    suspicionDelta: 20,
    reportDelta: 10,
    signals: ["local_routine_mismatch"],
    whyLine: "그 대답이 상점의 평소 순서와 맞지 않았습니다.",
    stance: "uncertain",
    meaningfulFirsthand: true,
    utterance: "어제 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?",
    suggestedReplies: [
      { text: "네, 맞습니다.", intent: "safe/local" },
      { text: "제가 헷갈렸나 봅니다.", intent: "uncertain/repair" },
      { text: "저는 여기 사람이 아닙니다.", intent: "risky/weird" },
    ],
    continueConversation: true,
  });
  assert.equal(parsed.suggestedReplies.length, 3);
  assert.equal(parsed.signals[0], "local_routine_mismatch");
});

test("fallback merged turn composes rule judgment with canned reply suggestions", async () => {
  const fallback = new RuleFallbackNpcAdapter();
  const resolved = await fallback.judgeAndProposeConversationTurn(sampleRequest());
  assert.equal(resolved.meta.usedFallback, true);
  assert.ok(resolved.proposal.utterance.length > 0);
  assert.match(resolved.proposal.utterance, /[가-힣]/);
  assert.equal(resolved.proposal.suggestedReplies.length, 3);
  assert.ok(resolved.proposal.whyLine.length > 0);
  const reparsed = mergedConversationTurnSchema.safeParse({
    ...resolved.proposal,
  });
  assert.equal(reparsed.success, true);
});

test("scripted merged turn keeps judgment clamps available to the session path", async () => {
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "기록과 다르지 않습니까?",
      suggestedReplies: [
        { text: "네, 같습니다.", intent: "safe/local" },
        { text: "확인해 볼게요.", intent: "uncertain/repair" },
        { text: "처음 왔습니다.", intent: "risky/weird" },
      ],
      continueConversation: true,
    }),
    judgment: () => ({
      suspicionDelta: 25,
      reportDelta: 12,
      signals: ["local_routine_mismatch"],
      whyLine: "그 대답이 상점의 평소 순서와 맞지 않았습니다.",
    }),
    nextStep: () => ({ rationale: "done", done: true }),
  });
  const resolved = await adapter.judgeAndProposeConversationTurn(sampleRequest());
  assert.equal(resolved.proposal.suspicionDelta, 25);
  assert.equal(resolved.proposal.utterance, "기록과 다르지 않습니까?");
  assert.equal(resolved.meta.transport, "scripted");
});

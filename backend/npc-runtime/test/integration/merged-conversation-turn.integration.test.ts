import assert from "node:assert/strict";
import { test } from "bun:test";
import { mergedConversationTurnSchema } from "../../src/providers/envelope.js";
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
    playerStatementEvidenceId: "player_statement:session-1:turn-1",
    conversationHistory: [{
      speakerId: "NPC_Store_Clerk",
      line: "오늘도 같은 걸로 드릴까요?",
      evidenceId: null,
    }],
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
      memory: {
        actorId: "NPC_Store_Clerk",
        ownActionNotes: [],
        observedLedgerEventIds: [],
        evidence: [],
      },
      heardSpeech: [{
        speakerActorId: "player",
        source: { kind: "player_statement", id: "player_statement:session-1:prior" },
        line: "오늘 처음 왔는데요.",
      }],
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
    openQuestion: null,
    utterance: "어제 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?",
    suggestedReplies: [
      { text: "네, 맞습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
      { text: "제가 헷갈렸나 봅니다.", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
      { text: "저는 여기 사람이 아닙니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
    ],
    continueConversation: true,
  });
  assert.equal(parsed.suggestedReplies.length, 3);
  assert.equal(parsed.signals[0], "local_routine_mismatch");
});

test("merged conversation requires either null or one complete nonblank open question", () => {
  const valid = {
    suspicionDelta: 0,
    reportDelta: 0,
    signals: [],
    whyLine: "방문자의 설명을 더 들어야 판단할 수 있습니다.",
    stance: "uncertain",
    meaningfulFirsthand: true,
    openQuestion: null,
    utterance: "방문 목적을 조금 더 설명해 주세요.",
    suggestedReplies: [
      { text: "청문 절차를 확인하러 왔습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
      { text: "기억이 흐릿해서 아는 만큼만 말씀드리겠습니다.", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
      { text: "설명할 이유가 없습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
    ],
    continueConversation: true,
  } as const;

  assert.equal(mergedConversationTurnSchema.safeParse(valid).success, true);
  const { openQuestion: _omitted, ...missing } = valid;
  assert.equal(mergedConversationTurnSchema.safeParse(missing).success, false);
  assert.equal(mergedConversationTurnSchema.safeParse({
    ...valid,
    openQuestion: { status: "open", text: null, whyLine: "이유가 남아 있습니다." },
  }).success, false);
  assert.equal(mergedConversationTurnSchema.safeParse({
    ...valid,
    openQuestion: { status: "open", text: "", whyLine: "이유가 남아 있습니다." },
  }).success, false);
  assert.equal(mergedConversationTurnSchema.safeParse({
    ...valid,
    openQuestion: { status: "open", text: "방문 목적은 무엇인가요?", whyLine: "   " },
  }).success, false);
  assert.equal(mergedConversationTurnSchema.safeParse({
    ...valid,
    openQuestion: {
      status: "open",
      text: "방문 목적은 무엇인가요?",
      whyLine: "방문 목적이 아직 분명하지 않습니다.",
    },
  }).success, true);
});

test("scripted merged turn keeps judgment clamps available to the session path", async () => {
  const adapter = new ScriptedNpcAdapter({
    conversation: () => ({
      utterance: "기록과 다르지 않습니까?",
      suggestedReplies: [
        { text: "네, 같습니다.", intent: "safe/local", evidenceIds: [], introducesNewClaim: false },
        { text: "확인해 볼게요.", intent: "uncertain/repair", evidenceIds: [], introducesNewClaim: false },
        { text: "처음 왔습니다.", intent: "risky/weird", evidenceIds: [], introducesNewClaim: false },
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

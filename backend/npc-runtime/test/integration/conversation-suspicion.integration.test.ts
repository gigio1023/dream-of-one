import assert from "node:assert/strict";
import test from "node:test";

import { evaluateConversationTurn } from "../../src/runtime/conversation-suspicion.js";

test("same order safe choice preserves conversation cover", () => {
  const result = evaluateConversationTurn({
    conversationId: "conv-same-order",
    turnId: "turn-1",
    promptId: "store.same_order.routine",
    choiceSetId: "store.same_order.choices",
    selectedChoiceId: "store.same_order.safe",
    intent: "safe/local",
    line: "네, 같은 걸로 부탁해요.",
    suspicionBefore: 0,
    reportWeightBefore: 0,
  });

  assert.deepEqual(result.suspicionSignals, []);
  assert.equal(result.suspicionAfter, 0);
  assert.equal(result.reportWeightAfter, 0);
  assert.equal(result.npcSuspicionStage, "normal");
  assert.equal(result.stationConsequence, "none");
});

test("same order risky choice creates deterministic local routine mismatch", () => {
  const result = evaluateConversationTurn({
    conversationId: "conv-same-order",
    turnId: "turn-1",
    promptId: "store.same_order.routine",
    choiceSetId: "store.same_order.choices",
    selectedChoiceId: "store.same_order.risky",
    intent: "risky/weird",
    line: "오늘 처음 왔는데요.",
    suspicionBefore: 0,
    reportWeightBefore: 0,
  });

  assert.deepEqual(result.suspicionSignals, ["local_routine_mismatch"]);
  assert.equal(result.suspicionDelta, 35);
  assert.equal(result.suspicionAfter, 35);
  assert.equal(result.reportDelta, 30);
  assert.equal(result.reportWeightAfter, 30);
  assert.equal(result.npcSuspicionStage, "uneasy");
});

test("free input dream language escalates to report without provider authority", () => {
  const result = evaluateConversationTurn({
    conversationId: "conv-same-order",
    turnId: "turn-2",
    promptId: "store.same_order.probe",
    choiceSetId: "store.same_order.probe.choices",
    freeInputHash: "free-dream-line",
    line: "저는 이 꿈에 방금 들어왔어요.",
    suspicionBefore: 35,
    reportWeightBefore: 30,
    memory: [
      {
        turnId: "turn-1",
        promptId: "store.same_order.routine",
        line: "오늘 처음 왔는데요.",
        selectedChoiceId: "store.same_order.risky",
        intent: "risky/weird",
        signals: ["local_routine_mismatch"],
      },
    ],
  });

  assert.equal(result.suspicionSignals.includes("dream_language_leak"), true);
  assert.equal(result.suspicionDelta, 90);
  assert.equal(result.suspicionAfter, 125);
  assert.equal(result.reportDelta, 85);
  assert.equal(result.reportWeightAfter, 115);
  assert.equal(result.npcSuspicionStage, "reported");
  assert.equal(result.stationConsequence, "inquest");
  assert.match(result.whyLine, /dream or outside-world language/);
});

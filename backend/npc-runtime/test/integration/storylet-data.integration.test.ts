import assert from "node:assert/strict";
import { test } from "bun:test";
import { loadStorylet, parseStorylet } from "../../src/runtime/storylet.js";
import { CONVERSATION_CHOICE_INTENTS } from "../../src/contracts/types.js";

// Canonical strings copied verbatim from the Same Order packet + the dialogue
// line bank (docs/scenario/content/*). If the storylet drifts from canon, this
// fails.
const PACKET_PROMPTS: Record<string, string> = {
  "store.same_order.routine": "오늘도 같은 걸로 드릴까요?",
  "store.same_order.probe": "어제 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?",
  "station.same_order.reconciliation":
    "상점 기록에는 처음 왔다고 답한 뒤, 꿈에 방금 들어왔다고 진술한 기록이 있습니다. 어느 진술을 정정합니까?",
};

const LINE_BANK_CLERK_LINES = [
  "줄 표식 안에서 말씀해 주세요.",
  "순서가 비었습니다. 앞 사람 확인이 먼저입니다.",
  "상품명만으로는 접수되지 않습니다. 수량과 라벨을 같이요.",
  "그 말은 어제 기록과 맞지 않습니다.",
];

const LINE_BANK_OFFICER_LINES = [
  "상점 기록을 기준으로 대조하겠습니다.",
  "지금부터 답변은 접수 형식으로만 남깁니다.",
  "어느 진술을 정정합니까?",
  "두 진술은 같은 기록에 남길 수 없습니다.",
];

test("same-order.json validates against the storylet schema and integrity rules", () => {
  const storylet = loadStorylet("same-order");
  assert.equal(storylet.storyletId, "same-order");
  assert.equal(storylet.beats.length, 3);
  // Route coverage: all four canonical routes are defined.
  for (const route of ["clean_cover", "repair_recovery", "soft_report", "hard_inquest"] as const) {
    assert.ok(storylet.routes[route], `missing route ${route}`);
    assert.ok(storylet.routes[route].consequences.length >= 1);
    assert.match(storylet.routes[route].title, /[가-힣]/);
  }
});

test("prompts and choice lines are sourced verbatim from the Same Order packet", () => {
  const storylet = loadStorylet("same-order");
  for (const beat of storylet.beats) {
    assert.equal(beat.prompt, PACKET_PROMPTS[beat.promptId], `prompt drift for ${beat.promptId}`);
    // Each beat offers exactly one safe/uncertain/risky choice.
    const intents = beat.choices.map(c => c.intent).sort();
    assert.deepEqual(intents, [...CONVERSATION_CHOICE_INTENTS].sort());
  }
  // Specific packet lines.
  const routine = storylet.beats.find(b => b.beatId === "routine")!;
  assert.equal(routine.choices.find(c => c.intent === "safe/local")!.line, "네, 같은 걸로 부탁해요.");
  assert.equal(routine.choices.find(c => c.intent === "risky/weird")!.line, "오늘 처음 왔는데요.");
});

test("fallback lines are drawn from the dialogue line bank", () => {
  const storylet = loadStorylet("same-order");
  const clerkLines = storylet.fallbackLines.store_clerk ?? [];
  for (const line of LINE_BANK_CLERK_LINES) {
    assert.ok(clerkLines.includes(line), `clerk fallback missing line-bank line: ${line}`);
  }
  const officerLines = storylet.fallbackLines.station_officer ?? [];
  for (const line of LINE_BANK_OFFICER_LINES) {
    assert.ok(officerLines.includes(line), `officer fallback missing line-bank line: ${line}`);
  }
});

test("every why-line is Korean and every referenced signal has one", () => {
  const storylet = loadStorylet("same-order");
  for (const [key, value] of Object.entries(storylet.whyLines)) {
    assert.match(value, /[가-힣]/, `why-line for ${key} must be Korean`);
  }
  // hesitation threshold + signal exist.
  assert.equal(storylet.hesitation.thresholdMs, 6000);
  assert.ok(storylet.whyLines[storylet.hesitation.signal]);
});

test("parseStorylet rejects a storylet missing the risky gradient", () => {
  const storylet = loadStorylet("same-order");
  const broken = JSON.parse(JSON.stringify(storylet));
  // Duplicate the safe choice over the risky one -> gradient broken.
  broken.beats[0].choices[2].intent = "safe/local";
  assert.throws(() => parseStorylet(broken), /safe\/uncertain\/risky/);
});

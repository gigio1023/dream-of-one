import assert from "node:assert/strict";
import { test } from "bun:test";
import { loadStorylet, parseStorylet } from "../../src/runtime/storylet.js";

test("same-order production data contains constraints and outcomes, not dialogue scripts", () => {
  const storylet = loadStorylet("same-order");
  assert.equal(storylet.storyletId, "same-order");
  assert.equal(storylet.beats.length, 3);
  assert.match(storylet.scenePremise, /[가-힣]/);
  for (const beat of storylet.beats) {
    assert.match(beat.objective, /[가-힣]/);
    assert.ok(beat.sceneFacts.length > 0);
    const rawBeat = beat as unknown as Record<string, unknown>;
    assert.equal(rawBeat.choices, undefined);
    assert.equal(rawBeat.prompt, undefined);
    assert.equal(rawBeat.clerkResponse, undefined);
  }
  for (const route of ["clean_cover", "repair_recovery", "soft_report", "hard_inquest"] as const) {
    assert.match(storylet.routes[route].title, /[가-힣]/);
    assert.equal((storylet.routes[route] as unknown as Record<string, unknown>).consequences, undefined);
  }
});

test("every why-line is Korean and deterministic hesitation remains configured", () => {
  const storylet = loadStorylet("same-order");
  for (const [key, value] of Object.entries(storylet.whyLines)) {
    assert.match(value, /[가-힣]/, `why-line for ${key} must be Korean`);
  }
  assert.equal(storylet.hesitation.thresholdMs, 6000);
  assert.ok(storylet.whyLines[storylet.hesitation.signal]);
});

test("parseStorylet rejects authored choice sets in production content", () => {
  const storylet = loadStorylet("same-order");
  const broken = JSON.parse(JSON.stringify(storylet));
  broken.beats[0].choices = [
    { choiceId: "forbidden", line: "미리 쓴 선택지" },
  ];
  assert.throws(() => parseStorylet(broken), /unrecognized_keys|choices/i);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSameOrderPlayerComprehensionPlaytestPacket,
} from "../../src/runtime/same-order-player-comprehension-playtest.js";

test("Same Order playable evidence carries the blind comprehension playtest packet", () => {
  const artifactUrl = new URL("../../../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json", import.meta.url);
  const artifact = JSON.parse(readFileSync(artifactUrl, "utf8")) as {
    playability: {
      playerComprehensionPlaytestPacket?: ReturnType<typeof buildSameOrderPlayerComprehensionPlaytestPacket>;
    };
  };
  const packet = buildSameOrderPlayerComprehensionPlaytestPacket(artifact);

  assert.equal(packet.readyToRun, true);
  assert.equal(packet.externalBlockerClosed, false);
  assert.equal(packet.assignments.length, 3);
  assert.equal(packet.assignments.some(assignment => assignment.routeOrder.includes("inquest_opened")), true);
  assert.equal(packet.typedInputInstruction.includes("HUD input field"), true);
  const inquestCard = packet.routeRunCards.find(card => card.routeId === "inquest_opened");
  assert.equal(inquestCard?.playerActions.some(action => action.includes("wait about 12 seconds")), true);
  assert.equal(inquestCard?.playerActions.some(action => action.includes("press Enter")), true);
  assert.equal(inquestCard?.expectedVisibleEvidence.includes("delayed-answer record"), true);
  assert.equal(inquestCard?.expectedVisibleEvidence.includes("Station Officer cite-record ledger action"), true);
  assert.equal(packet.observationChecklist.length, 7);
  assert.equal(packet.observationChecklist.some(check => check.passSignal.includes("Station Officer") && check.passSignal.includes("cite")), true);
  assert.equal(packet.observationChecklist.some(check => check.id === "O7" && check.passSignal.includes("delayed-answer record")), true);
  assert.equal(packet.passThresholds.some(threshold => threshold.includes("delayed answer")), true);
  assert.equal(packet.questions.map(question => question.id).join(","), "C1,C2,C3,C4,C5,C6,C7");
  assert.deepEqual(artifact.playability.playerComprehensionPlaytestPacket, JSON.parse(JSON.stringify(packet)));
});

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { PerceptionPacket } from "../../src/contracts/types.js";
import {
  composeDecisionPrompt,
  listOrganizationTemplates,
  listRoleCards,
} from "../../src/policy/prompt-policy.js";

const thisDir = dirname(fileURLToPath(import.meta.url));
const snapshotDir = join(thisDir, "..", "snapshots", "prompt-policy");

function buildPacket(npcId: string, organization: string, role: string): PerceptionPacket {
  return {
    sessionId: "session-role-pack",
    npcId,
    landmarkId: organization,
    nearbyActors: ["player", "npc-observer-1", "npc-observer-2"],
    recentEvents: ["checklist_start", "cover_test_observed"],
    organizationContext: {
      organization,
      role,
      pressureBand: "moderate",
    },
    playerSignals: {
      suspicion: 0.35,
      exposure: 0.12,
      lastSpeechAct: "INQUIRE",
    },
  };
}

test("role card pack has 8-12 entries and valid template mapping", () => {
  const roleCards = listRoleCards();
  const templates = listOrganizationTemplates();
  const templateIds = new Set(templates.map(template => template.id));

  assert.ok(roleCards.length >= 8);
  assert.ok(roleCards.length <= 12);
  assert.equal(templates.length, 4);

  for (const roleCard of roleCards) {
    assert.ok(templateIds.has(roleCard.organizationId), `missing template for ${roleCard.npcId}`);
    assert.ok(roleCard.authority.length > 0, `authority missing for ${roleCard.npcId}`);
    assert.ok(roleCard.limits.length > 0, `limits missing for ${roleCard.npcId}`);
  }
});

test("prompt assembly is deterministic and uses mapped role card", () => {
  const packetA = buildPacket("Store_Clerk_A", "Store", "Clerk");
  const packetB = {
    ...packetA,
    organizationContext: {
      role: "Clerk",
      pressureBand: "moderate",
      organization: "Store",
    },
    playerSignals: {
      lastSpeechAct: "INQUIRE",
      exposure: 0.12,
      suspicion: 0.35,
    },
  };

  const resultA = composeDecisionPrompt(packetA, { promptCharBudget: 5000 });
  const resultB = composeDecisionPrompt(packetB, { promptCharBudget: 5000 });

  assert.equal(resultA.policy.usedFallbackRoleCard, false);
  assert.equal(resultA.policy.roleCard.npcId, "Store_Clerk_A");
  assert.equal(resultA.prompt, resultB.prompt);
  assert.match(resultA.prompt, /Organization template:/);
  assert.match(resultA.prompt, /Role card:/);
  assert.match(resultA.prompt, /Input packet:/);
});

test("representative prompts match snapshots", () => {
  const cases = [
    { name: "store-clerk", packet: buildPacket("Store_Clerk_A", "Store", "Clerk") },
    { name: "studio-pm", packet: buildPacket("Studio_PM", "Studio", "PM") },
    { name: "park-caretaker", packet: buildPacket("Park_Caretaker", "Park", "Caretaker") },
    { name: "station-officer", packet: buildPacket("Station_Officer", "Station", "Officer") },
  ];

  for (const item of cases) {
    const expected = readFileSync(join(snapshotDir, `${item.name}.txt`), "utf8");
    const actual = composeDecisionPrompt(item.packet, { promptCharBudget: 5000 }).prompt;
    assert.equal(actual, expected, `snapshot mismatch: ${item.name}`);
  }
});

test("prompt budget guard bounds output length", () => {
  const longString = "x".repeat(320);
  const largePacket: PerceptionPacket = {
    sessionId: "session-budget",
    npcId: "Station_Investigator",
    landmarkId: "Station",
    nearbyActors: Array.from({ length: 20 }, (_, idx) => `actor-${idx}-${longString}`),
    recentEvents: Array.from({ length: 20 }, (_, idx) => `event-${idx}-${longString}`),
    organizationContext: {
      organization: "Station",
      role: "Investigator",
      reportSummary: longString,
      openCases: longString,
      witnessHints: longString,
      escalationHistory: longString,
    },
    playerSignals: {
      suspicion: 0.82,
      exposure: 0.64,
      speechContext: longString,
      movementContext: longString,
      checklistContext: longString,
    },
  };

  const result = composeDecisionPrompt(largePacket, { promptCharBudget: 420 });

  assert.ok(result.prompt.length <= 420);
  assert.equal(result.trimmed, true);
  assert.ok(result.compactionLevel >= 1);
});

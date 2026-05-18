import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const liveDispatchUrl = new URL(
  "../../../../data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json",
  import.meta.url,
);
const liveThreadContinuityUrl = new URL(
  "../../../../data/evidence/godot/live-provider-dispatch/dre_171_live_provider_thread_continuity_smoke.json",
  import.meta.url,
);

function readArtifact(url: URL): Record<string, unknown> {
  return JSON.parse(readFileSync(url, "utf8")) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  assert.equal(Array.isArray(value), true);
  return value as Array<Record<string, unknown>>;
}

function asStringArray(value: unknown): string[] {
  assert.equal(Array.isArray(value), true);
  const values = value as unknown[];
  assert.equal(values.every(item => typeof item === "string"), true);
  return values as string[];
}

test("Godot live provider dispatch evidence carries self-contained NPC-to-NPC observation proof", () => {
  const artifact = readArtifact(liveDispatchUrl);
  const checks = asRecord(artifact.checks);
  const proofs = asRecord(artifact.proofs);
  const providerPackets = asRecord(checks.providerPackets);
  const waitingCustomerPacket = asRecord(providerPackets.waitingCustomer);
  const liveDecisions = asRecordArray(checks.liveDecisions);
  const route = asRecord(checks.playableRoute);

  assert.equal(artifact.ok, true);
  assert.equal(artifact.runId, "dre-live-provider-dispatch-smoke");
  assert.equal(proofs.providerMode, "openai-codex");
  assert.equal(proofs.selectedModel, "gpt-5.4-mini");
  assert.equal(proofs.usedFallback, false);
  assert.equal(proofs.npcToNpcLiveObservation, true);
  assert.equal(proofs.productProviderStateChanged, false);
  assert.equal(proofs.providerDecisionMutatedRouteState, false);
  assert.equal(proofs.fallbackParityRouteOutcome, "clean_cover");
  assert.equal(proofs.fallbackParitySessionOutcome, "cover_held");
  assert.ok(Number(proofs.totalEstimatedCostUsd) <= 0.01);
  assert.ok(Number(proofs.totalActualTokens) > 0);

  const observationEvent = String(proofs.npcToNpcLiveObservationEvent);
  assert.match(observationEvent, /^live_utterance:NPC_Store_Clerk:/);
  assert.equal(waitingCustomerPacket.expectedLiveObservation, observationEvent);
  assert.equal(waitingCustomerPacket.hasExpectedLiveObservation, true);
  assert.ok(asStringArray(waitingCustomerPacket.recentEvents).includes(observationEvent));
});

test("Godot live provider dispatch evidence records both NPC decisions and observed event text", () => {
  const artifact = readArtifact(liveDispatchUrl);
  const checks = asRecord(artifact.checks);
  const proofs = asRecord(artifact.proofs);
  const providerPackets = asRecord(checks.providerPackets);
  const waitingCustomerPacket = asRecord(providerPackets.waitingCustomer);
  const liveDecisions = asRecordArray(checks.liveDecisions);
  const recentEvents = asStringArray(waitingCustomerPacket.recentEvents);

  assert.deepEqual(liveDecisions.map(decision => decision.npcId), [
    "NPC_Store_Clerk",
    "NPC_Waiting_Customer",
  ]);
  assert.equal(liveDecisions.every(decision => decision.transport === "codex"), true);
  assert.equal(liveDecisions.every(decision => decision.usedFallback === false), true);
  assert.equal(liveDecisions.every(decision => asRecord(decision.providerUsage).model === "gpt-5.4-mini"), true);

  const observationEvent = String(proofs.npcToNpcLiveObservationEvent);
  assert.ok(recentEvents.includes(observationEvent));
  assert.equal(recentEvents.some(event => event.startsWith("ledger:")), true);
  assert.equal(waitingCustomerPacket.npcId, "NPC_Waiting_Customer");
  assert.equal(waitingCustomerPacket.role, "waiting_customer");
});

test("Godot live provider thread-continuity evidence uses local memory without provider storage", () => {
  const artifact = readArtifact(liveThreadContinuityUrl);
  const checks = asRecord(artifact.checks);
  const readiness = asRecord(checks.readiness);
  const provider = asRecord(asRecord(readiness.provider).openAi);
  const proofs = asRecord(artifact.proofs);

  assert.equal(artifact.ok, true);
  assert.equal(provider.provider, "openai-codex");
  assert.equal(provider.selectedModel, "gpt-5.4-mini");
  assert.equal(provider.storeResponses, false);
  assert.equal(proofs.sameSessionNpc, true);
  assert.equal(proofs.firstTransport, "codex");
  assert.equal(proofs.secondTransport, "codex-reply");
  assert.equal(proofs.threadContinuity, true);
  assert.equal(proofs.usedFallback, false);
  assert.equal(proofs.providerDecisionMutatedRouteState, false);
  assert.ok(Number(proofs.totalEstimatedCostUsd) <= 0.01);
  assert.ok(Number(proofs.totalActualTokens) > 0);
});

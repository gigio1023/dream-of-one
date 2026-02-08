import assert from "node:assert/strict";
import test from "node:test";

import { DefaultCodexBroker } from "../../src/broker/codex-broker.js";
import type { CodexToolGateway, CodexToolResponse } from "../../src/broker/codex-tool-gateway.js";
import { InMemoryThreadStore } from "../../src/broker/thread-store.js";
import type { ActionType, DecisionEnvelope, PerceptionPacket } from "../../src/contracts/types.js";

function buildPacket(runId: string): PerceptionPacket {
  return {
    sessionId: `session-${runId}`,
    npcId: `npc-${runId}`,
    landmarkId: "Store",
    nearbyActors: ["player"],
    recentEvents: ["coverage_probe"],
    organizationContext: { organization: "Store", role: "Clerk" },
    playerSignals: { suspicion: 0.2, exposure: 0.1 },
  };
}

class ScriptedGateway implements CodexToolGateway {
  private readonly threadId: string;
  private codexUsed = false;
  private readonly actionSequence: ActionType[];
  private replyCursor = 1;

  constructor(runId: string, actionSequence: ActionType[]) {
    this.threadId = `thread-${runId}`;
    this.actionSequence = actionSequence;
  }

  async codex(_prompt: string): Promise<CodexToolResponse> {
    if (this.codexUsed) {
      throw new Error("codex called more than once for a single run");
    }
    this.codexUsed = true;
    return this.buildResponse(0);
  }

  async codexReply(threadId: string, _prompt: string): Promise<CodexToolResponse> {
    if (threadId !== this.threadId) {
      throw new Error(`unexpected thread id: ${threadId}`);
    }
    const index = this.replyCursor;
    this.replyCursor += 1;
    return this.buildResponse(index);
  }

  private buildResponse(index: number): CodexToolResponse {
    const actionType = this.actionSequence[Math.min(index, this.actionSequence.length - 1)];
    return {
      threadId: this.threadId,
      content: JSON.stringify({
        npcId: `npc-${this.threadId.replace("thread-", "")}`,
        actionType,
        reasonCodes: [`trajectory:${actionType.toLowerCase()}`],
        confidence: 0.8,
      }),
    };
  }
}

function fingerprintTrajectory(decisions: DecisionEnvelope[]): string {
  const actionSequence = decisions
    .map(decision => `${decision.intent.actionType}:${decision.intent.reasonCodes[0] ?? "-"}`)
    .join(">");

  const transportHistogram = decisions.reduce<Record<string, number>>((acc, decision) => {
    const key = decision.meta.transport;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const sortedHistogram = Object.entries(transportHistogram)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([transport, count]) => `${transport}:${count}`)
    .join(",");

  const fallbackCount = decisions.filter(decision => decision.meta.usedFallback).length;
  return `actions=${actionSequence}|transport=${sortedHistogram}|fallback=${fallbackCount}`;
}

function evaluateTrajectoryDiversity(runs: DecisionEnvelope[][]): {
  pass: boolean;
  distinctCount: number;
  fingerprints: string[];
} {
  const fingerprints = runs.map(fingerprintTrajectory);
  const distinctCount = new Set(fingerprints).size;
  return {
    pass: distinctCount >= 2,
    distinctCount,
    fingerprints,
  };
}

async function runTrajectory(runId: string, actionSequence: ActionType[]): Promise<DecisionEnvelope[]> {
  const gateway = new ScriptedGateway(runId, actionSequence);
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());
  const packet = buildPacket(runId);
  const decisions: DecisionEnvelope[] = [];

  for (let i = 0; i < actionSequence.length; i++) {
    const decision = await broker.decide(packet);
    decisions.push(decision);
  }

  return decisions;
}

test("trajectory diversity gate passes when at least one run differs", async () => {
  const runInputs: ActionType[][] = [
    ["Observe", "Work", "Ask", "Report", "Observe"],
    ["Observe", "Talk", "Talk", "Work", "Idle"],
    ["Observe", "Escort", "Report", "Observe", "Idle"],
  ];

  const runs = await Promise.all(runInputs.map((sequence, index) => runTrajectory(`run-${index + 1}`, sequence)));
  const gate = evaluateTrajectoryDiversity(runs);

  assert.equal(gate.pass, true, `Expected non-identical trajectories.\n${gate.fingerprints.join("\n")}`);
  assert.ok(gate.distinctCount >= 2);

  for (const run of runs) {
    assert.equal(run[0].meta.transport, "codex");
    assert.ok(run.slice(1).every(step => step.meta.transport === "codex-reply"));
  }

  console.log(`[TrajectoryGate] PASS distinct=${gate.distinctCount}/3\n${gate.fingerprints.join("\n")}`);
});

test("trajectory diversity gate fails when all runs are identical", async () => {
  const identicalSequence: ActionType[] = ["Observe", "Work", "Ask", "Report", "Observe"];
  const runs = await Promise.all([
    runTrajectory("same-1", identicalSequence),
    runTrajectory("same-2", identicalSequence),
    runTrajectory("same-3", identicalSequence),
  ]);

  const gate = evaluateTrajectoryDiversity(runs);

  assert.equal(gate.pass, false, "Expected gate failure for identical trajectories");
  assert.equal(gate.distinctCount, 1);
});

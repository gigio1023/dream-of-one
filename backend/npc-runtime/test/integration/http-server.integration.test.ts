import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";

import { startHttpServer } from "../../src/api/http-server.js";
import type { PerceptionPacket } from "../../src/contracts/types.js";
import type { RuntimeConfig } from "../../src/config.js";
import type { CodexBroker } from "../../src/broker/codex-broker.js";
import { DecisionService } from "../../src/runtime/decision-service.js";
import { ReliabilityTelemetry } from "../../src/runtime/reliability-telemetry.js";

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("failed to resolve free port")));
        return;
      }
      const { port } = address;
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function closeServer(server: { close: (cb: (err?: Error) => void) => void }): Promise<void> {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }
      resolve(undefined);
    });
  });
}

function buildPacket(npcId: string): PerceptionPacket {
  return {
    sessionId: "session-smoke",
    npcId,
    landmarkId: "Store",
    nearbyActors: ["player"],
    recentEvents: ["ticket_issued"],
    organizationContext: { organization: "Store", role: "Clerk" },
    playerSignals: { suspicion: 0.4, exposure: 0.2 },
  };
}

test("decision API smoke handles two NPC IDs and emits request/response logs", async () => {
  const port = await getFreePort();
  const config: RuntimeConfig = {
    host: "127.0.0.1",
    port,
    codexCommand: "unused",
    codexArgs: [],
    codexTimeoutMs: 1000,
    codexGlobalBudgetMs: 2000,
    promptCharBudget: 3600,
    threadStorePath: "data/thread-store.json",
  };

  const broker: CodexBroker = {
    async decide(packet) {
      return {
        intent: {
          npcId: packet.npcId,
          actionType: "Observe",
          reasonCodes: ["smoke"],
          confidence: 0.75,
        },
        meta: {
          usedFallback: false,
          threadId: `thread-${packet.npcId}`,
          transport: "codex",
        },
      };
    },
  };

  const telemetry = new ReliabilityTelemetry();
  const service = new DecisionService(broker, telemetry);
  const originalLog = console.log;
  const capturedLogs: string[] = [];
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  const server = startHttpServer(config, service, telemetry);

  try {
    const payloadNpc1 = buildPacket("npc-1");
    const payloadNpc2 = buildPacket("npc-2");

    const res1 = await fetch(`http://${config.host}:${config.port}/v1/npc/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadNpc1),
    });
    const body1 = await res1.json();

    const res2 = await fetch(`http://${config.host}:${config.port}/v1/npc/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadNpc2),
    });
    const body2 = await res2.json();

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(body1.meta.threadId, "thread-npc-1");
    assert.equal(body2.meta.threadId, "thread-npc-2");

    const jsonLogs = capturedLogs.flatMap(line => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });

    const requestLogs = jsonLogs.filter(log => log.event === "npc_decision_request");
    const responseLogs = jsonLogs.filter(log => log.event === "npc_decision_response");

    assert.equal(requestLogs.length, 2);
    assert.equal(responseLogs.length, 2);
    assert.deepEqual(
      requestLogs.map(log => log.npcId).sort(),
      ["npc-1", "npc-2"],
    );
    assert.deepEqual(
      responseLogs.map(log => log.npcId).sort(),
      ["npc-1", "npc-2"],
    );

    for (const log of requestLogs) {
      assert.equal(log.threadId, null);
      assert.equal(log.latencyMs, 0);
    }

    for (const log of responseLogs) {
      assert.equal(typeof log.threadId, "string");
      assert.equal(typeof log.latencyMs, "number");
      assert.ok((log.latencyMs as number) >= 0);
    }

    const metricsRes = await fetch(`http://${config.host}:${config.port}/v1/npc/metrics`);
    const metrics = await metricsRes.json();
    assert.equal(metricsRes.status, 200);
    assert.equal(metrics.counters.decisionRequests, 2);
    assert.equal(metrics.counters.fallbackResponses, 0);
  } finally {
    await closeServer(server);
    console.log = originalLog;
  }
});

test("response log includes deterministic reject reason on fallback", async () => {
  const port = await getFreePort();
  const config: RuntimeConfig = {
    host: "127.0.0.1",
    port,
    codexCommand: "unused",
    codexArgs: [],
    codexTimeoutMs: 1000,
    codexGlobalBudgetMs: 2000,
    promptCharBudget: 3600,
    threadStorePath: "data/thread-store.json",
  };

  const broker: CodexBroker = {
    async decide(packet) {
      return {
        intent: {
          npcId: packet.npcId,
          actionType: "Observe",
          reasonCodes: ["fallback:policy_reject_non_codex_path"],
          confidence: 0,
        },
        meta: {
          usedFallback: true,
          reason: "policy_reject_non_codex_path",
          transport: "fallback",
        },
      };
    },
  };

  const telemetry = new ReliabilityTelemetry();
  const service = new DecisionService(broker, telemetry);
  const originalLog = console.log;
  const capturedLogs: string[] = [];
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  const server = startHttpServer(config, service, telemetry);

  try {
    const res = await fetch(`http://${config.host}:${config.port}/v1/npc/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPacket("npc-reject")),
    });
    assert.equal(res.status, 200);

    const jsonLogs = capturedLogs.flatMap(line => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });

    const responseLog = jsonLogs.find(log => log.event === "npc_decision_response");
    assert.ok(responseLog, "expected npc_decision_response log");
    assert.equal(responseLog.reason, "policy_reject_non_codex_path");
    assert.equal(responseLog.transport, "fallback");
    assert.equal(responseLog.usedFallback, true);
    assert.equal(responseLog.threadId, null);

    const metricsRes = await fetch(`http://${config.host}:${config.port}/v1/npc/metrics`);
    const metrics = await metricsRes.json();
    assert.equal(metricsRes.status, 200);
    assert.equal(metrics.counters.fallbackResponses, 1);
    assert.equal(metrics.counters.decisionRequests, 1);
  } finally {
    await closeServer(server);
    console.log = originalLog;
  }
});

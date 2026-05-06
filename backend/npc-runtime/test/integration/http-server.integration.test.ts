import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { startHttpServer } from "../../src/api/http-server.js";
import type { PerceptionPacket } from "../../src/contracts/types.js";
import type { RuntimeConfig } from "../../src/config.js";
import type { CodexBroker } from "../../src/broker/codex-broker.js";
import { DecisionService } from "../../src/runtime/decision-service.js";
import { RuntimeTelemetryCollector } from "../../src/runtime/telemetry.js";

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

function buildConfig(port: number, overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    host: "127.0.0.1",
    port,
    proposalProvider: "codex-cli",
    codexCommand: "unused",
    codexArgs: [],
    codexTimeoutMs: 1000,
    openAiProposal: {
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      preferredModel: "gpt-5.4-nano",
      fallbackModels: ["gpt-5-nano"],
      modelCheckTimeoutMs: 1000,
      requestTimeoutMs: 1000,
      maxOutputTokens: 700,
    },
    decisionDeadlineMs: 1000,
    workspaceRootPath: join(tmpdir(), `npc-runtime-workspaces-${port}`),
    threadStorePath: join(tmpdir(), `npc-runtime-thread-store-${port}.json`),
    ...overrides,
  };
}

function buildNoopBroker(): CodexBroker {
  return {
    async decide(packet) {
      return {
        intent: {
          npcId: packet.npcId,
          actionType: "Observe",
          reasonCodes: ["noop"],
          confidence: 1,
        },
        meta: {
          usedFallback: false,
          threadId: "thread-noop",
          transport: "codex",
        },
      };
    },
  };
}

test("readiness endpoint returns ready when command resolves and storage paths are accessible", async () => {
  const port = await getFreePort();
  const threadStoreDir = await mkdtemp(join(tmpdir(), "npc-runtime-ready-"));
  const config = buildConfig(port, {
    codexCommand: process.execPath,
    threadStorePath: join(threadStoreDir, "thread-store.json"),
  });
  const server = startHttpServer(config, new DecisionService(buildNoopBroker()));

  try {
    const res = await fetch(`http://${config.host}:${config.port}/health/ready`);
    const body = (await res.json()) as {
      status: string;
      reasons: string[];
      checks: {
        codexCommand: { ok: boolean };
        threadStorePath: { ok: boolean };
        workspaceRootPath: { ok: boolean };
      };
    };

    assert.equal(res.status, 200);
    assert.equal(body.status, "ready");
    assert.deepEqual(body.reasons, []);
    assert.equal(body.checks.codexCommand.ok, true);
    assert.equal(body.checks.threadStorePath.ok, true);
    assert.equal(body.checks.workspaceRootPath.ok, true);
  } finally {
    await closeServer(server);
    await rm(threadStoreDir, { recursive: true, force: true });
  }
});

test("readiness endpoint returns deterministic explicit reasons when not ready", async () => {
  const port = await getFreePort();
  const tempDir = await mkdtemp(join(tmpdir(), "npc-runtime-not-ready-"));
  const blockedParent = join(tempDir, "blocked-parent");
  await writeFile(blockedParent, "not-a-directory", "utf8");

  const config = buildConfig(port, {
    codexCommand: "definitely-missing-codex-command",
    threadStorePath: join(blockedParent, "thread-store.json"),
    workspaceRootPath: join(blockedParent, "workspaces"),
  });
  const server = startHttpServer(config, new DecisionService(buildNoopBroker()));

  try {
    const res = await fetch(`http://${config.host}:${config.port}/health/ready`);
    const body = (await res.json()) as {
      status: string;
      reasons: string[];
      checks: {
        codexCommand: { ok: boolean; reason?: string };
        threadStorePath: { ok: boolean; reason?: string };
        workspaceRootPath: { ok: boolean; reason?: string };
      };
    };

    assert.equal(res.status, 503);
    assert.equal(body.status, "not_ready");
    assert.deepEqual(
      body.reasons,
      ["codex_command_not_resolvable", "thread_store_path_not_accessible", "workspace_root_path_not_accessible"],
    );
    assert.equal(body.checks.codexCommand.ok, false);
    assert.equal(body.checks.codexCommand.reason, "codex_command_not_resolvable");
    assert.equal(body.checks.threadStorePath.ok, false);
    assert.equal(body.checks.threadStorePath.reason, "thread_store_path_not_accessible");
    assert.equal(body.checks.workspaceRootPath.ok, false);
    assert.equal(body.checks.workspaceRootPath.reason, "workspace_root_path_not_accessible");
  } finally {
    await closeServer(server);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("liveness endpoint remains lightweight", async () => {
  const port = await getFreePort();
  const config = buildConfig(port);
  const server = startHttpServer(config, new DecisionService(buildNoopBroker()));

  try {
    const res = await fetch(`http://${config.host}:${config.port}/health`);
    const body = (await res.json()) as Record<string, unknown>;

    assert.equal(res.status, 200);
    assert.deepEqual(body, {
      status: "ok",
      service: "npc-runtime",
    });
  } finally {
    await closeServer(server);
  }
});

test("queue health endpoint returns mailbox and scheduler snapshot", async () => {
  const port = await getFreePort();
  const config = buildConfig(port);
  const service = new DecisionService(buildNoopBroker());
  const server = startHttpServer(config, service, undefined, undefined, undefined, () => service.getSchedulerSnapshot());

  try {
    const res = await fetch(`http://${config.host}:${config.port}/health/queue`);
    const body = (await res.json()) as {
      status: string;
      mailbox: Record<string, unknown>;
      scheduler: { global: { cap: number } };
    };

    assert.equal(res.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(typeof body.mailbox, "object");
    assert.equal(body.scheduler.global.cap, 4);
  } finally {
    await closeServer(server);
  }
});

test("decision API smoke handles two NPC IDs and emits request/response logs", async () => {
  const port = await getFreePort();
  const config = buildConfig(port);

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

  const service = new DecisionService(broker);
  const originalLog = console.log;
  const capturedLogs: string[] = [];
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  const server = startHttpServer(config, service);

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
      assert.equal(typeof log.mailbox, "object");
      assert.ok(log.mailbox !== null);
      assert.equal(log.warningTier, "reference");
      assert.equal(log.reasonCategory, "none");
    }
  } finally {
    await closeServer(server);
    console.log = originalLog;
  }
});

test("response log includes deterministic reject reason on fallback", async () => {
  const port = await getFreePort();
  const config = buildConfig(port);

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

  const service = new DecisionService(broker);
  const originalLog = console.log;
  const capturedLogs: string[] = [];
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  const server = startHttpServer(config, service);

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
    assert.equal(responseLog.reasonCategory, "policy");
    assert.equal(responseLog.warningTier, "blocking");
    assert.equal(responseLog.transport, "fallback");
    assert.equal(responseLog.usedFallback, true);
    assert.equal(responseLog.threadId, null);
    assert.equal(typeof responseLog.mailbox, "object");
  } finally {
    await closeServer(server);
    console.log = originalLog;
  }
});

test("telemetry endpoints return decision evidence pack artifacts", async () => {
  const port = await getFreePort();
  const config = buildConfig(port);
  const telemetry = new RuntimeTelemetryCollector({ maxRecords: 200 });
  const service = new DecisionService(buildNoopBroker());
  const server = startHttpServer(config, service, undefined, undefined, telemetry, () => service.getSchedulerSnapshot());

  try {
    const decisionResponse = await fetch(`http://${config.host}:${config.port}/v1/npc/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPacket("npc-telemetry")),
    });
    assert.equal(decisionResponse.status, 200);

    const eventsResponse = await fetch(`http://${config.host}:${config.port}/v1/telemetry/events?limit=5`);
    assert.equal(eventsResponse.status, 200);
    const eventsPayload = (await eventsResponse.json()) as { records: Array<Record<string, unknown>> };
    assert.ok(eventsPayload.records.length >= 1);

    const evidenceResponse = await fetch(`http://${config.host}:${config.port}/v1/telemetry/evidence-pack`);
    assert.equal(evidenceResponse.status, 200);
    const evidencePayload = (await evidenceResponse.json()) as {
      decisionSummary: { total: number };
      countsByType: { decision_cycle: number };
    };
    assert.ok(evidencePayload.decisionSummary.total >= 1);
    assert.ok(evidencePayload.countsByType.decision_cycle >= 1);
  } finally {
    await closeServer(server);
  }
});

test("aborted client request is logged as dropped response without response evidence noise", async () => {
  const port = await getFreePort();
  const config = buildConfig(port, { decisionDeadlineMs: 2000 });

  const broker: CodexBroker = {
    async decide(packet) {
      await new Promise(resolve => setTimeout(resolve, 120));
      return {
        intent: {
          npcId: packet.npcId,
          actionType: "Observe",
          reasonCodes: ["delayed"],
          confidence: 0.5,
        },
        meta: {
          usedFallback: false,
          threadId: `thread-${packet.npcId}`,
          transport: "codex",
        },
      };
    },
  };

  const service = new DecisionService(broker, { maxBrokerInFlight: 1 });
  const originalLog = console.log;
  const capturedLogs: string[] = [];
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
  };

  const server = startHttpServer(config, service);

  try {
    const controller = new AbortController();
    const request = fetch(`http://${config.host}:${config.port}/v1/npc/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPacket("npc-abort")),
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 10);

    await assert.rejects(request, error => {
      const maybeError = error as Error | undefined;
      return !!maybeError && (maybeError.name === "AbortError" || /aborted/i.test(maybeError.message));
    });
    await new Promise(resolve => setTimeout(resolve, 180));

    const jsonLogs = capturedLogs.flatMap(line => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });

    const requestLogs = jsonLogs.filter(log => log.event === "npc_decision_request");
    const responseLogs = jsonLogs.filter(log => log.event === "npc_decision_response");
    const droppedLogs = jsonLogs.filter(log => log.event === "npc_decision_response_dropped");

    assert.equal(requestLogs.length, 1);
    assert.equal(responseLogs.length, 0);
    assert.equal(droppedLogs.length, 1);
    assert.equal(droppedLogs[0]?.droppedReason, "client_aborted");
    assert.equal(droppedLogs[0]?.npcId, "npc-abort");
  } finally {
    await closeServer(server);
    console.log = originalLog;
  }
});

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import type { Bot, Plugin } from "mineflayer";
import type { RuntimeConfig } from "../../src/config.js";
import { awaitLifecycleGates } from "../../src/runtime/lifecycle-gates.js";
import { composeMineflayerPlugins } from "../../src/runtime/plugin-composer.js";
import { MineflayerRuntime } from "../../src/runtime/mineflayer-runtime.js";

function buildConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    host: "127.0.0.1",
    port: 8787,
    codexCommand: "node",
    codexArgs: [],
    codexTimeoutMs: 2000,
    maxBrokerInFlight: 2,
    decisionDeadlineMs: 1500,
    workspaceRootPath: "data/workspaces",
    threadStorePath: "data/thread-store.json",
    mineflayerEnabled: true,
    mineflayerHost: "127.0.0.1",
    mineflayerPort: 25565,
    mineflayerUsername: "npc-runtime-bot",
    mineflayerPassword: undefined,
    mineflayerAuth: "offline",
    mineflayerVersion: undefined,
    mineflayerLifecycleTimeoutMs: 500,
    ...overrides,
  };
}

class FakeBot extends EventEmitter {
  public readonly _client = new EventEmitter();

  private readonly loadedPlugins: Plugin[] = [];

  hasPlugin(plugin: Plugin): boolean {
    return this.loadedPlugins.includes(plugin);
  }

  loadPlugin(plugin: Plugin): void {
    if (!this.hasPlugin(plugin)) {
      this.loadedPlugins.push(plugin);
    }
  }

  loadPlugins(plugins: Plugin[]): void {
    for (const plugin of plugins) {
      this.loadPlugin(plugin);
    }
  }

  quit(reason?: string): void {
    this.emit("end", reason ?? "quit");
  }
}

test("awaitLifecycleGates returns ready on connect->inject_allowed->login->game->spawn", async () => {
  const source = new EventEmitter();
  const resultPromise = awaitLifecycleGates(source, { timeoutMs: 300 });

  source.emit("connect");
  source.emit("inject_allowed");
  source.emit("login");
  source.emit("game");
  source.emit("spawn");

  const result = await resultPromise;
  assert.equal(result.status, "ready");
  assert.deepEqual(result.completedGates, [
    "transport_connected",
    "plugin_injection_allowed",
    "login_ready",
    "game_ready",
    "spawn_ready",
  ]);
  assert.deepEqual(result.missingGates, []);
});

test("awaitLifecycleGates returns deterministic timeout failure on missing gate", async () => {
  const source = new EventEmitter();
  const resultPromise = awaitLifecycleGates(source, { timeoutMs: 30 });

  source.emit("connect");
  source.emit("inject_allowed");
  source.emit("login");
  source.emit("game");

  const result = await resultPromise;
  assert.equal(result.status, "not_ready");
  assert.equal(result.reasonCode, "LIFECYCLE_GATE_TIMEOUT");
  assert.equal(result.reasonCategory, "timeout");
  assert.equal(result.failedGate, "spawn_ready");
});

test("composeMineflayerPlugins deduplicates by function identity and loaded state", () => {
  const fakeBot = new FakeBot();
  const pluginA = (() => {}) as Plugin;
  const pluginB = (() => {}) as Plugin;

  fakeBot.loadPlugin(pluginA);
  const report = composeMineflayerPlugins(fakeBot as unknown as Bot, [
    { name: "pluginA-already", plugin: pluginA },
    { name: "pluginA-duplicate", plugin: pluginA },
    { name: "pluginB-disabled", plugin: pluginB, enabled: false },
    { name: "pluginB", plugin: pluginB },
  ]);

  assert.deepEqual(report.loaded, ["pluginB"]);
  assert.deepEqual(
    report.skipped.map(entry => `${entry.name}:${entry.reason}`).sort(),
    [
      "pluginA-already:already_loaded",
      "pluginA-duplicate:duplicate",
      "pluginB-disabled:disabled",
    ],
  );
});

test("MineflayerRuntime starts with fake bot and reaches ready state", async () => {
  const fakeBot = new FakeBot();
  const events: string[] = [];

  const runtime = new MineflayerRuntime(
    buildConfig(),
    {
      createBot: () => fakeBot as unknown as Bot,
      onEvent: event => {
        events.push(event.eventName);
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    },
  );

  const startPromise = runtime.start();
  fakeBot._client.emit("connect");
  fakeBot.emit("inject_allowed");
  fakeBot.emit("login");
  fakeBot.emit("game");
  fakeBot.emit("spawn");

  const result = await startPromise;
  assert.equal(result?.status, "ready");
  assert.ok(runtime.getActionRunner());
  assert.ok(events.includes("spawn"));

  await runtime.stop("test_shutdown");
  assert.equal(runtime.getState().started, false);
});

test("MineflayerRuntime does not start when disabled", async () => {
  let createCalled = false;
  const runtime = new MineflayerRuntime(
    buildConfig({ mineflayerEnabled: false }),
    {
      createBot: () => {
        createCalled = true;
        return new FakeBot() as unknown as Bot;
      },
    },
  );

  const result = await runtime.start();
  assert.equal(result, undefined);
  assert.equal(createCalled, false);
});

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { Bot } from "mineflayer";
import { createMineflayerEventNormalizer } from "../../src/runtime/event-normalizer.js";

class FakeBot extends EventEmitter {}

test("event normalizer emits structured lifecycle/world/chat/action/error events", () => {
  const bot = new FakeBot();
  const captured: Array<{ kind: string; eventName: string; payload: Record<string, unknown> }> = [];
  const now = new Date("2026-02-17T00:00:00.000Z");

  const handle = createMineflayerEventNormalizer(bot as unknown as Bot, {
    now: () => now,
    onEvent: event => {
      captured.push({
        kind: event.kind,
        eventName: event.eventName,
        payload: event.payload,
      });
    },
  });

  bot.emit("spawn");
  bot.emit("blockUpdate", { position: { x: 1, y: 64, z: 1 } }, { position: { x: 2, y: 64, z: 2 }, name: "stone", type: 1 });
  bot.emit("chat", "npc-1", "hello", "chat.type.text");
  bot.emit("diggingCompleted", { id: 1 });
  bot.emit("error", new Error("boom"));

  handle.detach();

  assert.equal(captured.length, 5);
  assert.deepEqual(
    captured.map(entry => entry.kind),
    ["lifecycle", "world", "chat", "action", "error"],
  );
  assert.equal(captured[1].payload.newBlockName, "stone");
  assert.equal(captured[2].payload.message, "hello");
  assert.equal(captured[4].payload.message, "boom");
});

test("event normalizer detach removes listeners", () => {
  const bot = new FakeBot();
  let callCount = 0;
  const handle = createMineflayerEventNormalizer(bot as unknown as Bot, {
    onEvent: () => {
      callCount += 1;
    },
  });

  bot.emit("spawn");
  handle.detach();
  bot.emit("spawn");
  bot.emit("chat", "npc-1", "message");

  assert.equal(callCount, 1);
});

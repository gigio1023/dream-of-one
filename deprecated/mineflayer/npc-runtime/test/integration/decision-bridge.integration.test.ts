import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { Bot } from "mineflayer";
import type { DecisionEnvelope, NpcIntent } from "../../src/contracts/types.js";
import { MineflayerActionRunner } from "../../src/runtime/action-runner.js";
import { dispatchDecisionToMineflayer, mapIntentToMineflayerCommand } from "../../src/runtime/decision-bridge.js";

class FakeActionBot extends EventEmitter {
  public heldItem: { name: string } | null = { name: "stone" };
  public readonly sentChats: string[] = [];

  canDigBlock(block: unknown): boolean {
    return !!block;
  }

  digTime(block: unknown): number {
    const maybe = block as { digTime?: number };
    return maybe?.digTime ?? 50;
  }

  async dig(block: unknown): Promise<void> {
    setTimeout(() => {
      this.emit("diggingCompleted", block);
    }, 5);
  }

  stopDigging(): void {
    this.emit("diggingAborted", null);
  }

  async placeBlock(referenceBlock: unknown): Promise<void> {
    setTimeout(() => {
      this.emit("blockPlaced", referenceBlock);
    }, 5);
  }

  async placeEntity(): Promise<unknown> {
    const entity = { id: 77, name: "boat", position: { x: 1, y: 2, z: 3 } };
    setTimeout(() => {
      this.emit("entitySpawn", entity);
    }, 5);
    return entity;
  }

  async activateBlock(): Promise<void> {
    setTimeout(() => {
      this.emit("windowOpen", { id: 1, title: "Chest" });
    }, 5);
  }

  updateSign(): void {
    setTimeout(() => {
      this.emit("blockUpdate", null, { name: "oak_sign", position: { x: 0, y: 0, z: 0 } });
    }, 5);
  }

  blockAt(position: { x: number; y: number; z: number }): unknown {
    return {
      position,
      name: "stone",
      diggable: true,
    };
  }

  chat(message: string): void {
    this.sentChats.push(message);
  }
}

function asEnvelope(intent: NpcIntent): DecisionEnvelope {
  return {
    intent,
    meta: {
      usedFallback: false,
      transport: "codex",
      threadId: "thread-1",
    },
  };
}

test("mapIntentToMineflayerCommand maps Talk actionType to chat command", () => {
  const command = mapIntentToMineflayerCommand({
    npcId: "npc-1",
    actionType: "Talk",
    utterance: "hello player",
    reasonCodes: ["r1"],
    confidence: 0.8,
  });

  assert.equal(command.type, "chat");
  assert.equal(command.args.message, "hello player");
});

test("dispatchDecisionToMineflayer executes chat command", async () => {
  const bot = new FakeActionBot();
  const actionRunner = new MineflayerActionRunner(bot as unknown as Bot);
  const envelope = asEnvelope({
    npcId: "npc-1",
    actionType: "Talk",
    utterance: "watch your step",
    reasonCodes: ["warn"],
    confidence: 0.7,
    command: "chat",
    commandArgs: {
      message: "watch your step",
    },
  });

  const dispatched = await dispatchDecisionToMineflayer(
    bot as unknown as Bot,
    actionRunner,
    envelope,
    "action-chat-1",
  );

  assert.equal(dispatched.result.ok, true);
  assert.deepEqual(bot.sentChats, ["watch your step"]);
});

test("dispatchDecisionToMineflayer returns deterministic failure for dig with unresolved block", async () => {
  const bot = new FakeActionBot();
  const actionRunner = new MineflayerActionRunner(bot as unknown as Bot);
  const envelope = asEnvelope({
    npcId: "npc-2",
    actionType: "Work",
    reasonCodes: ["dig"],
    confidence: 0.6,
    command: "dig",
    commandArgs: {},
  });

  const dispatched = await dispatchDecisionToMineflayer(
    bot as unknown as Bot,
    actionRunner,
    envelope,
    "action-dig-1",
  );

  assert.equal(dispatched.result.ok, false);
  if (!dispatched.result.ok) {
    assert.equal(dispatched.result.reasonCode, "DIG_BLOCK_UNDEFINED");
    assert.equal(dispatched.result.reasonCategory, "type-mismatch");
  }
});

test("MineflayerActionRunner updateSign validates line constraints", async () => {
  const bot = new FakeActionBot();
  const actionRunner = new MineflayerActionRunner(bot as unknown as Bot);
  const tooManyLinesText = "a\nb\nc\nd\ne";

  const result = await actionRunner.updateSign(
    bot.blockAt({ x: 0, y: 0, z: 0 }) as Parameters<Bot["placeBlock"]>[0],
    tooManyLinesText,
    { actionId: "action-sign-1" },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reasonCode, "SIGN_TOO_MANY_LINES");
    assert.equal(result.reasonCategory, "precondition");
  }
});

test("MineflayerActionRunner placeBlock enforces held item precondition", async () => {
  const bot = new FakeActionBot();
  bot.heldItem = null;
  const actionRunner = new MineflayerActionRunner(bot as unknown as Bot);

  const result = await actionRunner.placeBlock(
    bot.blockAt({ x: 1, y: 2, z: 3 }) as Parameters<Bot["placeBlock"]>[0],
    { x: 1, y: 0, z: 0 } as Parameters<Bot["placeBlock"]>[1],
    { actionId: "action-place-1" },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reasonCode, "PLACE_MISSING_HELD_ITEM");
    assert.equal(result.reasonCategory, "precondition");
  }
});

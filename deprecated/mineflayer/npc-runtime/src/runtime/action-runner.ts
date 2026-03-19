import type { Bot } from "mineflayer";
import type { Vec3 } from "vec3";

export type ActionFailureCategory =
  | "precondition"
  | "visibility"
  | "timeout"
  | "server-state"
  | "type-mismatch"
  | "unknown";

export interface ActionSuccess {
  ok: true;
  actionId: string;
  evidence?: Record<string, unknown>;
}

export interface ActionFailure {
  ok: false;
  actionId: string;
  reasonCode: string;
  reasonCategory: ActionFailureCategory;
  detail?: string;
}

export type ActionResult = ActionSuccess | ActionFailure;

interface ActionEventSource {
  on(eventName: string, listener: (...args: unknown[]) => void): unknown;
  off?(eventName: string, listener: (...args: unknown[]) => void): unknown;
  removeListener?(eventName: string, listener: (...args: unknown[]) => void): unknown;
}

interface ActionRunnerOptions {
  timeoutMs?: number;
}

interface DigOptions {
  actionId: string;
  forceLook?: boolean | "ignore";
  digFace?: "auto" | "raycast" | Vec3;
  timeoutMs?: number;
}

interface PlaceOptions {
  actionId: string;
  timeoutMs?: number;
}

interface ActivateOptions extends PlaceOptions {
  direction?: Vec3;
  cursorPos?: Vec3;
}

interface UpdateSignOptions extends PlaceOptions {
  back?: boolean;
}

interface CapturedEvent {
  eventName: string;
  args: unknown[];
}

type DigBlock = Parameters<Bot["canDigBlock"]>[0];
type PlaceReferenceBlock = Parameters<Bot["placeBlock"]>[0];
type FaceVector = Parameters<Bot["placeBlock"]>[1];
type PlacedEntity = Awaited<ReturnType<Bot["placeEntity"]>>;

const DEFAULT_ACTION_TIMEOUT_MS = 4_000;
const MAX_SIGN_LINES = 4;
const MAX_SIGN_LINE_LENGTH = 384;

function asEventSource(bot: Bot): ActionEventSource {
  return bot as unknown as ActionEventSource;
}

function removeListener(source: ActionEventSource, eventName: string, listener: (...args: unknown[]) => void): void {
  if (typeof source.off === "function") {
    source.off(eventName, listener);
    return;
  }
  if (typeof source.removeListener === "function") {
    source.removeListener(eventName, listener);
  }
}

function isVec3Like(value: unknown): value is Vec3 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const maybe = value as Record<string, unknown>;
  return typeof maybe.x === "number" && typeof maybe.y === "number" && typeof maybe.z === "number";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(onTimeout());
    }, timeoutMs);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class MineflayerActionRunner {
  private chain: Promise<void> = Promise.resolve();
  private readonly timeoutMs: number;

  constructor(private readonly bot: Bot, options: ActionRunnerOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS;
  }

  canDigBlock(block: DigBlock): boolean {
    try {
      return this.bot.canDigBlock(block);
    } catch {
      return false;
    }
  }

  stopDigging(): void {
    this.bot.stopDigging();
  }

  digTime(block: DigBlock): number {
    return this.bot.digTime(block);
  }

  async dig(block: DigBlock | undefined, options: DigOptions): Promise<ActionResult> {
    return await this.runSingleFlight(options.actionId, async () => {
      if (!block) {
        return this.fail(options.actionId, "DIG_BLOCK_UNDEFINED", "type-mismatch");
      }
      if (!this.bot.canDigBlock(block)) {
        return this.fail(options.actionId, "DIG_BLOCK_NOT_IN_VIEW", "visibility");
      }
      const digTime = this.bot.digTime(block);
      if (!Number.isFinite(digTime)) {
        return this.fail(options.actionId, "DIG_TIME_INFINITY", "precondition");
      }

      const timeoutMs = options.timeoutMs ?? this.timeoutMs;
      const evidencePromise = this.waitForAnyEvent(["diggingCompleted", "diggingAborted"], timeoutMs);

      const digPromise = options.digFace === undefined
        ? this.bot.dig(block, options.forceLook)
        : this.bot.dig(block, options.forceLook ?? true, options.digFace);

      await withTimeout(
        digPromise,
        timeoutMs,
        () => new Error("DIG_TIMEOUT"),
      );

      const evidence = await evidencePromise;
      if (!evidence || evidence.eventName === "diggingAborted") {
        return this.fail(options.actionId, "DIG_ABORTED", "server-state");
      }
      return this.ok(options.actionId, {
        eventName: evidence.eventName,
      });
    });
  }

  async placeBlock(referenceBlock: PlaceReferenceBlock | undefined, faceVector: FaceVector | undefined, options: PlaceOptions): Promise<ActionResult> {
    return await this.runSingleFlight(options.actionId, async () => {
      if (!referenceBlock || !faceVector || !isVec3Like(faceVector)) {
        return this.fail(options.actionId, "PLACE_BLOCK_INVALID_REFERENCE", "type-mismatch");
      }
      if (!this.bot.heldItem) {
        return this.fail(options.actionId, "PLACE_MISSING_HELD_ITEM", "precondition");
      }

      const timeoutMs = options.timeoutMs ?? this.timeoutMs;
      const evidencePromise = this.waitForAnyEvent(["blockPlaced", "blockUpdate"], timeoutMs);

      await withTimeout(
        this.bot.placeBlock(referenceBlock, faceVector),
        timeoutMs,
        () => new Error("PLACE_TIMEOUT"),
      );

      const evidence = await evidencePromise;
      if (!evidence) {
        return this.fail(options.actionId, "PLACE_BLOCK_NO_STATE_CHANGE", "timeout");
      }
      return this.ok(options.actionId, { eventName: evidence.eventName });
    });
  }

  async placeEntity(referenceBlock: PlaceReferenceBlock | undefined, faceVector: FaceVector | undefined, options: PlaceOptions): Promise<ActionResult> {
    return await this.runSingleFlight(options.actionId, async () => {
      if (!referenceBlock || !faceVector || !isVec3Like(faceVector)) {
        return this.fail(options.actionId, "PLACE_ENTITY_INVALID_REFERENCE", "type-mismatch");
      }
      if (!this.bot.heldItem) {
        return this.fail(options.actionId, "PLACE_MISSING_HELD_ITEM", "precondition");
      }

      const timeoutMs = options.timeoutMs ?? this.timeoutMs;
      const evidencePromise = this.waitForAnyEvent(["entitySpawn", "entityPlaced"], timeoutMs);

      let placedEntity: PlacedEntity | undefined;
      try {
        placedEntity = await withTimeout(
          this.bot.placeEntity(referenceBlock, faceVector),
          timeoutMs,
          () => new Error("PLACE_ENTITY_TIMEOUT"),
        );
      } catch {
        return this.fail(options.actionId, "PLACE_ENTITY_SPAWN_TIMEOUT", "timeout");
      }

      const evidence = await evidencePromise;
      if (!evidence) {
        return this.fail(options.actionId, "PLACE_ENTITY_SPAWN_TIMEOUT", "timeout");
      }

      return this.ok(options.actionId, {
        eventName: evidence.eventName,
        entityId: placedEntity?.id,
      });
    });
  }

  async activateBlock(block: PlaceReferenceBlock | undefined, options: ActivateOptions): Promise<ActionResult> {
    return await this.runSingleFlight(options.actionId, async () => {
      if (!block) {
        return this.fail(options.actionId, "ACTIVATE_BLOCK_UNDEFINED", "type-mismatch");
      }
      if (options.direction && !isVec3Like(options.direction)) {
        return this.fail(options.actionId, "ACTIVATE_DIRECTION_INVALID", "type-mismatch");
      }
      if (options.cursorPos && !isVec3Like(options.cursorPos)) {
        return this.fail(options.actionId, "ACTIVATE_CURSOR_INVALID", "type-mismatch");
      }

      const timeoutMs = options.timeoutMs ?? this.timeoutMs;
      const evidencePromise = this.waitForAnyEvent(["windowOpen", "blockUpdate"], Math.max(250, Math.floor(timeoutMs / 2)));

      await withTimeout(
        this.bot.activateBlock(block, options.direction, options.cursorPos),
        timeoutMs,
        () => new Error("ACTIVATE_TIMEOUT"),
      );

      const evidence = await evidencePromise;
      return this.ok(options.actionId, {
        eventName: evidence?.eventName ?? "activate_resolved",
      });
    });
  }

  async updateSign(block: PlaceReferenceBlock | undefined, text: string, options: UpdateSignOptions): Promise<ActionResult> {
    return await this.runSingleFlight(options.actionId, async () => {
      if (!block) {
        return this.fail(options.actionId, "SIGN_BLOCK_UNDEFINED", "type-mismatch");
      }
      const lines = text.split("\n");
      if (lines.length > MAX_SIGN_LINES) {
        return this.fail(options.actionId, "SIGN_TOO_MANY_LINES", "precondition");
      }
      if (lines.some(line => line.length > MAX_SIGN_LINE_LENGTH)) {
        return this.fail(options.actionId, "SIGN_LINE_TOO_LONG", "precondition");
      }

      const timeoutMs = options.timeoutMs ?? this.timeoutMs;
      const evidencePromise = this.waitForAnyEvent(["blockUpdate"], timeoutMs);
      this.bot.updateSign(block, text, options.back);
      const evidence = await evidencePromise;
      if (!evidence) {
        return this.fail(options.actionId, "SIGN_UPDATE_NO_EVIDENCE", "timeout");
      }
      return this.ok(options.actionId, {
        eventName: evidence.eventName,
      });
    });
  }

  private async runSingleFlight(actionId: string, work: () => Promise<ActionResult>): Promise<ActionResult> {
    const previous = this.chain;
    let release: (() => void) | undefined;
    this.chain = new Promise<void>(resolve => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } catch (error) {
      if (error instanceof Error && error.message.endsWith("_TIMEOUT")) {
        return this.fail(actionId, error.message.replace("_TIMEOUT", "_TIMEOUT"), "timeout");
      }
      return this.fail(actionId, "ACTION_RUNNER_ERROR", "unknown", error instanceof Error ? error.message : String(error));
    } finally {
      release?.();
    }
  }

  private async waitForAnyEvent(eventNames: readonly string[], timeoutMs: number): Promise<CapturedEvent | undefined> {
    const source = asEventSource(this.bot);
    return await new Promise<CapturedEvent | undefined>(resolve => {
      const listeners: Array<{ eventName: string; listener: (...args: unknown[]) => void }> = [];
      let settled = false;

      const settle = (result: CapturedEvent | undefined) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        while (listeners.length > 0) {
          const binding = listeners.pop();
          if (!binding) continue;
          removeListener(source, binding.eventName, binding.listener);
        }
        resolve(result);
      };

      const timer = setTimeout(() => {
        settle(undefined);
      }, timeoutMs);

      for (const eventName of eventNames) {
        const listener = (...args: unknown[]) => {
          settle({ eventName, args });
        };
        source.on(eventName, listener);
        listeners.push({ eventName, listener });
      }
    });
  }

  private ok(actionId: string, evidence?: Record<string, unknown>): ActionSuccess {
    return {
      ok: true,
      actionId,
      evidence,
    };
  }

  private fail(actionId: string, reasonCode: string, reasonCategory: ActionFailureCategory, detail?: string): ActionFailure {
    return {
      ok: false,
      actionId,
      reasonCode,
      reasonCategory,
      detail,
    };
  }
}

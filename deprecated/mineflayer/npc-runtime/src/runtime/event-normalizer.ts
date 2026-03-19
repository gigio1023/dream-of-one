import type { Bot } from "mineflayer";

type EventKind = "lifecycle" | "world" | "chat" | "action" | "error";

interface ListenerBinding {
  eventName: string;
  listener: (...args: unknown[]) => void;
}

interface EventSource {
  on(eventName: string, listener: (...args: unknown[]) => void): unknown;
  off?(eventName: string, listener: (...args: unknown[]) => void): unknown;
  removeListener?(eventName: string, listener: (...args: unknown[]) => void): unknown;
}

export interface NormalizedMineflayerEvent {
  kind: EventKind;
  eventName: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface EventNormalizerOptions {
  onEvent: (event: NormalizedMineflayerEvent) => void;
  now?: () => Date;
}

export interface EventNormalizerHandle {
  detach: () => void;
}

const LIFECYCLE_EVENTS = ["inject_allowed", "login", "game", "spawn", "respawn", "end", "kicked"] as const;
const WORLD_EVENTS = ["blockUpdate", "entitySpawn", "entityUpdate", "entityGone", "windowOpen"] as const;
const CHAT_EVENTS = ["chat", "whisper", "messagestr", "unmatchedMessage"] as const;
const ACTION_EVENTS = ["diggingCompleted", "diggingAborted", "blockPlaced", "entityPlaced"] as const;
const ERROR_EVENTS = ["error"] as const;

function toEventSource(bot: Bot): EventSource {
  return bot as unknown as EventSource;
}

function detachBinding(source: EventSource, binding: ListenerBinding): void {
  if (typeof source.off === "function") {
    source.off(binding.eventName, binding.listener);
    return;
  }
  if (typeof source.removeListener === "function") {
    source.removeListener(binding.eventName, binding.listener);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asPosition(value: unknown): Record<string, number> | undefined {
  const obj = asObject(value);
  const x = obj.x;
  const y = obj.y;
  const z = obj.z;
  if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
    return undefined;
  }
  return { x, y, z };
}

function normalizePayload(eventName: string, args: unknown[]): Record<string, unknown> {
  if (eventName === "chat" || eventName === "whisper") {
    return {
      username: typeof args[0] === "string" ? args[0] : undefined,
      message: typeof args[1] === "string" ? args[1] : undefined,
      translate: typeof args[2] === "string" ? args[2] : null,
    };
  }

  if (eventName === "messagestr") {
    return {
      message: typeof args[0] === "string" ? args[0] : undefined,
      position: typeof args[1] === "string" ? args[1] : undefined,
    };
  }

  if (eventName === "unmatchedMessage") {
    return {
      message: typeof args[0] === "string" ? args[0] : undefined,
    };
  }

  if (eventName === "blockUpdate") {
    const oldBlock = asObject(args[0]);
    const newBlock = asObject(args[1]);
    return {
      oldBlockPosition: asPosition(oldBlock.position),
      newBlockPosition: asPosition(newBlock.position),
      newBlockName: typeof newBlock.name === "string" ? newBlock.name : undefined,
      newBlockType: typeof newBlock.type === "number" ? newBlock.type : undefined,
    };
  }

  if (eventName === "entitySpawn" || eventName === "entityUpdate" || eventName === "entityGone" || eventName === "entityPlaced") {
    const entity = asObject(args[0]);
    return {
      entityId: typeof entity.id === "number" ? entity.id : undefined,
      entityType: typeof entity.name === "string" ? entity.name : undefined,
      entityPosition: asPosition(entity.position),
    };
  }

  if (eventName === "windowOpen") {
    const window = asObject(args[0]);
    return {
      windowId: typeof window.id === "number" ? window.id : undefined,
      windowTitle: typeof window.title === "string" ? window.title : undefined,
    };
  }

  if (eventName === "error") {
    const error = args[0];
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (eventName === "kicked" || eventName === "end") {
    return {
      reason: typeof args[0] === "string" ? args[0] : undefined,
    };
  }

  return {};
}

function kindForEvent(eventName: string): EventKind {
  if ((LIFECYCLE_EVENTS as readonly string[]).includes(eventName)) {
    return "lifecycle";
  }
  if ((WORLD_EVENTS as readonly string[]).includes(eventName)) {
    return "world";
  }
  if ((CHAT_EVENTS as readonly string[]).includes(eventName)) {
    return "chat";
  }
  if ((ACTION_EVENTS as readonly string[]).includes(eventName)) {
    return "action";
  }
  return "error";
}

export function createMineflayerEventNormalizer(bot: Bot, options: EventNormalizerOptions): EventNormalizerHandle {
  const now = options.now ?? (() => new Date());
  const source = toEventSource(bot);
  const bindings: ListenerBinding[] = [];
  const eventNames = [
    ...LIFECYCLE_EVENTS,
    ...WORLD_EVENTS,
    ...CHAT_EVENTS,
    ...ACTION_EVENTS,
    ...ERROR_EVENTS,
  ] as const;

  for (const eventName of eventNames) {
    const listener = (...args: unknown[]) => {
      options.onEvent({
        kind: kindForEvent(eventName),
        eventName,
        occurredAt: now().toISOString(),
        payload: normalizePayload(eventName, args),
      });
    };
    source.on(eventName, listener);
    bindings.push({ eventName, listener });
  }

  return {
    detach: () => {
      while (bindings.length > 0) {
        const binding = bindings.pop();
        if (!binding) continue;
        detachBinding(source, binding);
      }
    },
  };
}

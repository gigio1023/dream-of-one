export type LifecyclePhase = "boot" | "handshake" | "session_start" | "active_loop" | "recovery" | "shutdown";

export type LifecycleGateKey =
  | "transport_connected"
  | "plugin_injection_allowed"
  | "login_ready"
  | "game_ready"
  | "spawn_ready";

export type LifecycleGateReasonCategory = "connection" | "precondition" | "timeout" | "server" | "cancelled" | "unknown";

export type LifecycleGateReasonCode =
  | "LIFECYCLE_GATE_TIMEOUT"
  | "LIFECYCLE_DISCONNECTED"
  | "LIFECYCLE_RUNTIME_ERROR"
  | "LIFECYCLE_KICKED"
  | "LIFECYCLE_ABORTED"
  | "LIFECYCLE_TIMEOUT_INVALID";

export interface LifecycleEventSource {
  on(eventName: string, listener: (...args: unknown[]) => void): unknown;
  off?(eventName: string, listener: (...args: unknown[]) => void): unknown;
  removeListener?(eventName: string, listener: (...args: unknown[]) => void): unknown;
}

export interface LifecycleEventObservation {
  eventName: string;
  timestampMs: number;
}

interface LifecycleGateDefinition {
  key: LifecycleGateKey;
  eventName: string;
  phase: LifecyclePhase;
}

interface LifecycleGateResultBase {
  status: "ready" | "not_ready";
  phase: LifecyclePhase;
  startedAtMs: number;
  finishedAtMs: number;
  elapsedMs: number;
  requiredGates: readonly LifecycleGateKey[];
  completedGates: readonly LifecycleGateKey[];
  missingGates: readonly LifecycleGateKey[];
  eventTimeline: readonly LifecycleEventObservation[];
}

export interface LifecycleGateSuccess extends LifecycleGateResultBase {
  status: "ready";
  phase: "active_loop";
  reasonCode?: never;
  reasonCategory?: never;
  failedGate?: never;
  detail?: never;
}

export interface LifecycleGateFailure extends LifecycleGateResultBase {
  status: "not_ready";
  reasonCode: LifecycleGateReasonCode;
  reasonCategory: LifecycleGateReasonCategory;
  failedGate?: LifecycleGateKey;
  detail?: string;
}

export type LifecycleGateResult = LifecycleGateSuccess | LifecycleGateFailure;

export interface LifecycleGateOptions {
  requiredGates?: readonly LifecycleGateKey[];
  timeoutMs?: number;
  signal?: AbortSignal;
  now?: () => number;
}

export const DEFAULT_LIFECYCLE_TIMEOUT_MS = 15_000;

const DEFAULT_LIFECYCLE_GATES: readonly LifecycleGateDefinition[] = [
  { key: "transport_connected", eventName: "connect", phase: "handshake" },
  { key: "plugin_injection_allowed", eventName: "inject_allowed", phase: "handshake" },
  { key: "login_ready", eventName: "login", phase: "session_start" },
  { key: "game_ready", eventName: "game", phase: "session_start" },
  { key: "spawn_ready", eventName: "spawn", phase: "active_loop" },
] as const;

function detachEventListener(
  source: LifecycleEventSource,
  eventName: string,
  listener: (...args: unknown[]) => void,
): void {
  if (typeof source.off === "function") {
    source.off(eventName, listener);
    return;
  }

  if (typeof source.removeListener === "function") {
    source.removeListener(eventName, listener);
  }
}

function computeRequiredGateDefinitions(requiredGates?: readonly LifecycleGateKey[]): readonly LifecycleGateDefinition[] {
  if (!requiredGates || requiredGates.length === 0) {
    return DEFAULT_LIFECYCLE_GATES;
  }

  const requested = new Set<LifecycleGateKey>(requiredGates);
  return DEFAULT_LIFECYCLE_GATES.filter(definition => requested.has(definition.key));
}

function orderedGatesByCompletion(
  requiredGateDefinitions: readonly LifecycleGateDefinition[],
  completedGateSet: ReadonlySet<LifecycleGateKey>,
): LifecycleGateKey[] {
  return requiredGateDefinitions
    .filter(definition => completedGateSet.has(definition.key))
    .map(definition => definition.key);
}

function orderedMissingGates(
  requiredGateDefinitions: readonly LifecycleGateDefinition[],
  completedGateSet: ReadonlySet<LifecycleGateKey>,
): LifecycleGateKey[] {
  return requiredGateDefinitions
    .filter(definition => !completedGateSet.has(definition.key))
    .map(definition => definition.key);
}

function inferFailurePhase(completedGateSet: ReadonlySet<LifecycleGateKey>): LifecyclePhase {
  if (completedGateSet.has("spawn_ready")) {
    return "recovery";
  }
  if (completedGateSet.has("login_ready") || completedGateSet.has("game_ready")) {
    return "session_start";
  }
  if (completedGateSet.has("transport_connected") || completedGateSet.has("plugin_injection_allowed")) {
    return "handshake";
  }
  return "boot";
}

function asMessage(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }

  if (typeof value === "object" && value !== null && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return undefined;
}

function normalizeTimeoutMs(timeoutMs?: number): number {
  if (timeoutMs === undefined) {
    return DEFAULT_LIFECYCLE_TIMEOUT_MS;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return Number.NaN;
  }

  return Math.floor(timeoutMs);
}

export function isLifecycleGateReady(result: LifecycleGateResult): result is LifecycleGateSuccess {
  return result.status === "ready";
}

export async function awaitLifecycleGates(
  source: LifecycleEventSource,
  options: LifecycleGateOptions = {},
): Promise<LifecycleGateResult> {
  const now = options.now ?? Date.now;
  const startedAtMs = now();
  const requiredGateDefinitions = computeRequiredGateDefinitions(options.requiredGates);
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
  const completedGateSet = new Set<LifecycleGateKey>();
  const eventTimeline: LifecycleEventObservation[] = [];

  const makeResultBase = (finishedAtMs: number): Omit<LifecycleGateResultBase, "status" | "phase"> => {
    const completedGates = orderedGatesByCompletion(requiredGateDefinitions, completedGateSet);
    const missingGates = orderedMissingGates(requiredGateDefinitions, completedGateSet);
    return {
      startedAtMs,
      finishedAtMs,
      elapsedMs: Math.max(0, finishedAtMs - startedAtMs),
      requiredGates: requiredGateDefinitions.map(definition => definition.key),
      completedGates,
      missingGates,
      eventTimeline: [...eventTimeline],
    };
  };

  if (requiredGateDefinitions.length === 0) {
    const finishedAtMs = now();
    return {
      ...makeResultBase(finishedAtMs),
      status: "ready",
      phase: "active_loop",
    };
  }

  if (Number.isNaN(timeoutMs)) {
    const finishedAtMs = now();
    const base = makeResultBase(finishedAtMs);
    return {
      ...base,
      status: "not_ready",
      phase: "boot",
      reasonCode: "LIFECYCLE_TIMEOUT_INVALID",
      reasonCategory: "precondition",
      failedGate: base.missingGates[0],
      detail: "timeoutMs must be a finite number greater than 0",
    };
  }

  if (options.signal?.aborted) {
    const finishedAtMs = now();
    const base = makeResultBase(finishedAtMs);
    return {
      ...base,
      status: "not_ready",
      phase: "boot",
      reasonCode: "LIFECYCLE_ABORTED",
      reasonCategory: "cancelled",
      failedGate: base.missingGates[0],
      detail: "Lifecycle gate wait was aborted before listeners were attached.",
    };
  }

  return await new Promise<LifecycleGateResult>(resolve => {
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const detachers: Array<() => void> = [];

    const settle = (result: LifecycleGateResult): void => {
      if (settled) {
        return;
      }
      settled = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      while (detachers.length > 0) {
        const detach = detachers.pop();
        detach?.();
      }

      resolve(result);
    };

    const settleSuccess = (): void => {
      const finishedAtMs = now();
      settle({
        ...makeResultBase(finishedAtMs),
        status: "ready",
        phase: "active_loop",
      });
    };

    const settleFailure = (
      reasonCode: LifecycleGateReasonCode,
      reasonCategory: LifecycleGateReasonCategory,
      detail?: string,
    ): void => {
      const finishedAtMs = now();
      const base = makeResultBase(finishedAtMs);
      settle({
        ...base,
        status: "not_ready",
        phase: inferFailurePhase(completedGateSet),
        reasonCode,
        reasonCategory,
        failedGate: base.missingGates[0],
        detail,
      });
    };

    for (const definition of requiredGateDefinitions) {
      const lifecycleListener = (): void => {
        if (settled) {
          return;
        }

        eventTimeline.push({ eventName: definition.eventName, timestampMs: now() });
        completedGateSet.add(definition.key);

        if (completedGateSet.size === requiredGateDefinitions.length) {
          settleSuccess();
        }
      };

      source.on(definition.eventName, lifecycleListener);
      detachers.push(() => {
        detachEventListener(source, definition.eventName, lifecycleListener);
      });
    }

    const endListener = (reason: unknown): void => {
      if (settled) {
        return;
      }

      eventTimeline.push({ eventName: "end", timestampMs: now() });
      settleFailure("LIFECYCLE_DISCONNECTED", "connection", asMessage(reason));
    };
    source.on("end", endListener);
    detachers.push(() => {
      detachEventListener(source, "end", endListener);
    });

    const errorListener = (error: unknown): void => {
      if (settled) {
        return;
      }

      eventTimeline.push({ eventName: "error", timestampMs: now() });
      settleFailure("LIFECYCLE_RUNTIME_ERROR", "server", asMessage(error));
    };
    source.on("error", errorListener);
    detachers.push(() => {
      detachEventListener(source, "error", errorListener);
    });

    const kickedListener = (reason: unknown): void => {
      if (settled) {
        return;
      }

      eventTimeline.push({ eventName: "kicked", timestampMs: now() });
      settleFailure("LIFECYCLE_KICKED", "connection", asMessage(reason));
    };
    source.on("kicked", kickedListener);
    detachers.push(() => {
      detachEventListener(source, "kicked", kickedListener);
    });

    if (options.signal) {
      const abortListener = (): void => {
        if (settled) {
          return;
        }

        eventTimeline.push({ eventName: "abort", timestampMs: now() });
        settleFailure("LIFECYCLE_ABORTED", "cancelled", "Lifecycle gate wait was aborted.");
      };

      options.signal.addEventListener("abort", abortListener, { once: true });
      detachers.push(() => {
        options.signal?.removeEventListener("abort", abortListener);
      });
    }

    timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }

      eventTimeline.push({ eventName: "timeout", timestampMs: now() });
      settleFailure(
        "LIFECYCLE_GATE_TIMEOUT",
        "timeout",
        `Timed out after ${timeoutMs}ms while waiting for lifecycle gates.`,
      );
    }, timeoutMs);
  });
}

export const evaluateLifecycleGates = awaitLifecycleGates;
export const runLifecycleGates = awaitLifecycleGates;

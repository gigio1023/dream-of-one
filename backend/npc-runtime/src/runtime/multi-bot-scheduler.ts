export interface SchedulerOptions {
  maxPendingPerBot: number;
  maxPendingGlobal: number;
  now?: () => Date;
}

export interface SchedulerAdmissionInput {
  actorKey: string;
  actorPending: number;
  globalPending: number;
}

export interface SchedulerAdmissionResult {
  allowed: boolean;
  reasonCode?: "runtime_actor_queue_saturated" | "runtime_global_queue_saturated";
}

export interface SchedulerActorSnapshot {
  actorKey: string;
  pending: number;
}

export interface SchedulerSnapshot {
  timestamp: string;
  global: {
    pending: number;
    queued: number;
    inFlight: number;
    cap: number;
    maxPendingPerBot: number;
    maxPendingGlobal: number;
    saturated: boolean;
  };
  actors: SchedulerActorSnapshot[];
}

const DEFAULT_MAX_PENDING_PER_BOT = 8;
const DEFAULT_MAX_PENDING_GLOBAL = 128;

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.floor(value as number));
}

export class MultiBotScheduler {
  private readonly maxPendingPerBot: number;
  private readonly maxPendingGlobal: number;
  private readonly now: () => Date;

  constructor(options: Partial<SchedulerOptions> = {}) {
    this.maxPendingPerBot = normalizeLimit(options.maxPendingPerBot, DEFAULT_MAX_PENDING_PER_BOT);
    this.maxPendingGlobal = normalizeLimit(options.maxPendingGlobal, DEFAULT_MAX_PENDING_GLOBAL);
    this.now = options.now ?? (() => new Date());
  }

  getLimits(): { maxPendingPerBot: number; maxPendingGlobal: number } {
    return {
      maxPendingPerBot: this.maxPendingPerBot,
      maxPendingGlobal: this.maxPendingGlobal,
    };
  }

  evaluateAdmission(input: SchedulerAdmissionInput): SchedulerAdmissionResult {
    if (input.actorPending >= this.maxPendingPerBot) {
      return {
        allowed: false,
        reasonCode: "runtime_actor_queue_saturated",
      };
    }
    if (input.globalPending >= this.maxPendingGlobal) {
      return {
        allowed: false,
        reasonCode: "runtime_global_queue_saturated",
      };
    }
    return {
      allowed: true,
    };
  }

  snapshot(input: {
    globalPending: number;
    globalQueued: number;
    globalInFlight: number;
    globalCap: number;
    actors: SchedulerActorSnapshot[];
  }): SchedulerSnapshot {
    return {
      timestamp: this.now().toISOString(),
      global: {
        pending: input.globalPending,
        queued: input.globalQueued,
        inFlight: input.globalInFlight,
        cap: input.globalCap,
        maxPendingPerBot: this.maxPendingPerBot,
        maxPendingGlobal: this.maxPendingGlobal,
        saturated: input.globalPending >= this.maxPendingGlobal || input.actors.some(actor => actor.pending >= this.maxPendingPerBot),
      },
      actors: input.actors,
    };
  }
}

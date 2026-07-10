import type { DecisionEnvelope, PerceptionPacket } from "../contracts/types.js";
import { createFallbackIntent } from "./fallback.js";
import { parsePerceptionPacket, SchemaValidationError } from "./schema.js";
import { annotateDecisionMeta, FALLBACK_REASON_CODES, normalizeReasonCode } from "../policy/reason-taxonomy.js";
import { MultiBotScheduler, type SchedulerSnapshot } from "./multi-bot-scheduler.js";

interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

interface MailboxWaiter extends Deferred<DecisionEnvelope> {
  packet: PerceptionPacket;
  active: boolean;
  signal?: AbortSignal;
  deadlineAtMs?: number;
  detachAbort?: () => void;
}

interface MailboxJob {
  packet: PerceptionPacket;
  waiters: MailboxWaiter[];
  running: boolean;
  abortController: AbortController;
}

interface MailboxState {
  running: boolean;
  pending?: MailboxJob;
  orderedPending: MailboxJob[];
}

export interface DecisionMailboxMetrics {
  queued: number;
  inflight: number;
  coalesced: number;
  dropped: number;
  skippedBeforeBroker: number;
  cancelled: number;
  deadlineExceeded: number;
  globalCap: number;
  globalInFlight: number;
  globalQueued: number;
  backpressureRejected: number;
  actorQueueSaturated: number;
  globalQueueSaturated: number;
  perBotPendingLimit: number;
  globalPendingLimit: number;
  currentGlobalPending: number;
}

/**
 * The decision producer the service orchestrates. In v1 this was the Codex
 * provider broker; the broker was retired for M1 (deterministic-only), so the
 * dependency is now this narrow interface. Any producer with a `decide` method
 * that returns a `DecisionEnvelope` works (e.g. a deterministic policy).
 */
export interface DecisionProducer {
  decide(
    packet: PerceptionPacket,
    options?: { signal?: AbortSignal; deadlineMs?: number },
  ): Promise<DecisionEnvelope>;
}

export interface DecisionServiceOptions {
  maxBrokerInFlight?: number;
  maxPendingPerBot?: number;
  maxPendingGlobal?: number;
}

export interface DecisionRequestOptions {
  signal?: AbortSignal;
  deadlineMs?: number;
}

interface GlobalLimiterSnapshot {
  cap: number;
  inFlight: number;
  queued: number;
}

class GlobalDecisionLimiter {
  private inFlight = 0;
  private readonly waiters: Array<() => void> = [];
  private readonly cap: number;

  constructor(maxBrokerInFlight: number) {
    const normalized = Number.isFinite(maxBrokerInFlight) ? Math.floor(maxBrokerInFlight) : 1;
    this.cap = Math.max(1, normalized);
  }

  snapshot(): GlobalLimiterSnapshot {
    return {
      cap: this.cap,
      inFlight: this.inFlight,
      queued: this.waiters.length,
    };
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await work();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.inFlight < this.cap) {
      this.inFlight += 1;
      return;
    }

    await new Promise<void>(resolve => {
      this.waiters.push(resolve);
    });
    this.inFlight += 1;
  }

  private release(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const next = this.waiters.shift();
    if (next) {
      next();
    }
  }
}

export class DecisionService {
  private readonly mailboxes = new Map<string, MailboxState>();
  private readonly limiter: GlobalDecisionLimiter;
  private readonly scheduler: MultiBotScheduler;
  private readonly metrics: DecisionMailboxMetrics = {
    queued: 0,
    inflight: 0,
    coalesced: 0,
    dropped: 0,
    skippedBeforeBroker: 0,
    cancelled: 0,
    deadlineExceeded: 0,
    globalCap: 1,
    globalInFlight: 0,
    globalQueued: 0,
    backpressureRejected: 0,
    actorQueueSaturated: 0,
    globalQueueSaturated: 0,
    perBotPendingLimit: 0,
    globalPendingLimit: 0,
    currentGlobalPending: 0,
  };

  constructor(
    private readonly broker: DecisionProducer,
    options: DecisionServiceOptions = {},
  ) {
    this.limiter = new GlobalDecisionLimiter(options.maxBrokerInFlight ?? 4);
    this.scheduler = new MultiBotScheduler({
      maxPendingPerBot: options.maxPendingPerBot,
      maxPendingGlobal: options.maxPendingGlobal,
    });
    const limits = this.scheduler.getLimits();
    this.metrics.perBotPendingLimit = limits.maxPendingPerBot;
    this.metrics.globalPendingLimit = limits.maxPendingGlobal;
    this.refreshGlobalLimiterMetrics();
  }

  getMailboxMetrics(): DecisionMailboxMetrics {
    this.refreshGlobalLimiterMetrics();
    return { ...this.metrics };
  }

  getSchedulerSnapshot(maxActors = 20): SchedulerSnapshot {
    const limiterSnapshot = this.limiter.snapshot();
    const actors = this.collectActorSnapshots(maxActors);
    return this.scheduler.snapshot({
      globalPending: this.resolveGlobalPending(),
      globalQueued: limiterSnapshot.queued,
      globalInFlight: limiterSnapshot.inFlight,
      globalCap: limiterSnapshot.cap,
      actors,
    });
  }

  async decide(payload: unknown, options: DecisionRequestOptions = {}): Promise<DecisionEnvelope> {
    try {
      const packet = parsePerceptionPacket(payload);
      return await this.enqueue(packet, options);
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        const reasonCode = FALLBACK_REASON_CODES.invalidPerceptionPacket;
        const fallback = createFallbackIntent({ npcId: "UNKNOWN_NPC" }, reasonCode);
        return annotateDecisionMeta({
          intent: fallback,
          meta: {
            usedFallback: true,
            reason: reasonCode,
            reasonDetail: error.message,
            transport: "fallback",
          },
        });
      }
      throw error;
    }
  }

  private async enqueue(packet: PerceptionPacket, options: DecisionRequestOptions): Promise<DecisionEnvelope> {
    const actorKey = `${packet.sessionId}::${packet.npcId}`;
    const mailbox = this.mailboxes.get(actorKey) ?? { running: false, orderedPending: [] };
    this.mailboxes.set(actorKey, mailbox);

    const actorPending = this.resolveActorPending(mailbox);
    const globalPending = this.resolveGlobalPending();
    const admission = this.scheduler.evaluateAdmission({
      actorKey,
      actorPending,
      globalPending,
    });
    if (!admission.allowed) {
      this.metrics.backpressureRejected += 1;
      if (admission.reasonCode === "runtime_actor_queue_saturated") {
        this.metrics.actorQueueSaturated += 1;
      }
      if (admission.reasonCode === "runtime_global_queue_saturated") {
        this.metrics.globalQueueSaturated += 1;
      }
      this.refreshGlobalLimiterMetrics();
      return annotateDecisionMeta({
        intent: createFallbackIntent(packet, admission.reasonCode ?? "runtime_global_queue_saturated"),
        meta: {
          usedFallback: true,
          reason: admission.reasonCode ?? "runtime_global_queue_saturated",
          transport: "fallback",
        },
      });
    }

    return await new Promise<DecisionEnvelope>((resolve, reject) => {
      const waiter: MailboxWaiter = {
        packet,
        resolve,
        reject,
        active: true,
        signal: options.signal,
        deadlineAtMs: this.resolveDeadlineAtMs(options.deadlineMs),
      };

      if (waiter.signal?.aborted) {
        this.metrics.cancelled += 1;
        this.resolveWaiterWithFallback(waiter, "request_cancelled");
        return;
      }

      if (this.hasDeadlineElapsed(waiter)) {
        this.metrics.deadlineExceeded += 1;
        this.resolveWaiterWithFallback(waiter, "decision_deadline_exceeded");
        return;
      }

      if (!mailbox.running) {
        const job = this.createJob(packet, waiter);
        mailbox.running = true;
        this.bindWaiterToJob(actorKey, mailbox, job, waiter);
        void this.runMailbox(actorKey, mailbox, job);
        this.refreshGlobalLimiterMetrics();
        return;
      }

      if (this.requiresOrderedDelivery(packet)) {
        const job = this.createJob(packet, waiter);
        mailbox.orderedPending.push(job);
        this.bindWaiterToJob(actorKey, mailbox, job, waiter);
        this.metrics.queued += 1;
        this.refreshGlobalLimiterMetrics();
        return;
      }

      if (!mailbox.pending) {
        const job = this.createJob(packet, waiter);
        mailbox.pending = job;
        this.bindWaiterToJob(actorKey, mailbox, job, waiter);
        this.metrics.queued += 1;
        this.refreshGlobalLimiterMetrics();
        return;
      }

      mailbox.pending.packet = packet;
      mailbox.pending.waiters.push(waiter);
      this.bindWaiterToJob(actorKey, mailbox, mailbox.pending, waiter);
      this.metrics.coalesced += 1;
      this.metrics.dropped += 1;
      this.refreshGlobalLimiterMetrics();
    });
  }

  private async runMailbox(actorKey: string, mailbox: MailboxState, initialJob: MailboxJob): Promise<void> {
    let currentJob: MailboxJob | undefined = initialJob;

    try {
      while (currentJob) {
        const job = currentJob;
        this.pruneInactiveWaiters(job);
        this.expireDeadlineWaiters(job);
        if (this.activeWaiterCount(job) === 0) {
          this.cleanupWaiterBindings(job);
          currentJob = this.shiftNextPendingJob(mailbox);
          continue;
        }

        const remainingDeadlineMs = this.resolveJobRemainingDeadlineMs(job);
        if (remainingDeadlineMs !== undefined && remainingDeadlineMs <= 0) {
          this.expireDeadlineWaiters(job);
          this.cleanupWaiterBindings(job);
          currentJob = this.shiftNextPendingJob(mailbox);
          continue;
        }

        job.running = true;
        try {
          let result: DecisionEnvelope | undefined;
          await this.limiter.run(async () => {
            this.refreshGlobalLimiterMetrics();
            this.pruneInactiveWaiters(job);
            this.expireDeadlineWaiters(job);
            if (this.activeWaiterCount(job) === 0 || job.abortController.signal.aborted) {
              this.metrics.skippedBeforeBroker += 1;
              return;
            }

            const limiterRemainingDeadlineMs = this.resolveJobRemainingDeadlineMs(job);
            if (limiterRemainingDeadlineMs !== undefined && limiterRemainingDeadlineMs <= 0) {
              this.expireDeadlineWaiters(job);
              this.metrics.skippedBeforeBroker += 1;
              return;
            }

            this.metrics.inflight += 1;
            try {
              result = await this.broker.decide(job.packet, {
                signal: job.abortController.signal,
                deadlineMs: limiterRemainingDeadlineMs,
              });
            } finally {
              this.metrics.inflight = Math.max(0, this.metrics.inflight - 1);
              this.refreshGlobalLimiterMetrics();
            }
          });

          if (!result) {
            continue;
          }

          for (const waiter of job.waiters) {
            if (!waiter.active) continue;
            this.resolveWaiter(waiter, result);
          }
        } catch (error) {
          for (const waiter of job.waiters) {
            if (!waiter.active) continue;
            this.rejectWaiter(waiter, error);
          }
        } finally {
          job.running = false;
          this.refreshGlobalLimiterMetrics();
        }

        this.cleanupWaiterBindings(job);
        currentJob = this.shiftNextPendingJob(mailbox);
      }
    } finally {
      mailbox.running = false;
      if (!mailbox.pending && mailbox.orderedPending.length === 0) {
        this.mailboxes.delete(actorKey);
      }
      this.refreshGlobalLimiterMetrics();
    }
  }

  private createJob(packet: PerceptionPacket, waiter: MailboxWaiter): MailboxJob {
    return {
      packet,
      waiters: [waiter],
      running: false,
      abortController: new AbortController(),
    };
  }

  private requiresOrderedDelivery(packet: PerceptionPacket): boolean {
    return typeof packet.conversation?.turnId === "string" && packet.conversation.turnId.trim().length > 0;
  }

  private shiftNextPendingJob(mailbox: MailboxState): MailboxJob | undefined {
    const ordered = mailbox.orderedPending.shift();
    if (ordered) {
      return ordered;
    }
    const pending = mailbox.pending;
    mailbox.pending = undefined;
    return pending;
  }

  private bindWaiterToJob(actorKey: string, mailbox: MailboxState, job: MailboxJob, waiter: MailboxWaiter): void {
    if (!waiter.signal) {
      return;
    }

    const onAbort = () => {
      if (!waiter.active) {
        return;
      }
      this.metrics.cancelled += 1;
      this.resolveWaiterWithFallback(waiter, "request_cancelled");
      this.pruneInactiveWaiters(job);
      if (job.running && this.activeWaiterCount(job) === 0 && !job.abortController.signal.aborted) {
        job.abortController.abort();
      }
      if (!job.running && mailbox.pending === job && this.activeWaiterCount(job) === 0) {
        mailbox.pending = undefined;
      }
      if (!job.running && this.activeWaiterCount(job) === 0) {
        mailbox.orderedPending = mailbox.orderedPending.filter(item => item !== job);
      }

      // Keep mailbox map clean if this actor has no remaining work.
      if (!mailbox.running && !mailbox.pending && mailbox.orderedPending.length === 0) {
        this.mailboxes.delete(actorKey);
      }
      this.refreshGlobalLimiterMetrics();
    };

    waiter.detachAbort = () => {
      waiter.signal?.removeEventListener("abort", onAbort);
    };
    waiter.signal.addEventListener("abort", onAbort, { once: true });
  }

  private resolveWaiter(waiter: MailboxWaiter, value: DecisionEnvelope): void {
    if (!waiter.active) return;
    waiter.active = false;
    waiter.detachAbort?.();
    waiter.detachAbort = undefined;
    waiter.resolve(value);
  }

  private rejectWaiter(waiter: MailboxWaiter, error: unknown): void {
    if (!waiter.active) return;
    waiter.active = false;
    waiter.detachAbort?.();
    waiter.detachAbort = undefined;
    waiter.reject(error);
  }

  private resolveWaiterWithFallback(waiter: MailboxWaiter, reason: string): void {
    const reasonCode = normalizeReasonCode(reason) ?? FALLBACK_REASON_CODES.toolFailure;
    this.resolveWaiter(waiter, annotateDecisionMeta({
      intent: createFallbackIntent(waiter.packet, reasonCode),
      meta: {
        usedFallback: true,
        reason: reasonCode,
        transport: "fallback",
      },
    }));
  }

  private cleanupWaiterBindings(job: MailboxJob): void {
    for (const waiter of job.waiters) {
      waiter.detachAbort?.();
      waiter.detachAbort = undefined;
    }
  }

  private pruneInactiveWaiters(job: MailboxJob): void {
    job.waiters = job.waiters.filter(waiter => waiter.active);
  }

  private activeWaiterCount(job: MailboxJob): number {
    return job.waiters.reduce((count, waiter) => count + (waiter.active ? 1 : 0), 0);
  }

  private resolveDeadlineAtMs(deadlineMs: number | undefined): number | undefined {
    if (!Number.isFinite(deadlineMs) || deadlineMs === undefined) {
      return undefined;
    }
    const normalized = Math.max(1, Math.floor(deadlineMs));
    return Date.now() + normalized;
  }

  private hasDeadlineElapsed(waiter: MailboxWaiter): boolean {
    return waiter.deadlineAtMs !== undefined && waiter.deadlineAtMs <= Date.now();
  }

  private expireDeadlineWaiters(job: MailboxJob): void {
    for (const waiter of job.waiters) {
      if (!waiter.active) continue;
      if (this.hasDeadlineElapsed(waiter)) {
        this.metrics.deadlineExceeded += 1;
        this.resolveWaiterWithFallback(waiter, "decision_deadline_exceeded");
      }
    }
    this.pruneInactiveWaiters(job);
  }

  private resolveJobRemainingDeadlineMs(job: MailboxJob): number | undefined {
    let earliestDeadline: number | undefined;
    const now = Date.now();

    for (const waiter of job.waiters) {
      if (!waiter.active) continue;
      if (waiter.deadlineAtMs === undefined) continue;
      earliestDeadline = earliestDeadline === undefined
        ? waiter.deadlineAtMs
        : Math.min(earliestDeadline, waiter.deadlineAtMs);
    }

    if (earliestDeadline === undefined) {
      return undefined;
    }
    return Math.floor(earliestDeadline - now);
  }

  private refreshGlobalLimiterMetrics(): void {
    const snapshot = this.limiter.snapshot();
    this.metrics.globalCap = snapshot.cap;
    this.metrics.globalInFlight = snapshot.inFlight;
    this.metrics.globalQueued = snapshot.queued;
    this.metrics.currentGlobalPending = this.resolveGlobalPending();
  }

  private resolveGlobalPending(): number {
    let total = 0;
    for (const mailbox of this.mailboxes.values()) {
      total += this.resolveActorPending(mailbox);
    }
    return total;
  }

  private resolveActorPending(mailbox: MailboxState): number {
    const running = mailbox.running ? 1 : 0;
    const pendingWaiters = mailbox.pending
      ? mailbox.pending.waiters.reduce((count, waiter) => count + (waiter.active ? 1 : 0), 0)
      : 0;
    const orderedWaiters = mailbox.orderedPending.reduce(
      (total, job) => total + job.waiters.reduce((count, waiter) => count + (waiter.active ? 1 : 0), 0),
      0,
    );
    return running + pendingWaiters + orderedWaiters;
  }

  private collectActorSnapshots(maxActors: number): Array<{ actorKey: string; pending: number }> {
    const normalizedMax = Number.isFinite(maxActors) ? Math.max(1, Math.floor(maxActors)) : 20;
    const snapshots: Array<{ actorKey: string; pending: number }> = [];
    for (const [actorKey, mailbox] of this.mailboxes.entries()) {
      snapshots.push({
        actorKey,
        pending: this.resolveActorPending(mailbox),
      });
    }
    snapshots.sort((left, right) => right.pending - left.pending || left.actorKey.localeCompare(right.actorKey));
    return snapshots.slice(0, normalizedMax);
  }
}

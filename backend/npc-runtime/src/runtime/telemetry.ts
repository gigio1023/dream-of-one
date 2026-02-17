import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DecisionEnvelope } from "../contracts/types.js";
import type { DecisionDispatchResult } from "./decision-bridge.js";
import type { NormalizedMineflayerEvent } from "./event-normalizer.js";
import type { DecisionMailboxMetrics } from "./decision-service.js";
import type { SchedulerSnapshot } from "./multi-bot-scheduler.js";

export type TelemetryRecordType = "mineflayer_event" | "decision_cycle" | "scheduler_snapshot";

export interface TelemetryRecord {
  id: string;
  occurredAt: string;
  type: TelemetryRecordType;
  sessionId?: string;
  npcId?: string;
  payload: Record<string, unknown>;
}

export interface DecisionCycleRecordInput {
  requestId: string;
  sessionId?: string;
  npcId?: string;
  deadlineMs: number;
  latencyMs: number;
  decision: DecisionEnvelope;
  mailbox: DecisionMailboxMetrics;
  dispatchResult?: DecisionDispatchResult;
}

export interface RuntimeTelemetryCollectorOptions {
  maxRecords?: number;
  evidenceOutputDir?: string;
  now?: () => Date;
}

export interface RuntimeEvidencePack {
  generatedAt: string;
  totalRecords: number;
  countsByType: Record<TelemetryRecordType, number>;
  decisionSummary: {
    total: number;
    fallbackCount: number;
    reasonCategory: Record<string, number>;
    socialLoopStage: Record<string, number>;
    actionSuccess: number;
    actionFailure: number;
  };
  worldObservationSummary: {
    worldEvents: number;
    actionEvents: number;
    nearbyNpcObservations: number;
  };
  schedulerSummary: {
    snapshots: number;
    maxGlobalPending: number;
    maxGlobalInFlight: number;
    maxGlobalCap: number;
  };
  trajectorySummary: {
    decisionCycles: number;
    runSignature: string;
    actorSignatures: Array<{
      sessionId: string;
      npcId: string;
      decisions: number;
      signature: string;
    }>;
  };
}

const DEFAULT_MAX_RECORDS = 4_000;
const DEFAULT_EVIDENCE_OUTPUT_DIR = "data/evidence";

function incrementCounter(bucket: Record<string, number>, key: string | undefined): void {
  const normalized = key && key.trim().length > 0 ? key.trim() : "unknown";
  bucket[normalized] = (bucket[normalized] ?? 0) + 1;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function hasPositionField(payload: Record<string, unknown>): boolean {
  const positionKeys = ["entityPosition", "newBlockPosition", "oldBlockPosition"] as const;
  return positionKeys.some(key => {
    const value = payload[key];
    const obj = asRecord(value);
    return typeof obj.x === "number" && typeof obj.y === "number" && typeof obj.z === "number";
  });
}

function normalizeId(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function buildDeterministicSignature(segments: readonly string[]): string {
  const hash = createHash("sha256");
  for (const segment of segments) {
    hash.update(segment);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function buildTrajectoryStep(payload: Record<string, unknown>): string {
  const socialLoopStage = typeof payload.socialLoopStage === "string" ? payload.socialLoopStage : "ambient";
  const playerSpeechAct = typeof payload.playerSpeechAct === "string" ? payload.playerSpeechAct : "none";
  const actionType = typeof payload.actionType === "string" ? payload.actionType : "none";
  const actionOutcome = payload.actionOk === true ? "ok" : payload.actionOk === false ? "fail" : "none";
  const reasonCategory = typeof payload.reasonCategory === "string" ? payload.reasonCategory : "unknown";
  const fallbackMode = payload.usedFallback === true ? "fallback" : "primary";
  const transport = typeof payload.transport === "string" ? payload.transport : "unknown";
  return `${socialLoopStage}|${playerSpeechAct}|${actionType}|${actionOutcome}|${reasonCategory}|${fallbackMode}|${transport}`;
}

export class RuntimeTelemetryCollector {
  private readonly records: TelemetryRecord[] = [];
  private readonly maxRecords: number;
  private readonly evidenceOutputDir: string;
  private readonly now: () => Date;

  constructor(options: RuntimeTelemetryCollectorOptions = {}) {
    const normalizedMax = Number.isFinite(options.maxRecords)
      ? Math.max(100, Math.floor(options.maxRecords as number))
      : DEFAULT_MAX_RECORDS;
    this.maxRecords = normalizedMax;
    this.evidenceOutputDir = options.evidenceOutputDir ?? DEFAULT_EVIDENCE_OUTPUT_DIR;
    this.now = options.now ?? (() => new Date());
  }

  recordMineflayerEvent(event: NormalizedMineflayerEvent): void {
    this.pushRecord({
      type: "mineflayer_event",
      payload: {
        kind: event.kind,
        eventName: event.eventName,
        payload: event.payload,
      },
    });
  }

  recordDecisionCycle(input: DecisionCycleRecordInput): void {
    this.pushRecord({
      type: "decision_cycle",
      sessionId: input.sessionId,
      npcId: input.npcId,
      payload: {
        requestId: input.requestId,
        deadlineMs: input.deadlineMs,
        latencyMs: Number(input.latencyMs.toFixed(3)),
        transport: input.decision.meta.transport,
        threadId: input.decision.meta.threadId ?? null,
        usedFallback: input.decision.meta.usedFallback,
        reason: input.decision.meta.reason ?? null,
        reasonCategory: input.decision.meta.reasonCategory ?? "none",
        warningTier: input.decision.meta.warningTier ?? "reference",
        socialLoopStage: input.decision.meta.socialLoopStage ?? "ambient",
        playerSpeechAct: input.decision.meta.playerSpeechAct ?? null,
        actionType: input.dispatchResult?.command.type ?? null,
        actionOk: input.dispatchResult?.result.ok ?? null,
        actionReason: input.dispatchResult && !input.dispatchResult.result.ok
          ? input.dispatchResult.result.reasonCode
          : null,
        mailbox: input.mailbox,
      },
    });
  }

  recordSchedulerSnapshot(snapshot: SchedulerSnapshot): void {
    this.pushRecord({
      type: "scheduler_snapshot",
      payload: {
        timestamp: snapshot.timestamp,
        global: snapshot.global,
        actors: snapshot.actors,
      },
    });
  }

  listRecords(limit = 100): TelemetryRecord[] {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 100;
    return this.records.slice(-normalizedLimit);
  }

  buildEvidencePack(): RuntimeEvidencePack {
    const countsByType: Record<TelemetryRecordType, number> = {
      mineflayer_event: 0,
      decision_cycle: 0,
      scheduler_snapshot: 0,
    };
    const reasonCategory: Record<string, number> = {};
    const socialLoopStage: Record<string, number> = {};
    let fallbackCount = 0;
    let actionSuccess = 0;
    let actionFailure = 0;
    let worldEvents = 0;
    let actionEvents = 0;
    let nearbyNpcObservations = 0;
    let maxGlobalPending = 0;
    let maxGlobalInFlight = 0;
    let maxGlobalCap = 0;
    let schedulerSnapshots = 0;
    const trajectoryByActor = new Map<string, string[]>();

    for (const record of this.records) {
      countsByType[record.type] += 1;
      const payload = record.payload;

      if (record.type === "mineflayer_event") {
        const kind = typeof payload.kind === "string" ? payload.kind : "unknown";
        const nestedPayload = asRecord(payload.payload);
        if (kind === "world") {
          worldEvents += 1;
          if (hasPositionField(nestedPayload)) {
            nearbyNpcObservations += 1;
          }
        }
        if (kind === "action") {
          actionEvents += 1;
          if (hasPositionField(nestedPayload)) {
            nearbyNpcObservations += 1;
          }
        }
      }

      if (record.type === "decision_cycle") {
        const usedFallback = payload.usedFallback === true;
        if (usedFallback) {
          fallbackCount += 1;
        }
        incrementCounter(reasonCategory, typeof payload.reasonCategory === "string" ? payload.reasonCategory : "unknown");
        incrementCounter(socialLoopStage, typeof payload.socialLoopStage === "string" ? payload.socialLoopStage : "ambient");

        if (payload.actionOk === true) {
          actionSuccess += 1;
        } else if (payload.actionOk === false) {
          actionFailure += 1;
        }

        const sessionId = normalizeId(record.sessionId, "unknown-session");
        const npcId = normalizeId(record.npcId, "unknown-npc");
        const actorKey = `${sessionId}\u001f${npcId}`;
        const steps = trajectoryByActor.get(actorKey);
        if (steps) {
          steps.push(buildTrajectoryStep(payload));
        } else {
          trajectoryByActor.set(actorKey, [buildTrajectoryStep(payload)]);
        }
      }

      if (record.type === "scheduler_snapshot") {
        schedulerSnapshots += 1;
        const global = asRecord(payload.global);
        const pending = typeof global.pending === "number" ? global.pending : 0;
        const inFlight = typeof global.inFlight === "number" ? global.inFlight : 0;
        const cap = typeof global.cap === "number" ? global.cap : 0;
        maxGlobalPending = Math.max(maxGlobalPending, pending);
        maxGlobalInFlight = Math.max(maxGlobalInFlight, inFlight);
        maxGlobalCap = Math.max(maxGlobalCap, cap);
      }
    }

    const actorSignatures = Array.from(trajectoryByActor.entries())
      .map(([actorKey, steps]) => {
        const [sessionId, npcId] = actorKey.split("\u001f", 2);
        return {
          sessionId,
          npcId,
          decisions: steps.length,
          signature: buildDeterministicSignature(steps),
        };
      })
      .sort((left, right) => {
        if (left.sessionId !== right.sessionId) {
          return left.sessionId.localeCompare(right.sessionId);
        }
        return left.npcId.localeCompare(right.npcId);
      });

    const runSignature = buildDeterministicSignature(
      actorSignatures.map(
        actor => `${actor.sessionId}|${actor.npcId}|${actor.decisions}|${actor.signature}`,
      ),
    );

    return {
      generatedAt: this.now().toISOString(),
      totalRecords: this.records.length,
      countsByType,
      decisionSummary: {
        total: countsByType.decision_cycle,
        fallbackCount,
        reasonCategory,
        socialLoopStage,
        actionSuccess,
        actionFailure,
      },
      worldObservationSummary: {
        worldEvents,
        actionEvents,
        nearbyNpcObservations,
      },
      schedulerSummary: {
        snapshots: schedulerSnapshots,
        maxGlobalPending,
        maxGlobalInFlight,
        maxGlobalCap,
      },
      trajectorySummary: {
        decisionCycles: countsByType.decision_cycle,
        runSignature,
        actorSignatures,
      },
    };
  }

  async writeEvidencePack(fileName?: string): Promise<string> {
    const evidencePack = this.buildEvidencePack();
    const resolvedName = fileName ?? `evidence-pack-${this.now().toISOString().replaceAll(":", "-")}.json`;
    await mkdir(this.evidenceOutputDir, { recursive: true });
    const outputPath = join(this.evidenceOutputDir, resolvedName);
    await writeFile(outputPath, `${JSON.stringify(evidencePack, null, 2)}\n`, "utf8");
    return outputPath;
  }

  private pushRecord(input: {
    type: TelemetryRecordType;
    payload: Record<string, unknown>;
    sessionId?: string;
    npcId?: string;
  }): void {
    const record: TelemetryRecord = {
      id: randomUUID(),
      occurredAt: this.now().toISOString(),
      type: input.type,
      sessionId: input.sessionId,
      npcId: input.npcId,
      payload: sanitizePayload(input.payload),
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }
  }
}

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { RuntimeConfig } from "../config.js";
import type { DecisionService } from "../runtime/decision-service.js";
import { evaluateRuntimeReadiness, type RuntimeReadinessReport } from "../runtime/readiness.js";
import { annotateDecisionMeta } from "../policy/reason-taxonomy.js";
import type { ActionType, DecisionEnvelope } from "../contracts/types.js";
import { parsePerceptionPacket, SchemaValidationError } from "../runtime/schema.js";
import { enforceBoundedBehavior } from "../runtime/bounded-behavior.js";
import type { RuntimeTelemetryCollector } from "../runtime/telemetry.js";
import type { SchedulerSnapshot } from "../runtime/multi-bot-scheduler.js";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (raw.length === 0) {
    return {};
  }

  return JSON.parse(raw);
}

function writeJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function asStringField(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function asPositiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : (typeof value === "string" ? Number(value.trim()) : Number.NaN);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.floor(parsed);
}

function asHeaderString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveDeadlineMs(config: RuntimeConfig, payloadObj: Record<string, unknown> | undefined, req: IncomingMessage): number {
  const payloadDeadline = asPositiveNumber(payloadObj?.deadlineMs);
  const headerDeadline = asPositiveNumber(asHeaderString(req.headers["x-decision-timeout-ms"]));
  const requested = payloadDeadline ?? headerDeadline;
  if (requested === undefined) {
    return config.decisionDeadlineMs;
  }
  return Math.max(1, Math.min(config.decisionDeadlineMs, requested));
}

function tryParsePerceptionPacket(payload: unknown) {
  try {
    return parsePerceptionPacket(payload);
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return undefined;
    }
    return undefined;
  }
}

function resolveRequestUrl(req: IncomingMessage, config: RuntimeConfig): URL {
  const host = asHeaderString(req.headers.host) ?? `${config.host}:${config.port}`;
  return new URL(req.url ?? "/", `http://${host}`);
}

export type ReadinessEvaluator = (config: RuntimeConfig) => Promise<RuntimeReadinessReport>;
export interface RuntimeDispatchResult {
  actionId: string;
  actionType: ActionType;
  result: {
    ok: boolean;
    actionId?: string;
    reasonCode?: string;
    evidence?: Record<string, unknown>;
  };
}

export type DecisionDispatcher = (decision: DecisionEnvelope, actionId: string) => Promise<RuntimeDispatchResult>;
export type SchedulerSnapshotProvider = () => SchedulerSnapshot;

export function startHttpServer(
  config: RuntimeConfig,
  decisionService: DecisionService,
  readinessEvaluator: ReadinessEvaluator = evaluateRuntimeReadiness,
  decisionDispatcher?: DecisionDispatcher,
  telemetryCollector?: RuntimeTelemetryCollector,
  schedulerSnapshotProvider?: SchedulerSnapshotProvider,
): Server {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = resolveRequestUrl(req, config);
      const requestPath = requestUrl.pathname;

      if (req.method === "GET" && requestPath === "/health") {
        writeJson(res, 200, {
          status: "ok",
          service: "npc-runtime",
        });
        return;
      }

      if (req.method === "GET" && requestPath === "/health/ready") {
        const readiness = await readinessEvaluator(config);
        writeJson(res, readiness.status === "ready" ? 200 : 503, readiness);
        return;
      }

      if (req.method === "GET" && requestPath === "/health/queue") {
        const schedulerSnapshot = schedulerSnapshotProvider?.();
        writeJson(res, 200, {
          status: "ok",
          mailbox: decisionService.getMailboxMetrics(),
          scheduler: schedulerSnapshot ?? null,
        });
        return;
      }

      if (req.method === "GET" && requestPath === "/v1/telemetry/events") {
        if (!telemetryCollector) {
          writeJson(res, 503, { error: "telemetry_disabled" });
          return;
        }
        const requestedLimit = asPositiveNumber(requestUrl.searchParams.get("limit"));
        const limit = requestedLimit ?? 100;
        writeJson(res, 200, {
          records: telemetryCollector.listRecords(limit),
        });
        return;
      }

      if (req.method === "GET" && requestPath === "/v1/telemetry/evidence-pack") {
        if (!telemetryCollector) {
          writeJson(res, 503, { error: "telemetry_disabled" });
          return;
        }
        writeJson(res, 200, telemetryCollector.buildEvidencePack());
        return;
      }

      if (req.method === "POST" && requestPath === "/v1/telemetry/evidence-pack/export") {
        if (!telemetryCollector) {
          writeJson(res, 503, { error: "telemetry_disabled" });
          return;
        }
        const payload = await readJsonBody(req);
        const payloadObj =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : {};
        const fileName = asStringField(payloadObj.fileName);
        const outputPath = await telemetryCollector.writeEvidencePack(fileName);
        writeJson(res, 200, {
          status: "ok",
          outputPath,
        });
        return;
      }

      if (req.method === "POST" && requestPath === "/v1/npc/decision") {
        const requestId = randomUUID();
        const startedAt = process.hrtime.bigint();
        const abortController = new AbortController();
        const abortRequest = () => {
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
        };
        req.once("aborted", abortRequest);
        res.once("close", () => {
          if (!res.writableEnded) {
            abortRequest();
          }
        });

        const payload = await readJsonBody(req);
        const payloadObj =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : undefined;
        const requestThreadId = asStringField(payloadObj?.threadId);
        const deadlineMs = resolveDeadlineMs(config, payloadObj, req);

        console.log(
          JSON.stringify({
            event: "npc_decision_request",
            requestId,
            sessionId: asStringField(payloadObj?.sessionId),
            npcId: asStringField(payloadObj?.npcId),
            threadId: requestThreadId ?? null,
            deadlineMs,
            latencyMs: 0,
          }),
        );

        const rawDecision = await decisionService.decide(payload, {
          signal: abortController.signal,
          deadlineMs,
        });
        const parsedPacket = tryParsePerceptionPacket(payload);
        const bounded = parsedPacket ? enforceBoundedBehavior(parsedPacket, rawDecision) : undefined;
        const decision = bounded ? bounded.decision : annotateDecisionMeta(rawDecision);
        let dispatchResult: RuntimeDispatchResult | undefined;
        if (decisionDispatcher) {
          dispatchResult = await decisionDispatcher(decision, requestId);
        }
        const dispatchReasonCode =
          dispatchResult && !dispatchResult.result.ok
            ? dispatchResult.result.reasonCode
            : undefined;
        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const mailbox = decisionService.getMailboxMetrics();
        telemetryCollector?.recordDecisionCycle({
          requestId,
          sessionId: asStringField(payloadObj?.sessionId),
          npcId: asStringField(payloadObj?.npcId),
          deadlineMs,
          latencyMs,
          decision,
          mailbox,
          dispatchResult,
        });
        const responseClosedByClient = abortController.signal.aborted || req.aborted || res.destroyed;

        if (responseClosedByClient) {
          console.log(
            JSON.stringify({
              event: "npc_decision_response_dropped",
              droppedReason: "client_aborted",
              requestId,
              sessionId: asStringField(payloadObj?.sessionId),
              npcId: asStringField(payloadObj?.npcId),
              transport: decision.meta.transport,
              threadId: decision.meta.threadId ?? requestThreadId ?? null,
              usedFallback: decision.meta.usedFallback,
              reason: decision.meta.reason,
              reasonCategory: decision.meta.reasonCategory,
              warningTier: decision.meta.warningTier,
              deadlineMs,
              latencyMs: Number(latencyMs.toFixed(3)),
              mailbox,
              actionType: dispatchResult?.actionType,
              actionOk: dispatchResult?.result.ok,
              actionReason: dispatchReasonCode,
              socialLoopStage: decision.meta.socialLoopStage ?? null,
              playerSpeechAct: decision.meta.playerSpeechAct ?? null,
            }),
          );
          return;
        }

        console.log(
          JSON.stringify({
            event: "npc_decision_response",
            requestId,
            sessionId: asStringField(payloadObj?.sessionId),
            npcId: asStringField(payloadObj?.npcId),
            transport: decision.meta.transport,
            threadId: decision.meta.threadId ?? requestThreadId ?? null,
            usedFallback: decision.meta.usedFallback,
            reason: decision.meta.reason,
            reasonCategory: decision.meta.reasonCategory,
            warningTier: decision.meta.warningTier,
            deadlineMs,
            latencyMs: Number(latencyMs.toFixed(3)),
            mailbox,
            actionType: dispatchResult?.actionType,
            actionOk: dispatchResult?.result.ok,
            actionReason: dispatchReasonCode,
            socialLoopStage: decision.meta.socialLoopStage ?? null,
            playerSpeechAct: decision.meta.playerSpeechAct ?? null,
          }),
        );

        writeJson(
          res,
          200,
          dispatchResult
            ? {
                ...decision,
                execution: dispatchResult,
              }
            : decision,
        );
        return;
      }

      writeJson(res, 404, { error: "not_found" });
    } catch (error) {
      if (res.writableEnded || res.destroyed) {
        return;
      }

      if (error instanceof SyntaxError) {
        writeJson(res, 400, { error: "invalid_json" });
        return;
      }

      writeJson(res, 500, {
        error: "internal_error",
        message: (error as Error).message,
      });
    }
  });

  server.listen(config.port, config.host, () => {
    // Keep startup log concise so smoke checks can grep this line.
    console.log(`npc-runtime listening on http://${config.host}:${config.port}`);
  });

  return server;
}

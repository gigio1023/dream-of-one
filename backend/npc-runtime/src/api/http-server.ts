import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { RuntimeConfig } from "../config.js";
import type { DecisionService } from "../runtime/decision-service.js";
import { evaluateRuntimeReadiness, type RuntimeReadinessReport } from "../runtime/readiness.js";
import { annotateDecisionMeta } from "../policy/reason-taxonomy.js";

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

export type ReadinessEvaluator = (config: RuntimeConfig) => Promise<RuntimeReadinessReport>;

export function startHttpServer(
  config: RuntimeConfig,
  decisionService: DecisionService,
  readinessEvaluator: ReadinessEvaluator = evaluateRuntimeReadiness,
): Server {
  const server = createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        writeJson(res, 200, {
          status: "ok",
          service: "npc-runtime",
        });
        return;
      }

      if (req.method === "GET" && req.url === "/health/ready") {
        const readiness = await readinessEvaluator(config);
        writeJson(res, readiness.status === "ready" ? 200 : 503, readiness);
        return;
      }

      if (req.method === "POST" && req.url === "/v1/npc/decision") {
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
        const decision = annotateDecisionMeta(rawDecision);
        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const mailbox = decisionService.getMailboxMetrics();
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
          }),
        );

        writeJson(res, 200, decision);
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

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { RuntimeConfig } from "../config.js";
import type { DecisionService } from "../runtime/decision-service.js";
import { evaluateRuntimeReadiness, type RuntimeReadinessReport } from "../runtime/readiness.js";

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
        const payload = await readJsonBody(req);
        const payloadObj =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : undefined;
        const requestThreadId = asStringField(payloadObj?.threadId);

        console.log(
          JSON.stringify({
            event: "npc_decision_request",
            requestId,
            sessionId: asStringField(payloadObj?.sessionId),
            npcId: asStringField(payloadObj?.npcId),
            threadId: requestThreadId ?? null,
            latencyMs: 0,
          }),
        );

        const decision = await decisionService.decide(payload);
        const responseEnvelope = {
          ...decision,
          meta: {
            ...decision.meta,
            requestId,
          },
        };
        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        console.log(
          JSON.stringify({
            event: "npc_decision_response",
            requestId,
            sessionId: asStringField(payloadObj?.sessionId),
            npcId: asStringField(payloadObj?.npcId),
            transport: responseEnvelope.meta.transport,
            threadId: responseEnvelope.meta.threadId ?? requestThreadId ?? null,
            usedFallback: responseEnvelope.meta.usedFallback,
            reason: responseEnvelope.meta.reason,
            latencyMs: Number(latencyMs.toFixed(3)),
          }),
        );

        writeJson(res, 200, responseEnvelope);
        return;
      }

      writeJson(res, 404, { error: "not_found" });
    } catch (error) {
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

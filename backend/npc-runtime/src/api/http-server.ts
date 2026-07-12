// Session API sidecar (docs/tech/npc-runtime.md).
//
// Localhost-only HTTP server exposing the five v2 session endpoints. Every
// request and response is zod-validated (invariant #1). Provider proposals
// remain behind SessionService's NpcProposalPort dependency.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { z } from "zod";
import { SessionError, SessionService } from "../runtime/session/service.js";
import { RunError, RunService } from "../runtime/run-service.js";
import { evaluateRuntimeReadiness } from "../runtime/readiness.js";
import {
  answerRequestSchema,
  answerResponseSchema,
  decisionRequestSchema,
  decisionResponseSchema,
  endRequestSchema,
  endResponseSchema,
  snapshotRequestSchema,
  snapshotResponseSchema,
  startRequestSchema,
  startResponseSchema,
} from "./session-schemas.js";
import {
  runAdvanceRequestSchema,
  runAdvanceResponseSchema,
  runEncounterRequestSchema,
  runEncounterResponseSchema,
  runNpcDecisionRequestSchema,
  runNpcDecisionResponseSchema,
  runSessionAnswerRequestSchema,
  runSessionAnswerResponseSchema,
  runSessionEndRequestSchema,
  runSessionEndResponseSchema,
  runSessionSnapshotRequestSchema,
  runSessionSnapshotResponseSchema,
  runSessionPreloadResponseSchema,
  runSessionStartRequestSchema,
  runSessionStartResponseSchema,
  runSnapshotRequestSchema,
  runSnapshotSchema,
  runStartRequestSchema,
} from "../runtime/run-schema.js";

export const LOOPBACK_HOST = "127.0.0.1";

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

function statusForSessionError(error: SessionError): number {
  switch (error.code) {
    case "session_not_found":
    case "storylet_not_found":
      return 404;
    case "session_ended":
    case "unexpected_turn":
      return 409;
    case "unknown_choice":
    case "invalid_answer":
      return 400;
    default:
      return 400;
  }
}

function statusForRunError(error: RunError): number {
  switch (error.code) {
    case "run_not_found":
    case "actor_not_found":
    case "session_not_found":
      return 404;
    case "actor_not_supported":
    case "conversation_active":
    case "conversation_not_ready":
    case "session_ended":
    case "session_still_active":
    case "unexpected_turn":
    case "start_id_conflict":
    case "advance_id_conflict":
    case "decision_id_conflict":
    case "wake_not_pending":
    case "wake_not_supported":
    case "ambient_conversation_active":
    case "stale_world_revision":
    case "run_paused":
    case "hearing_due":
    case "encounter_id_conflict":
      return 409;
    default:
      return 400;
  }
}

function hasRunId(body: unknown): body is Record<string, unknown> & { runId: unknown } {
  return typeof body === "object" && body !== null && "runId" in body;
}

/** Validate a handler's output against its response schema before sending. */
function respond<T>(res: ServerResponse, schema: z.ZodType<T>, value: T): void {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    writeJson(res, 500, {
      error: "response_contract_violation",
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }
  writeJson(res, 200, parsed.data);
}

function badRequest(res: ServerResponse, error: z.ZodError): void {
  writeJson(res, 400, {
    error: "invalid_request",
    issues: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
  });
}

export interface SessionServerOptions {
  port?: number;
  host?: string;
  service?: SessionService;
  runService?: RunService;
  /** Print the chosen port on listen (default true). */
  logListen?: boolean;
}

export interface RunningSessionServer {
  server: Server;
  port: number;
  host: string;
  close: () => Promise<void>;
}

export function createSessionServer(service: SessionService, runService = new RunService()): Server {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${LOOPBACK_HOST}`);
      const path = url.pathname;
      const method = req.method ?? "GET";

      if (method === "GET" && path === "/health") {
        writeJson(res, 200, {
          status: "ok",
          service: "npc-runtime",
          mode: "provider-first",
          providerProfile: service.providerProfile(),
        });
        return;
      }

      if (method === "GET" && path === "/health/ready") {
        const readiness = await evaluateRuntimeReadiness(service);
        writeJson(res, readiness.status === "ready" ? 200 : 503, readiness);
        return;
      }

      if (method === "POST" && path === "/v1/run/start") {
        const parsed = runStartRequestSchema.safeParse(await readJsonBody(req));
        if (!parsed.success) return badRequest(res, parsed.error);
        respond(res, runSnapshotSchema, runService.start(parsed.data.startId, parsed.data.locale));
        return;
      }

      if (method === "POST" && path === "/v1/run/advance") {
        const parsed = runAdvanceRequestSchema.safeParse(await readJsonBody(req));
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = await runService.advance(parsed.data);
        respond(res, runAdvanceResponseSchema, result);
        return;
      }

      if (method === "GET" && path === "/v1/run/snapshot") {
        const parsed = runSnapshotRequestSchema.safeParse({
          runId: url.searchParams.get("runId") ?? undefined,
        });
        if (!parsed.success) return badRequest(res, parsed.error);
        respond(res, runSnapshotSchema, runService.snapshot(parsed.data.runId));
        return;
      }

      if (method === "POST" && path === "/v1/run/encounter") {
        const parsed = runEncounterRequestSchema.safeParse(await readJsonBody(req));
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = await runService.encounter(parsed.data);
        respond(res, runEncounterResponseSchema, result);
        return;
      }

      if (method === "POST" && path === "/v1/session/start") {
        const body = await readJsonBody(req);
        if (hasRunId(body)) {
          const parsed = runSessionStartRequestSchema.safeParse(body);
          if (!parsed.success) return badRequest(res, parsed.error);
          const result = await runService.startConversation(
            parsed.data.runId,
            parsed.data.actorId,
            parsed.data.interactionZoneId,
            parsed.data.locale,
          );
          respond(res, runSessionStartResponseSchema, result);
          return;
        }
        const parsed = startRequestSchema.safeParse(body);
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = await service.start(parsed.data.storyletId, parsed.data.locale);
        respond(res, startResponseSchema, result);
        return;
      }

      if (method === "POST" && path === "/v1/session/preload") {
        const parsed = runSessionStartRequestSchema.safeParse(await readJsonBody(req));
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = await runService.preloadConversation(
          parsed.data.runId,
          parsed.data.actorId,
          parsed.data.interactionZoneId,
          parsed.data.locale,
        );
        respond(res, runSessionPreloadResponseSchema, result);
        return;
      }

      if (method === "POST" && path === "/v1/session/answer") {
        const body = await readJsonBody(req);
        if (hasRunId(body)) {
          const parsed = runSessionAnswerRequestSchema.safeParse(body);
          if (!parsed.success) return badRequest(res, parsed.error);
          const result = await runService.answer(
            parsed.data.runId,
            parsed.data.sessionId,
            parsed.data.turnId,
            parsed.data.answer,
          );
          respond(res, runSessionAnswerResponseSchema, result);
          return;
        }
        const parsed = answerRequestSchema.safeParse(body);
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = await service.answer(parsed.data.sessionId, parsed.data.turnId, parsed.data.answer);
        respond(res, answerResponseSchema, result);
        return;
      }

      if (method === "POST" && path === "/v1/npc/decision") {
        const body = await readJsonBody(req);
        if (hasRunId(body)) {
          const parsed = runNpcDecisionRequestSchema.safeParse(body);
          if (!parsed.success) return badRequest(res, parsed.error);
          const result = await runService.decision(parsed.data);
          respond(res, runNpcDecisionResponseSchema, result);
          return;
        }
        const parsed = decisionRequestSchema.safeParse(body);
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = await service.decision(parsed.data.sessionId, parsed.data.beat);
        respond(res, decisionResponseSchema, result);
        return;
      }

      if (method === "GET" && path === "/v1/session/snapshot") {
        const runId = url.searchParams.get("runId");
        if (runId !== null) {
          const parsed = runSessionSnapshotRequestSchema.safeParse({
            runId,
            sessionId: url.searchParams.get("sessionId") ?? undefined,
          });
          if (!parsed.success) return badRequest(res, parsed.error);
          const result = runService.sessionSnapshot(parsed.data.runId, parsed.data.sessionId);
          respond(res, runSessionSnapshotResponseSchema, result);
          return;
        }
        const parsed = snapshotRequestSchema.safeParse({ sessionId: url.searchParams.get("sessionId") ?? undefined });
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = service.snapshot(parsed.data.sessionId);
        respond(res, snapshotResponseSchema, result);
        return;
      }

      if (method === "POST" && path === "/v1/session/end") {
        const body = await readJsonBody(req);
        if (hasRunId(body)) {
          const parsed = runSessionEndRequestSchema.safeParse(body);
          if (!parsed.success) return badRequest(res, parsed.error);
          const result = await runService.endConversation(parsed.data.runId, parsed.data.sessionId);
          respond(res, runSessionEndResponseSchema, result);
          return;
        }
        const parsed = endRequestSchema.safeParse(body);
        if (!parsed.success) return badRequest(res, parsed.error);
        const result = service.end(parsed.data.sessionId);
        respond(res, endResponseSchema, result);
        return;
      }

      writeJson(res, 404, { error: "not_found" });
    } catch (error) {
      if (res.writableEnded || res.destroyed) {
        return;
      }
      if (error instanceof SessionError) {
        writeJson(res, statusForSessionError(error), { error: error.code, message: error.message });
        return;
      }
      if (error instanceof RunError) {
        writeJson(res, statusForRunError(error), { error: error.code, message: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        writeJson(res, 400, { error: "invalid_json" });
        return;
      }
      writeJson(res, 500, { error: "internal_error", message: (error as Error).message });
    }
  });
}

/**
 * Start the session server bound to loopback. Port from `PORT` env (or the
 * `port` option); default 0 → the OS picks a free port, which we print.
 */
export async function startSessionServer(options: SessionServerOptions = {}): Promise<RunningSessionServer> {
  const service = options.service ?? new SessionService();
  const runService = options.runService ?? new RunService();
  const server = createSessionServer(service, runService);
  const host = options.host ?? LOOPBACK_HOST;
  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
  const requestedPort =
    options.port ?? (Number.isFinite(envPort) && (envPort as number) >= 0 ? Math.floor(envPort as number) : 0);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const port = address.port;
  if (options.logListen !== false) {
    // Keep this line greppable for smoke checks.
    console.log(`npc-runtime session API listening on http://${host}:${port}`);
  }

  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });

  return { server, port, host, close };
}

/** Install SIGTERM/SIGINT handlers that gracefully close the server. */
export function installGracefulShutdown(running: RunningSessionServer): void {
  let closing = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (closing) return;
    closing = true;
    console.log(`npc-runtime received ${signal}; shutting down session API`);
    running
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

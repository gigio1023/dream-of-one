// Generate deterministic Godot/API fixtures by injecting the scripted test
// adapter through the same NpcProposalPort used by production providers.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSameOrderScriptedAdapter } from "../providers/testing/same-order-script.js";
import {
  SessionService,
  type AnswerResult,
  type FullSnapshot,
  type NextTurn,
  type SessionStartResult,
} from "../runtime/session/service.js";
import { storyletDataDir } from "../runtime/storylet.js";

const PLACEHOLDER_SESSION = "sess-00000000-0000-0000-0000-000000000000";
const REPRESENTATIVE_FREE_INPUT = "저는 이 꿈에 방금 들어왔어요.";
const REPLAY_GRAPH_ROOT = "node-0";

type Answer = { type: "choice" | "free_input" | "hesitation"; choiceId?: string; text?: string };

const ROUTE_SCRIPTS: Record<string, Answer[]> = {
  clean_cover: [
    { type: "choice", choiceId: "routine.generated.1" },
    { type: "choice", choiceId: "probe.generated.1" },
  ],
  repair_recovery: [
    { type: "choice", choiceId: "routine.generated.2" },
    { type: "choice", choiceId: "probe.generated.2" },
  ],
  soft_report: [
    { type: "choice", choiceId: "routine.generated.3" },
    { type: "choice", choiceId: "probe.generated.3" },
  ],
  hard_inquest: [
    { type: "choice", choiceId: "routine.generated.3" },
    { type: "free_input", text: REPRESENTATIVE_FREE_INPUT },
    { type: "choice", choiceId: "reconciliation.generated.3" },
  ],
};

type ReplayMatch =
  | { type: "choice"; choiceId: string }
  | { type: "free_input" }
  | { type: "hesitation" };

function service(): SessionService {
  return new SessionService({ proposalPort: createSameOrderScriptedAdapter() });
}

function normalize<T>(value: T, sessionId: string): T {
  return JSON.parse(JSON.stringify(value).split(sessionId).join(PLACEHOLDER_SESSION)) as T;
}

async function drive(answers: readonly Answer[]) {
  const svc = service();
  const start = await svc.start("same-order", "ko-KR");
  let next: NextTurn | null = start.nextTurn;
  const steps: Array<{ request: unknown; response: unknown; snapshotResponse: unknown }> = [];
  for (const answer of answers) {
    if (!next) throw new Error("scripted route ran out of turns");
    const request = { sessionId: PLACEHOLDER_SESSION, turnId: next.turnId, answer };
    const response = await svc.answer(start.sessionId, next.turnId, answer);
    steps.push({
      request,
      response: normalize(response, start.sessionId),
      snapshotResponse: normalize(svc.snapshot(start.sessionId), start.sessionId),
    });
    next = response.nextTurn;
  }
  return { svc, start, steps, next };
}

async function buildEndpointExamples() {
  const svc = service();
  const start = await svc.start("same-order", "ko-KR");
  const sessionId = start.sessionId;
  const answer = await svc.answer(sessionId, start.nextTurn.turnId, {
    type: "choice",
    choiceId: "routine.generated.3",
  });
  const decision = await svc.decision(sessionId, 1);
  const snapshot = svc.snapshot(sessionId);
  if (answer.nextTurn) {
    await svc.answer(sessionId, answer.nextTurn.turnId, {
      type: "choice",
      choiceId: "probe.generated.3",
    });
  }
  const end = svc.end(sessionId);
  return {
    start: {
      endpoint: "POST /v1/session/start",
      request: { storyletId: "same-order", locale: "ko-KR" },
      response: normalize(start, sessionId),
    },
    answer: {
      endpoint: "POST /v1/session/answer",
      request: {
        sessionId: PLACEHOLDER_SESSION,
        turnId: start.nextTurn.turnId,
        answer: { type: "choice", choiceId: "routine.generated.3" },
      },
      response: normalize(answer, sessionId),
    },
    decision: {
      endpoint: "POST /v1/npc/decision",
      request: { sessionId: PLACEHOLDER_SESSION, beat: 1 },
      response: normalize(decision, sessionId),
    },
    snapshot: {
      endpoint: "GET /v1/session/snapshot",
      request: { sessionId: PLACEHOLDER_SESSION },
      response: normalize(snapshot, sessionId),
    },
    end: {
      endpoint: "POST /v1/session/end",
      request: { sessionId: PLACEHOLDER_SESSION },
      response: normalize(end, sessionId),
    },
  };
}

async function buildRouteWalkthroughs() {
  const walkthroughs = [];
  for (const [route, answers] of Object.entries(ROUTE_SCRIPTS)) {
    const run = await drive(answers);
    const end = run.svc.end(run.start.sessionId);
    if (end.route !== route) throw new Error(`route ${route} produced ${end.route}`);
    walkthroughs.push({
      route,
      answers,
      expectedOutcome: end.route,
      expectedTitle: end.outcomePanel.title,
    });
  }
  return walkthroughs;
}

async function buildRouteReplays() {
  const replays = [];
  for (const [route, answers] of Object.entries(ROUTE_SCRIPTS)) {
    const run = await drive(answers);
    const sessionId = run.start.sessionId;
    const end = run.svc.end(sessionId);
    if (end.route !== route) throw new Error(`route replay ${route} produced ${end.route}`);
    const fresh = service();
    const freshStart = await fresh.start("same-order", "ko-KR");
    replays.push({
      route,
      startResponse: normalize(run.start, sessionId),
      startSnapshotResponse: normalize(fresh.snapshot(freshStart.sessionId), freshStart.sessionId),
      steps: run.steps,
      endResponse: normalize(end, sessionId),
      expectedOutcome: end.route,
      expectedTitle: end.outcomePanel.title,
    });
  }
  return replays;
}

interface ReplayHistoryResult {
  service: SessionService;
  startResponse: SessionStartResult;
  sessionId: string;
  nextTurn: NextTurn | null;
  lastRequest?: { sessionId: string; turnId: string; answer: Answer };
  lastResponse?: AnswerResult;
  snapshotResponse: FullSnapshot;
}

async function replayHistory(history: readonly Answer[]): Promise<ReplayHistoryResult> {
  const svc = service();
  const startResponse = await svc.start("same-order", "ko-KR");
  const sessionId = startResponse.sessionId;
  let nextTurn: NextTurn | null = startResponse.nextTurn;
  let lastRequest: ReplayHistoryResult["lastRequest"];
  let lastResponse: AnswerResult | undefined;
  for (const answer of history) {
    if (!nextTurn) throw new Error("replay history reached terminal before all answers");
    lastRequest = { sessionId, turnId: nextTurn.turnId, answer };
    lastResponse = await svc.answer(sessionId, nextTurn.turnId, answer);
    nextTurn = lastResponse.nextTurn;
  }
  return {
    service: svc,
    startResponse,
    sessionId,
    nextTurn,
    lastRequest,
    lastResponse,
    snapshotResponse: svc.snapshot(sessionId),
  };
}

function variantsFor(nextTurn: NextTurn): Array<{ match: ReplayMatch; answer: Answer }> {
  const variants = nextTurn.choices.map(choice => ({
    match: { type: "choice", choiceId: choice.choiceId } as ReplayMatch,
    answer: { type: "choice", choiceId: choice.choiceId } as Answer,
  }));
  variants.push({ match: { type: "hesitation" }, answer: { type: "hesitation" } });
  if (nextTurn.acceptsFreeInput) {
    variants.push({
      match: { type: "free_input" },
      answer: { type: "free_input", text: REPRESENTATIVE_FREE_INPUT },
    });
  }
  return variants;
}

async function buildReplayGraph() {
  const initial = await replayHistory([]);
  const nodes: Record<string, unknown> = {};

  const expand = async (history: readonly Answer[], nodeId: string): Promise<void> => {
    const current = await replayHistory(history);
    if (!current.nextTurn) throw new Error(`replay graph node ${nodeId} has no next turn`);
    const node: {
      nextTurn: unknown;
      endResponse: unknown;
      variants: Array<Record<string, unknown>>;
    } = {
      nextTurn: normalize(current.nextTurn, current.sessionId),
      endResponse: normalize(current.service.end(current.sessionId), current.sessionId),
      variants: [],
    };
    nodes[nodeId] = node;

    for (const [index, candidate] of variantsFor(current.nextTurn).entries()) {
      const branch = await replayHistory([...history, candidate.answer]);
      if (!branch.lastRequest || !branch.lastResponse) throw new Error("replay branch produced no answer");
      const variant: Record<string, unknown> = {
        match: candidate.match,
        request: normalize(branch.lastRequest, branch.sessionId),
        response: normalize(branch.lastResponse, branch.sessionId),
        snapshotResponse: normalize(branch.snapshotResponse, branch.sessionId),
      };
      if (branch.nextTurn) {
        const nextNodeId = `${nodeId}-${index}`;
        variant.nextNodeId = nextNodeId;
        node.variants.push(variant);
        await expand([...history, candidate.answer], nextNodeId);
      } else {
        variant.endResponse = normalize(branch.service.end(branch.sessionId), branch.sessionId);
        node.variants.push(variant);
      }
    }
  };

  await expand([], REPLAY_GRAPH_ROOT);
  return {
    startResponse: normalize(initial.startResponse, initial.sessionId),
    startSnapshotResponse: normalize(initial.snapshotResponse, initial.sessionId),
    rootNodeId: REPLAY_GRAPH_ROOT,
    nodes,
  };
}

async function main(): Promise<void> {
  const fixtures = {
    note: "Generated through ScriptedNpcAdapter using the production NpcProposalPort and SessionService paths. Regenerate with `bun run --cwd backend/npc-runtime fixtures:generate`.",
    storyletId: "same-order",
    locale: "ko-KR",
    placeholderSessionId: PLACEHOLDER_SESSION,
    endpoints: await buildEndpointExamples(),
    routeWalkthroughs: await buildRouteWalkthroughs(),
    routeReplays: await buildRouteReplays(),
    replayGraph: await buildReplayGraph(),
  };
  const backendPath = resolve(storyletDataDir(), "..", "fixtures", "session-api-examples.json");
  const repoRoot = resolve(storyletDataDir(), "..", "..", "..", "..");
  const godotPath = resolve(repoRoot, "godot", "data", "fixtures", "session-api-examples.json");
  const body = `${JSON.stringify(fixtures, null, 2)}\n`;
  writeFileSync(backendPath, body, "utf-8");
  writeFileSync(godotPath, body, "utf-8");
  console.log(`wrote ${backendPath}`);
  console.log(`wrote ${godotPath}`);
}

await main();

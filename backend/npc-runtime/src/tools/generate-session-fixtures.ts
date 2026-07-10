// Generates data/fixtures/session-api-examples.json from real session flows so
// the client fixtures match the live server exactly. Re-run after any Session
// API shape change: `npm run fixtures:generate`.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
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

interface RouteReplayStep {
  request: {
    sessionId: string;
    turnId: string;
    answer: Answer;
  };
  response: unknown;
  snapshotResponse: unknown;
}

interface RouteReplay {
  route: string;
  startResponse: unknown;
  startSnapshotResponse: unknown;
  steps: RouteReplayStep[];
  endResponse: unknown;
  expectedOutcome: string;
  expectedTitle: string;
}

type ReplayMatch =
  | { type: "choice"; choiceId: string }
  | { type: "free_input" }
  | { type: "hesitation" };

interface ReplayGraphVariant {
  match: ReplayMatch;
  request: {
    sessionId: string;
    turnId: string;
    answer: Answer;
  };
  response: unknown;
  snapshotResponse: unknown;
  nextNodeId?: string;
  endResponse?: unknown;
}

interface ReplayGraphNode {
  nextTurn: unknown;
  endResponse: unknown;
  variants: ReplayGraphVariant[];
}

interface ReplayHistoryResult {
  service: SessionService;
  startResponse: SessionStartResult;
  sessionId: string;
  nextTurn: NextTurn | null;
  lastRequest?: {
    sessionId: string;
    turnId: string;
    answer: Answer;
  };
  lastResponse?: AnswerResult;
  snapshotResponse: FullSnapshot;
}

const ROUTE_SCRIPTS: Record<string, Answer[]> = {
  clean_cover: [
    { type: "choice", choiceId: "routine.safe" },
    { type: "choice", choiceId: "probe.safe" },
  ],
  repair_recovery: [
    { type: "choice", choiceId: "routine.repair" },
    { type: "choice", choiceId: "probe.repair" },
  ],
  soft_report: [
    { type: "choice", choiceId: "routine.risky" },
    { type: "choice", choiceId: "probe.risky" },
  ],
  hard_inquest: [
    { type: "choice", choiceId: "routine.risky" },
    { type: "free_input", text: "저는 이 꿈에 방금 들어왔어요." },
    { type: "choice", choiceId: "reconciliation.risky" },
  ],
};

function normalize<T>(value: T, sessionId: string): T {
  return JSON.parse(JSON.stringify(value).split(sessionId).join(PLACEHOLDER_SESSION)) as T;
}

function buildEndpointExamples() {
  const svc = new SessionService();
  const start = svc.start("same-order", "ko-KR");
  const sessionId = start.sessionId;

  const startExample = {
    endpoint: "POST /v1/session/start",
    request: { storyletId: "same-order", locale: "ko-KR" },
    response: normalize(start, sessionId),
  };

  const answer = svc.answer(sessionId, start.nextTurn.turnId, { type: "choice", choiceId: "routine.risky" });
  const answerExample = {
    endpoint: "POST /v1/session/answer",
    request: {
      sessionId: PLACEHOLDER_SESSION,
      turnId: start.nextTurn.turnId,
      answer: { type: "choice", choiceId: "routine.risky" },
    },
    response: normalize(answer, sessionId),
  };

  const decision = svc.decision(sessionId, 1);
  const decisionExample = {
    endpoint: "POST /v1/npc/decision",
    request: { sessionId: PLACEHOLDER_SESSION, beat: 1 },
    response: normalize(decision, sessionId),
  };

  const snapshot = svc.snapshot(sessionId);
  const snapshotExample = {
    endpoint: "GET /v1/session/snapshot",
    request: { sessionId: PLACEHOLDER_SESSION },
    response: normalize(snapshot, sessionId),
  };

  // Complete the conversation to show a terminal end response.
  const s2 = svc.snapshot(sessionId);
  if (s2.nextTurn) {
    svc.answer(sessionId, s2.nextTurn.turnId, { type: "choice", choiceId: "probe.risky" });
  }
  const end = svc.end(sessionId);
  const endExample = {
    endpoint: "POST /v1/session/end",
    request: { sessionId: PLACEHOLDER_SESSION },
    response: normalize(end, sessionId),
  };

  return {
    start: startExample,
    answer: answerExample,
    decision: decisionExample,
    snapshot: snapshotExample,
    end: endExample,
  };
}

function buildRouteWalkthroughs() {
  const walkthroughs: Array<{ route: string; answers: Answer[]; expectedOutcome: string; expectedTitle: string }> = [];
  for (const [route, answers] of Object.entries(ROUTE_SCRIPTS)) {
    const svc = new SessionService();
    const start = svc.start("same-order", "ko-KR");
    let next = start.nextTurn as { turnId: string } | null;
    for (const ans of answers) {
      if (!next) break;
      const res = svc.answer(start.sessionId, next.turnId, ans);
      next = res.nextTurn;
    }
    const end = svc.end(start.sessionId);
    walkthroughs.push({
      route,
      answers,
      expectedOutcome: end.route,
      expectedTitle: end.outcomePanel.title,
    });
  }
  return walkthroughs;
}

function buildRouteReplays(): RouteReplay[] {
  const replays: RouteReplay[] = [];
  for (const [route, answers] of Object.entries(ROUTE_SCRIPTS)) {
    const svc = new SessionService();
    const start = svc.start("same-order", "ko-KR");
    const sessionId = start.sessionId;
    const startSnapshot = svc.snapshot(sessionId);
    const steps: RouteReplayStep[] = [];
    let next = start.nextTurn as { turnId: string } | null;

    for (const [index, answer] of answers.entries()) {
      if (!next) {
        throw new Error(`route replay ${route} ran out of turns before answer ${index + 1}`);
      }
      const request = {
        sessionId: PLACEHOLDER_SESSION,
        turnId: next.turnId,
        answer,
      };
      const response = svc.answer(sessionId, next.turnId, answer);
      steps.push({
        request,
        response: normalize(response, sessionId),
        snapshotResponse: normalize(svc.snapshot(sessionId), sessionId),
      });
      next = response.nextTurn;
    }

    const end = svc.end(sessionId);
    if (end.route !== route) {
      throw new Error(`route replay ${route} produced ${end.route}`);
    }
    replays.push({
      route,
      startResponse: normalize(start, sessionId),
      startSnapshotResponse: normalize(startSnapshot, sessionId),
      steps,
      endResponse: normalize(end, sessionId),
      expectedOutcome: end.route,
      expectedTitle: end.outcomePanel.title,
    });
  }
  return replays;
}

function replayHistory(history: readonly Answer[]): ReplayHistoryResult {
  const service = new SessionService();
  const startResponse = service.start("same-order", "ko-KR");
  const sessionId = startResponse.sessionId;
  let nextTurn: NextTurn | null = startResponse.nextTurn;
  let lastRequest: ReplayHistoryResult["lastRequest"];
  let lastResponse: AnswerResult | undefined;

  for (const [index, answer] of history.entries()) {
    if (!nextTurn) {
      throw new Error(`replay history reached a terminal state before answer ${index + 1}`);
    }
    lastRequest = { sessionId, turnId: nextTurn.turnId, answer };
    lastResponse = service.answer(sessionId, nextTurn.turnId, answer);
    nextTurn = lastResponse.nextTurn;
  }

  return {
    service,
    startResponse,
    sessionId,
    nextTurn,
    lastRequest,
    lastResponse,
    snapshotResponse: service.snapshot(sessionId),
  };
}

function variantsFor(nextTurn: NextTurn): Array<{ match: ReplayMatch; answer: Answer }> {
  const variants: Array<{ match: ReplayMatch; answer: Answer }> = nextTurn.choices.map(choice => ({
    match: { type: "choice", choiceId: choice.choiceId },
    answer: { type: "choice", choiceId: choice.choiceId },
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

function buildReplayGraph() {
  const initial = replayHistory([]);
  const nodes: Record<string, ReplayGraphNode> = {};

  const expand = (history: readonly Answer[], nodeId: string): void => {
    const current = replayHistory(history);
    if (!current.nextTurn) {
      throw new Error(`replay graph node ${nodeId} has no next turn`);
    }

    const node: ReplayGraphNode = {
      nextTurn: normalize(current.nextTurn, current.sessionId),
      endResponse: normalize(current.service.end(current.sessionId), current.sessionId),
      variants: [],
    };
    nodes[nodeId] = node;

    for (const [index, candidate] of variantsFor(current.nextTurn).entries()) {
      const branchHistory = [...history, candidate.answer];
      const branch = replayHistory(branchHistory);
      if (!branch.lastRequest || !branch.lastResponse) {
        throw new Error(`replay graph branch ${nodeId}:${index} produced no answer response`);
      }

      const variant: ReplayGraphVariant = {
        match: candidate.match,
        request: normalize(branch.lastRequest, branch.sessionId),
        response: normalize(branch.lastResponse, branch.sessionId),
        snapshotResponse: normalize(branch.snapshotResponse, branch.sessionId),
      };

      if (branch.nextTurn) {
        const nextNodeId = `${nodeId}-${index}`;
        variant.nextNodeId = nextNodeId;
        node.variants.push(variant);
        expand(branchHistory, nextNodeId);
      } else {
        variant.endResponse = normalize(branch.service.end(branch.sessionId), branch.sessionId);
        node.variants.push(variant);
      }
    }
  };

  expand([], REPLAY_GRAPH_ROOT);
  return {
    startResponse: normalize(initial.startResponse, initial.sessionId),
    startSnapshotResponse: normalize(initial.snapshotResponse, initial.sessionId),
    rootNodeId: REPLAY_GRAPH_ROOT,
    nodes,
  };
}

function main(): void {
  const fixtures = {
    note: "Generated from live SessionService responses; sessionId normalized to a placeholder. Regenerate with `npm run fixtures:generate`.",
    storyletId: "same-order",
    locale: "ko-KR",
    placeholderSessionId: PLACEHOLDER_SESSION,
    endpoints: buildEndpointExamples(),
    routeWalkthroughs: buildRouteWalkthroughs(),
    routeReplays: buildRouteReplays(),
    replayGraph: buildReplayGraph(),
  };
  const dir = resolve(storyletDataDir(), "..", "fixtures");
  const outPath = resolve(dir, "session-api-examples.json");
  writeFileSync(outPath, `${JSON.stringify(fixtures, null, 2)}\n`, "utf-8");
  console.log(`wrote ${outPath}`);
}

main();

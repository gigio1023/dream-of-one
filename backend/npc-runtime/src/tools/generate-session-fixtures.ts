// Generates data/fixtures/session-api-examples.json from real session flows so
// the client fixtures match the live server exactly. Re-run after any Session
// API shape change: `npm run fixtures:generate`.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SessionService } from "../runtime/session/service.js";
import { storyletDataDir } from "../runtime/storylet.js";

const PLACEHOLDER_SESSION = "sess-00000000-0000-0000-0000-000000000000";

type Answer = { type: "choice" | "free_input" | "hesitation"; choiceId?: string; text?: string };

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

function main(): void {
  const fixtures = {
    note: "Generated from live SessionService responses; sessionId normalized to a placeholder. Regenerate with `npm run fixtures:generate`.",
    storyletId: "same-order",
    locale: "ko-KR",
    placeholderSessionId: PLACEHOLDER_SESSION,
    endpoints: buildEndpointExamples(),
    routeWalkthroughs: buildRouteWalkthroughs(),
  };
  const dir = resolve(storyletDataDir(), "..", "fixtures");
  const outPath = resolve(dir, "session-api-examples.json");
  writeFileSync(outPath, `${JSON.stringify(fixtures, null, 2)}\n`, "utf-8");
  console.log(`wrote ${outPath}`);
}

main();

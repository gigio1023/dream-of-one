import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SessionService } from "../../src/runtime/session/service.js";
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
} from "../../src/api/session-schemas.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesPath = resolve(here, "..", "..", "data", "fixtures", "session-api-examples.json");
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf-8"));

test("every endpoint fixture validates against the live request and response schemas", () => {
  const e = fixtures.endpoints;
  startRequestSchema.parse(e.start.request);
  startResponseSchema.parse(e.start.response);

  answerRequestSchema.parse(e.answer.request);
  answerResponseSchema.parse(e.answer.response);

  decisionRequestSchema.parse(e.decision.request);
  decisionResponseSchema.parse(e.decision.response);

  snapshotRequestSchema.parse(e.snapshot.request);
  snapshotResponseSchema.parse(e.snapshot.response);

  endRequestSchema.parse(e.end.request);
  endResponseSchema.parse(e.end.response);
});

test("scripted route walkthroughs deterministically reach each route", () => {
  assert.equal(fixtures.routeWalkthroughs.length, 4);
  for (const walkthrough of fixtures.routeWalkthroughs) {
    const svc = new SessionService();
    const start = svc.start(fixtures.storyletId, fixtures.locale);
    let next: { turnId: string } | null = start.nextTurn;
    for (const answer of walkthrough.answers) {
      assert.ok(next, `walkthrough ${walkthrough.route} ran out of turns`);
      const res = svc.answer(start.sessionId, next.turnId, answer);
      next = res.nextTurn;
    }
    const end = svc.end(start.sessionId);
    assert.equal(end.route, walkthrough.route, `walkthrough ${walkthrough.route} produced ${end.route}`);
    assert.equal(end.route, walkthrough.expectedOutcome);
    assert.equal(end.outcomePanel.title, walkthrough.expectedTitle);
  }
});

import assert from "node:assert/strict";
import { test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SessionService } from "../../src/runtime/session/service.js";
import { createSameOrderScriptedAdapter } from "../../src/providers/testing/same-order-script.js";
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

test("scripted adapter walkthroughs reach each deterministic route", async () => {
  assert.equal(fixtures.routeWalkthroughs.length, 4);
  for (const walkthrough of fixtures.routeWalkthroughs) {
    const svc = new SessionService({ proposalPort: createSameOrderScriptedAdapter() });
    const start = await svc.start(fixtures.storyletId, fixtures.locale);
    let next: { turnId: string } | null = start.nextTurn;
    for (const answer of walkthrough.answers) {
      assert.ok(next, `walkthrough ${walkthrough.route} ran out of turns`);
      const res = await svc.answer(start.sessionId, next.turnId, answer);
      next = res.nextTurn;
    }
    const end = await svc.end(start.sessionId);
    assert.equal(end.route, walkthrough.route, `walkthrough ${walkthrough.route} produced ${end.route}`);
    assert.equal(end.route, walkthrough.expectedOutcome);
    assert.equal(end.outcomePanel.title, walkthrough.expectedTitle);
  }
});

test("generated route replays are schema-valid and route/end consistent", () => {
  assert.equal(fixtures.routeReplays.length, 4);
  assert.deepEqual(
    fixtures.routeReplays.map((replay: any) => replay.route).sort(),
    fixtures.routeWalkthroughs.map((walkthrough: any) => walkthrough.route).sort(),
  );

  for (const replay of fixtures.routeReplays) {
    const start = startResponseSchema.parse(replay.startResponse);
    const startSnapshot = snapshotResponseSchema.parse(replay.startSnapshotResponse);
    assert.equal(start.sessionId, fixtures.placeholderSessionId);
    assert.equal(startSnapshot.sessionId, fixtures.placeholderSessionId);
    assert.deepEqual(startSnapshot.worldSnapshot, start.worldSnapshot);
    assert.deepEqual(startSnapshot.nextTurn, start.nextTurn);

    let expectedTurn: { turnId: string } | null = start.nextTurn;
    for (const [index, replayStep] of replay.steps.entries()) {
      const request = answerRequestSchema.parse(replayStep.request);
      const response = answerResponseSchema.parse(replayStep.response);
      const snapshot = snapshotResponseSchema.parse(replayStep.snapshotResponse);

      assert.equal(request.sessionId, fixtures.placeholderSessionId);
      assert.ok(expectedTurn, `route replay ${replay.route} ran out of turns before step ${index + 1}`);
      assert.equal(request.turnId, expectedTurn.turnId);
      assert.equal(snapshot.sessionId, fixtures.placeholderSessionId);
      assert.deepEqual(snapshot.routeState, response.routeState);
      assert.deepEqual(snapshot.nextTurn, response.nextTurn);
      expectedTurn = response.nextTurn;
    }

    const end = endResponseSchema.parse(replay.endResponse);
    const finalStep = replay.steps[replay.steps.length - 1];
    assert.ok(finalStep, `route replay ${replay.route} has no answer steps`);
    const finalAnswer = answerResponseSchema.parse(finalStep.response);
    const finalSnapshot = snapshotResponseSchema.parse(finalStep.snapshotResponse);

    assert.equal(finalAnswer.nextTurn, null);
    assert.equal(finalAnswer.routeState.terminal, true);
    assert.equal(finalAnswer.routeState.projectedRoute, replay.route);
    assert.equal(finalSnapshot.routeState.projectedRoute, replay.route);
    assert.equal(end.route, replay.route);
    assert.equal(end.route, replay.expectedOutcome);
    assert.equal(end.telemetrySummary.route, replay.route);
    assert.equal(end.telemetrySummary.turns, replay.steps.length);
    assert.equal(end.outcomePanel.title, replay.expectedTitle);
  }
});

test("replay graph covers every exposed answer and has consistent terminal edges", () => {
  const graph = fixtures.replayGraph;
  const start = startResponseSchema.parse(graph.startResponse);
  const startSnapshot = snapshotResponseSchema.parse(graph.startSnapshotResponse);
  assert.equal(start.sessionId, fixtures.placeholderSessionId);
  assert.equal(startSnapshot.sessionId, fixtures.placeholderSessionId);
  assert.deepEqual(startSnapshot.worldSnapshot, start.worldSnapshot);
  assert.deepEqual(startSnapshot.nextTurn, start.nextTurn);
  assert.ok(graph.nodes[graph.rootNodeId], "replay graph root node is missing");

  const visitedNodeIds = new Set<string>();
  const visitedBeatIds = new Set<string>();
  const terminalRoutes = new Set<string>();
  const freeInputSamples = new Set<string>();
  let edgeCount = 0;

  const matchKey = (match: any): string =>
    match.type === "choice" ? `choice:${match.choiceId}` : match.type;

  const visit = (nodeId: string, expectedNextTurn: any, expectedSnapshot: any, depth: number): void => {
    assert.ok(!visitedNodeIds.has(nodeId), `replay graph cycle or duplicate node: ${nodeId}`);
    visitedNodeIds.add(nodeId);
    const node = graph.nodes[nodeId];
    assert.ok(node, `replay graph references missing node: ${nodeId}`);
    assert.deepEqual(node.nextTurn, expectedNextTurn);
    visitedBeatIds.add(node.nextTurn.beatId);

    const nodeEnd = endResponseSchema.parse(node.endResponse);
    assert.equal(nodeEnd.route, expectedSnapshot.routeState.projectedRoute);
    assert.equal(nodeEnd.telemetrySummary.route, nodeEnd.route);
    assert.equal(nodeEnd.telemetrySummary.turns, depth);
    assert.equal(nodeEnd.telemetrySummary.finalSuspicion, expectedSnapshot.routeState.suspicion);
    assert.equal(nodeEnd.telemetrySummary.finalReportPressure, expectedSnapshot.routeState.reportPressure);

    const expectedMatches = node.nextTurn.choices.map((choice: any) => `choice:${choice.choiceId}`);
    expectedMatches.push("hesitation");
    if (node.nextTurn.acceptsFreeInput) {
      expectedMatches.push("free_input");
    }
    const actualMatches = node.variants.map((variant: any) => matchKey(variant.match));
    assert.equal(new Set(actualMatches).size, actualMatches.length, `duplicate match in ${nodeId}`);
    assert.deepEqual(actualMatches.sort(), expectedMatches.sort(), `incomplete variants in ${nodeId}`);

    for (const variant of node.variants) {
      edgeCount += 1;
      const request = answerRequestSchema.parse(variant.request);
      const response = answerResponseSchema.parse(variant.response);
      const snapshot = snapshotResponseSchema.parse(variant.snapshotResponse);

      assert.equal(request.sessionId, fixtures.placeholderSessionId);
      assert.equal(request.turnId, node.nextTurn.turnId);
      assert.equal(request.answer.type, variant.match.type);
      assert.equal(snapshot.sessionId, fixtures.placeholderSessionId);
      assert.deepEqual(snapshot.routeState, response.routeState);
      assert.deepEqual(snapshot.nextTurn, response.nextTurn);

      if (variant.match.type === "choice") {
        assert.deepEqual(Object.keys(variant.match).sort(), ["choiceId", "type"]);
        assert.equal(request.answer.choiceId, variant.match.choiceId);
      } else {
        assert.deepEqual(Object.keys(variant.match), ["type"]);
        assert.equal(request.answer.choiceId, undefined);
      }
      if (variant.match.type === "free_input") {
        assert.ok(request.answer.text, `free-input variant in ${nodeId} has no representative text`);
        freeInputSamples.add(request.answer.text);
      }

      if (response.routeState.terminal) {
        assert.equal(response.nextTurn, null);
        assert.equal(variant.nextNodeId, undefined);
        assert.ok(variant.endResponse, `terminal variant in ${nodeId} has no end response`);
        const end = endResponseSchema.parse(variant.endResponse);
        terminalRoutes.add(end.route);
        assert.equal(end.route, response.routeState.projectedRoute);
        assert.equal(end.route, snapshot.routeState.projectedRoute);
        assert.equal(end.telemetrySummary.route, end.route);
        assert.equal(end.telemetrySummary.turns, depth + 1);
        assert.equal(end.telemetrySummary.finalSuspicion, response.routeState.suspicion);
        assert.equal(end.telemetrySummary.finalReportPressure, response.routeState.reportPressure);
      } else {
        assert.ok(response.nextTurn, `nonterminal variant in ${nodeId} has no next turn`);
        assert.equal(variant.endResponse, undefined);
        assert.ok(variant.nextNodeId, `nonterminal variant in ${nodeId} has no next node`);
        visit(variant.nextNodeId, response.nextTurn, snapshot, depth + 1);
      }
    }
  };

  visit(graph.rootNodeId, start.nextTurn, startSnapshot, 0);
  assert.equal(visitedNodeIds.size, Object.keys(graph.nodes).length, "replay graph has orphan nodes");
  assert.ok(edgeCount > visitedNodeIds.size, "replay graph should branch at every exposed turn");
  assert.deepEqual([...visitedBeatIds].sort(), ["probe", "reconciliation", "routine"]);
  assert.deepEqual(
    [...terminalRoutes].sort(),
    ["clean_cover", "hard_inquest", "repair_recovery", "soft_report"],
  );
  assert.equal(freeInputSamples.size, 1, "replay graph should use one representative free-input sample");
});

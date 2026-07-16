import assert from "node:assert/strict";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import type { RunService } from "../../src/runtime/run-service.js";
import type { RunActorSpatialFacts, RunSnapshot } from "../../src/runtime/run-schema.js";

export function runSpatialActors(snapshot: RunSnapshot): RunActorSpatialFacts[] {
  const layout = loadRunLayout();
  return snapshot.scheduler.actors.map(schedulerActor => {
    const position = layout.anchorPositions[schedulerActor.confirmedAnchorRef];
    assert.ok(position, `missing position for ${schedulerActor.confirmedAnchorRef}`);
    const block = schedulerActor.currentBlock;
    const reachableAnchorRefs = block?.targetKind === "anchor"
      ? [block.targetId]
      : block?.targetKind === "route"
        ? [...new Set(layout.routes.find(route => route.routeId === block.targetId)?.points ?? [])]
        : [];
    return {
      actorId: schedulerActor.actorId,
      position: [position[0], position[1], position[2]],
      reachableAnchorRefs,
      visibleActorIds: [],
      audibleActorIds: [],
      visibleObjectIds: [],
      playerVisible: false,
      playerAudible: false,
      playerReachable: false,
      playerInteractionZoneId: null,
    };
  });
}

/** Rebase one already-preloaded opening onto current engine-equivalent contact facts. */
export async function groundOrdinaryConversation(
  service: RunService,
  runId: string,
  actorId: string,
  interactionZoneId: string,
  advanceId: string,
  mutuallyVisibleAudiblePairs: ReadonlyArray<readonly [string, string]> = [],
): Promise<RunSnapshot> {
  const snapshot = service.snapshot(runId);
  const actor = snapshot.actors.find(candidate => candidate.actorId === actorId);
  assert.ok(actor);
  const actors = runSpatialActors(snapshot);
  const facts = actors.find(candidate => candidate.actorId === actorId);
  assert.ok(facts);
  facts.playerVisible = true;
  facts.playerAudible = true;
  facts.playerReachable = true;
  facts.playerInteractionZoneId = interactionZoneId;
  for (const [firstId, secondId] of mutuallyVisibleAudiblePairs) {
    const first = actors.find(candidate => candidate.actorId === firstId);
    const second = actors.find(candidate => candidate.actorId === secondId);
    assert.ok(first && second);
    first.visibleActorIds = [...new Set([...first.visibleActorIds, secondId])].sort();
    first.audibleActorIds = [...new Set([...first.audibleActorIds, secondId])].sort();
    second.visibleActorIds = [...new Set([...second.visibleActorIds, firstId])].sort();
    second.audibleActorIds = [...new Set([...second.audibleActorIds, firstId])].sort();
  }
  await service.advance({
    runId,
    advanceId,
    observedWorldRevision: snapshot.worldRevision,
    elapsedSeconds: 0,
    arrivals: [],
    spatialFacts: {
      observedWorldRevision: snapshot.worldRevision,
      player: { position: [...facts.position], locationId: actor.locationId },
      actors,
    },
  });
  return service.snapshot(runId);
}

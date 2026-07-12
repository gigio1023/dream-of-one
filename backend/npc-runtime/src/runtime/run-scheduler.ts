import type {
  RunArrivalApplied,
  RunArrivalObservation,
  RunArrivalRejected,
  RunMovementDelta,
  RunScheduleWake,
  RunSchedulerSnapshot,
} from "./run-schema.js";
import type {
  RunLayout,
  RunLayoutActor,
  RunLayoutRoute,
  RunScheduleBlock,
} from "./run-layout.js";

export const ROUTE_CADENCE_SECONDS = 15;
const MAX_SUPERSEDED_MOVEMENTS = 64;

export interface RunSchedulerActorState {
  currentBlockId: string | null;
  confirmedAnchorRef: string;
  routePointIndex: number | null;
  routePointArrivedAtSeconds: number | null;
  pendingMovement: RunSchedulerSnapshot["actors"][number]["pendingMovement"];
  supersededMovementIds: Set<string>;
}

export interface RunSchedulerRuntime {
  actors: Map<string, RunSchedulerActorState>;
  pendingWakes: Map<string, RunScheduleWake>;
  emittedWakeIds: Set<string>;
  nextMovementSequence: number;
}

export interface SchedulerAdvanceResult {
  arrivalsApplied: RunArrivalApplied[];
  arrivalsRejected: RunArrivalRejected[];
  scheduleWakes: RunScheduleWake[];
  movementDeltas: RunMovementDelta[];
}

function anchorLocationId(anchorRef: string): string {
  return anchorRef.split(".", 1)[0] ?? anchorRef;
}

function blockAt(actor: RunLayoutActor, elapsedSeconds: number): RunScheduleBlock | null {
  return (
    actor.scheduleBlocks.find(
      block => block.startSeconds <= elapsedSeconds && elapsedSeconds < block.endSeconds,
    ) ?? null
  );
}

function routeById(layout: RunLayout, routeId: string): RunLayoutRoute {
  const found = layout.routes.find(candidate => candidate.routeId === routeId);
  if (!found) throw new Error(`layout route disappeared after validation: ${routeId}`);
  return found;
}

function stateFor(runtime: RunSchedulerRuntime, actorId: string): RunSchedulerActorState {
  const found = runtime.actors.get(actorId);
  if (!found) throw new Error(`scheduler actor missing: ${actorId}`);
  return found;
}

function samePosition(layout: RunLayout, firstRef: string, secondRef: string): boolean {
  const first = layout.anchorPositions[firstRef];
  const second = layout.anchorPositions[secondRef];
  return Boolean(
    first &&
      second &&
      first.every((coordinate, index) => coordinate === second[index]),
  );
}

function rememberSuperseded(state: RunSchedulerActorState, movementId: string): void {
  state.supersededMovementIds.add(movementId);
  while (state.supersededMovementIds.size > MAX_SUPERSEDED_MOVEMENTS) {
    const oldest = state.supersededMovementIds.values().next().value as string | undefined;
    if (!oldest) break;
    state.supersededMovementIds.delete(oldest);
  }
}

export function createRunScheduler(layout: RunLayout): RunSchedulerRuntime {
  const actors = new Map<string, RunSchedulerActorState>();
  for (const actor of layout.actors) {
    const block = blockAt(actor, 0);
    let confirmedAnchorRef = actor.spawnAnchorRef;
    let routePointIndex: number | null = null;
    let routePointArrivedAtSeconds: number | null = null;
    if (block?.target.kind === "anchor" && samePosition(layout, actor.spawnAnchorRef, block.target.id)) {
      // Distinct semantic anchors can intentionally share one physical point.
      confirmedAnchorRef = block.target.id;
    } else if (block?.target.kind === "route") {
      const initialIndex = routeById(layout, block.target.id).points.indexOf(actor.spawnAnchorRef);
      if (initialIndex >= 0) {
        routePointIndex = initialIndex;
        routePointArrivedAtSeconds = 0;
      }
    }
    actors.set(actor.actorId, {
      currentBlockId: block?.blockId ?? null,
      confirmedAnchorRef,
      routePointIndex,
      routePointArrivedAtSeconds,
      pendingMovement: null,
      supersededMovementIds: new Set(),
    });
  }
  return {
    actors,
    pendingWakes: new Map(),
    emittedWakeIds: new Set(),
    nextMovementSequence: 1,
  };
}

function desiredAnchor(
  layout: RunLayout,
  state: RunSchedulerActorState,
  block: RunScheduleBlock | null,
): string | null {
  if (!block) return null;
  if (state.pendingMovement) return state.pendingMovement.targetAnchorRef;
  if (block.target.kind === "anchor") return block.target.id;
  const points = routeById(layout, block.target.id).points;
  return state.routePointIndex === null ? points[0] ?? null : points[state.routePointIndex] ?? null;
}

export function snapshotRunScheduler(
  layout: RunLayout,
  runtime: RunSchedulerRuntime,
  elapsedSeconds: number,
): RunSchedulerSnapshot {
  return {
    routeCadenceSeconds: ROUTE_CADENCE_SECONDS,
    activeMeetingWindowIds: layout.meetingWindows
      .filter(window => window.startSeconds <= elapsedSeconds && elapsedSeconds < window.endSeconds)
      .map(window => window.windowId),
    pendingWakes: [...runtime.pendingWakes.values()]
      .sort((first, second) =>
        first.scheduledAtSeconds === second.scheduledAtSeconds
          ? first.wakeId.localeCompare(second.wakeId)
          : first.scheduledAtSeconds - second.scheduledAtSeconds,
      )
      .map(wake => structuredClone(wake)),
    actors: layout.actors.map(actor => {
      const state = stateFor(runtime, actor.actorId);
      const block = blockAt(actor, elapsedSeconds);
      const routeActive = block?.target.kind === "route";
      return {
        actorId: actor.actorId,
        routeId: actor.routeId,
        currentBlock: block
          ? {
              blockId: block.blockId,
              startSeconds: block.startSeconds,
              endSeconds: block.endSeconds,
              activity: block.activity,
              targetKind: block.target.kind,
              targetId: block.target.id,
            }
          : null,
        confirmedAnchorRef: state.confirmedAnchorRef,
        desiredAnchorRef: desiredAnchor(layout, state, block),
        routePointIndex: routeActive ? state.routePointIndex : null,
        routePointArrivedAtSeconds: routeActive ? state.routePointArrivedAtSeconds : null,
        nextRouteMoveAtSeconds:
          routeActive && state.pendingMovement === null && state.routePointArrivedAtSeconds !== null
            ? state.routePointArrivedAtSeconds + ROUTE_CADENCE_SECONDS
            : null,
        pendingMovement: state.pendingMovement ? structuredClone(state.pendingMovement) : null,
      };
    }) as RunSchedulerSnapshot["actors"],
  };
}

export function emitRunWake(
  runtime: RunSchedulerRuntime,
  value: RunScheduleWake,
  emitted: RunScheduleWake[],
): void {
  if (runtime.emittedWakeIds.has(value.wakeId)) return;
  runtime.emittedWakeIds.add(value.wakeId);
  emitted.push(value);
  if (value.status === "pending") runtime.pendingWakes.set(value.wakeId, value);
}

export function claimRunWake(
  runtime: RunSchedulerRuntime,
  wakeId: string,
): RunScheduleWake | null {
  const wake = runtime.pendingWakes.get(wakeId);
  if (!wake || wake.status !== "pending") return null;
  const claimed = { ...wake, status: "claimed" as const };
  runtime.pendingWakes.set(wakeId, claimed);
  return structuredClone(claimed);
}

export function finishRunWake(
  runtime: RunSchedulerRuntime,
  wakeId: string,
  status: "completed" | "terminal",
): void {
  const wake = runtime.pendingWakes.get(wakeId);
  if (!wake) return;
  runtime.pendingWakes.set(wakeId, { ...wake, status });
  // Completed lifecycle is retained by the signature-bound decision attempt;
  // only actionable/claimed wakes belong in the scheduler snapshot.
  runtime.pendingWakes.delete(wakeId);
}

function issueMovement(options: {
  runId: string;
  runtime: RunSchedulerRuntime;
  actor: RunLayoutActor;
  state: RunSchedulerActorState;
  block: RunScheduleBlock;
  targetAnchorRef: string;
  routePointIndex: number | null;
  issuedAtSeconds: number;
  movementDeltas: RunMovementDelta[];
}): void {
  const {
    runId,
    runtime,
    actor,
    state,
    block,
    targetAnchorRef,
    routePointIndex,
    issuedAtSeconds,
    movementDeltas,
  } = options;
  if (
    state.pendingMovement?.targetAnchorRef === targetAnchorRef &&
    state.pendingMovement.routePointIndex === routePointIndex
  ) {
    return;
  }
  const supersedesMovementId = state.pendingMovement?.movementId;
  if (supersedesMovementId) rememberSuperseded(state, supersedesMovementId);
  const movementId = `mov:${runId}:${runtime.nextMovementSequence++}`;
  state.pendingMovement = {
    movementId,
    targetAnchorRef,
    targetLocationId: anchorLocationId(targetAnchorRef),
    issuedAtSeconds,
    scheduleBlockId: block.blockId,
    routePointIndex,
  };
  movementDeltas.push({
    movementId,
    actorId: actor.actorId,
    issuedAtSeconds,
    fromAnchorRef: state.confirmedAnchorRef,
    targetAnchorRef,
    targetLocationId: anchorLocationId(targetAnchorRef),
    scheduleBlockId: block.blockId,
    activity: block.activity,
    routePointIndex,
    ...(supersedesMovementId ? { supersedesMovementId } : {}),
  });
}

function applyArrivals(
  runtime: RunSchedulerRuntime,
  arrivals: readonly RunArrivalObservation[],
  atSeconds: number,
): Pick<SchedulerAdvanceResult, "arrivalsApplied" | "arrivalsRejected"> {
  const arrivalsApplied: RunArrivalApplied[] = [];
  const arrivalsRejected: RunArrivalRejected[] = [];
  for (const arrival of arrivals) {
    const state = stateFor(runtime, arrival.actorId);
    const current = state.pendingMovement;
    if (state.supersededMovementIds.has(arrival.movementId)) {
      arrivalsRejected.push({
        ...arrival,
        reason: "superseded",
        ...(current
          ? {
              currentMovementId: current.movementId,
              currentTargetAnchorRef: current.targetAnchorRef,
            }
          : {}),
      });
      continue;
    }
    if (!current || current.movementId !== arrival.movementId) {
      arrivalsRejected.push({
        ...arrival,
        reason: "not_current",
        ...(current
          ? {
              currentMovementId: current.movementId,
              currentTargetAnchorRef: current.targetAnchorRef,
            }
          : {}),
      });
      continue;
    }
    if (arrival.anchorRef !== current.targetAnchorRef) {
      arrivalsRejected.push({
        ...arrival,
        reason: "target_mismatch",
        currentMovementId: current.movementId,
        currentTargetAnchorRef: current.targetAnchorRef,
      });
      continue;
    }
    state.confirmedAnchorRef = arrival.anchorRef;
    state.pendingMovement = null;
    state.routePointIndex = current.routePointIndex;
    state.routePointArrivedAtSeconds = current.routePointIndex === null ? null : atSeconds;
    arrivalsApplied.push({ ...arrival, locationId: anchorLocationId(arrival.anchorRef) });
  }
  return { arrivalsApplied, arrivalsRejected };
}

function synchronizeBlock(options: {
  runId: string;
  layout: RunLayout;
  runtime: RunSchedulerRuntime;
  actor: RunLayoutActor;
  state: RunSchedulerActorState;
  block: RunScheduleBlock;
  atSeconds: number;
  movementDeltas: RunMovementDelta[];
}): void {
  const { runId, layout, runtime, actor, state, block, atSeconds, movementDeltas } = options;
  state.currentBlockId = block.blockId;
  if (block.target.kind === "anchor") {
    state.routePointIndex = null;
    state.routePointArrivedAtSeconds = null;
    if (state.confirmedAnchorRef === block.target.id && state.pendingMovement === null) return;
    if (samePosition(layout, state.confirmedAnchorRef, block.target.id) && state.pendingMovement === null) {
      state.confirmedAnchorRef = block.target.id;
      return;
    }
    issueMovement({
      runId,
      runtime,
      actor,
      state,
      block,
      targetAnchorRef: block.target.id,
      routePointIndex: null,
      issuedAtSeconds: atSeconds,
      movementDeltas,
    });
    return;
  }

  const points = routeById(layout, block.target.id).points;
  const confirmedIndex = points.indexOf(state.confirmedAnchorRef);
  if (confirmedIndex >= 0) {
    state.routePointIndex = confirmedIndex;
    state.routePointArrivedAtSeconds = atSeconds;
    if (state.pendingMovement) {
      issueMovement({
        runId,
        runtime,
        actor,
        state,
        block,
        targetAnchorRef: state.confirmedAnchorRef,
        routePointIndex: confirmedIndex,
        issuedAtSeconds: atSeconds,
        movementDeltas,
      });
    }
    return;
  }
  const firstPoint = points[0];
  if (!firstPoint) return;
  state.routePointIndex = null;
  state.routePointArrivedAtSeconds = null;
  issueMovement({
    runId,
    runtime,
    actor,
    state,
    block,
    targetAnchorRef: firstPoint,
    routePointIndex: 0,
    issuedAtSeconds: atSeconds,
    movementDeltas,
  });
}

function emitBoundaryWakes(options: {
  runId: string;
  layout: RunLayout;
  runtime: RunSchedulerRuntime;
  fromSeconds: number;
  toSeconds: number;
  observedWorldRevision: number;
  scheduleWakes: RunScheduleWake[];
}): void {
  const {
    runId,
    layout,
    runtime,
    fromSeconds,
    toSeconds,
    observedWorldRevision,
    scheduleWakes,
  } = options;
  for (const window of layout.meetingWindows) {
    for (const [phase, scheduledAtSeconds] of [
      ["started", window.startSeconds],
      ["ended", window.endSeconds],
    ] as const) {
      if (!(fromSeconds < scheduledAtSeconds && scheduledAtSeconds <= toSeconds)) continue;
      emitRunWake(
        runtime,
        {
          wakeId: `wake:${runId}:meeting_window:${window.windowId}:${phase}`,
          kind: "meeting_window",
          phase,
          sourceId: window.windowId,
          actorIds: [...window.actorIds],
          scheduledAtSeconds,
          observedWorldRevision,
          requiresDecision: false,
          status: "informational",
        },
        scheduleWakes,
      );
    }
  }
  if (fromSeconds < layout.graceEndsAtSeconds && layout.graceEndsAtSeconds <= toSeconds) {
    emitRunWake(
      runtime,
      {
        wakeId: `wake:${runId}:grace:${layout.graceEndsAtSeconds}`,
        kind: "grace",
        phase: "ended",
        sourceId: "grace_period",
        actorIds: [],
        scheduledAtSeconds: layout.graceEndsAtSeconds,
        observedWorldRevision,
        requiresDecision: false,
        status: "informational",
      },
      scheduleWakes,
    );
  }
  if (fromSeconds < layout.hearingAtSeconds && layout.hearingAtSeconds <= toSeconds) {
    emitRunWake(
      runtime,
      {
        wakeId: `wake:${runId}:hearing:${layout.hearingAtSeconds}`,
        kind: "hearing",
        phase: "due",
        sourceId: "station_hearing",
        actorIds: layout.actors.map(actor => actor.actorId),
        scheduledAtSeconds: layout.hearingAtSeconds,
        observedWorldRevision,
        requiresDecision: false,
        status: "informational",
      },
      scheduleWakes,
    );
  }
}

function emitMeetingReadyWakes(options: {
  runId: string;
  layout: RunLayout;
  runtime: RunSchedulerRuntime;
  elapsedSeconds: number;
  observedWorldRevision: number;
  scheduleWakes: RunScheduleWake[];
}): void {
  const { runId, layout, runtime, elapsedSeconds, observedWorldRevision, scheduleWakes } = options;
  for (const window of layout.meetingWindows) {
    if (!(window.startSeconds <= elapsedSeconds && elapsedSeconds < window.endSeconds)) continue;
    const allArrived = window.actorIds.every(
      actorId =>
        stateFor(runtime, actorId).confirmedAnchorRef === window.participantAnchorRefs[actorId],
    );
    if (!allArrived) continue;
    emitRunWake(
      runtime,
      {
        wakeId: `wake:${runId}:meeting_ready:${window.windowId}`,
        kind: "meeting_ready",
        phase: "due",
        sourceId: window.windowId,
        actorIds: [...window.actorIds],
        scheduledAtSeconds: elapsedSeconds,
        observedWorldRevision,
        requiresDecision: true,
        status: "pending",
      },
      scheduleWakes,
    );
  }
}

export function advanceRunScheduler(options: {
  runId: string;
  layout: RunLayout;
  runtime: RunSchedulerRuntime;
  fromSeconds: number;
  toSeconds: number;
  arrivals: readonly RunArrivalObservation[];
  observedWorldRevision: number;
}): SchedulerAdvanceResult {
  const {
    runId,
    layout,
    runtime,
    fromSeconds,
    toSeconds,
    arrivals,
    observedWorldRevision,
  } = options;
  const { arrivalsApplied, arrivalsRejected } = applyArrivals(runtime, arrivals, fromSeconds);
  const scheduleWakes: RunScheduleWake[] = [];
  const movementDeltas: RunMovementDelta[] = [];
  if (toSeconds === fromSeconds && arrivalsApplied.length === 0) {
    return { arrivalsApplied, arrivalsRejected, scheduleWakes, movementDeltas };
  }

  // Schedule transitions outrank route cadence at the same world second.
  for (const actor of layout.actors) {
    const state = stateFor(runtime, actor.actorId);
    const transitions = actor.scheduleBlocks.filter(
      block => fromSeconds < block.startSeconds && block.startSeconds <= toSeconds,
    );
    for (const block of transitions) {
      synchronizeBlock({
        runId,
        layout,
        runtime,
        actor,
        state,
        block,
        atSeconds: block.startSeconds,
        movementDeltas,
      });
      emitRunWake(
        runtime,
        {
          wakeId: `wake:${runId}:actor_schedule:${block.blockId}`,
          kind: "actor_schedule",
          phase: "started",
          sourceId: block.blockId,
          actorIds: [actor.actorId],
          scheduledAtSeconds: block.startSeconds,
          observedWorldRevision,
          requiresDecision: false,
          status: "informational",
        },
        scheduleWakes,
      );
    }
  }

  emitBoundaryWakes({
    runId,
    layout,
    runtime,
    fromSeconds,
    toSeconds,
    observedWorldRevision,
    scheduleWakes,
  });

  // Seed t=0 anchor targets on the first material advance and repair any
  // anchor block whose confirmed position still differs from its target.
  for (const actor of layout.actors) {
    const state = stateFor(runtime, actor.actorId);
    const block = blockAt(actor, toSeconds);
    if (!block) continue;
    if (
      state.currentBlockId !== block.blockId ||
      (block.target.kind === "anchor" &&
        state.pendingMovement === null &&
        state.confirmedAnchorRef !== block.target.id)
    ) {
      synchronizeBlock({
        runId,
        layout,
        runtime,
        actor,
        state,
        block,
        atSeconds: Math.max(fromSeconds, block.startSeconds),
        movementDeltas,
      });
    }
  }

  for (const actor of layout.actors) {
    const state = stateFor(runtime, actor.actorId);
    const block = blockAt(actor, toSeconds);
    if (
      !block ||
      block.target.kind !== "route" ||
      state.pendingMovement !== null ||
      state.routePointIndex === null ||
      state.routePointArrivedAtSeconds === null
    ) {
      continue;
    }
    const dueAt = state.routePointArrivedAtSeconds + ROUTE_CADENCE_SECONDS;
    if (!(fromSeconds < dueAt && dueAt <= toSeconds)) continue;
    const points = routeById(layout, block.target.id).points;
    if (points.length === 0) continue;
    const nextIndex = (state.routePointIndex + 1) % points.length;
    const targetAnchorRef = points[nextIndex];
    if (!targetAnchorRef) continue;
    issueMovement({
      runId,
      runtime,
      actor,
      state,
      block,
      targetAnchorRef,
      routePointIndex: nextIndex,
      issuedAtSeconds: dueAt,
      movementDeltas,
    });
  }

  emitMeetingReadyWakes({
    runId,
    layout,
    runtime,
    elapsedSeconds: toSeconds,
    observedWorldRevision,
    scheduleWakes,
  });
  scheduleWakes.sort((first, second) =>
    first.scheduledAtSeconds === second.scheduledAtSeconds
      ? first.wakeId.localeCompare(second.wakeId)
      : first.scheduledAtSeconds - second.scheduledAtSeconds,
  );
  return { arrivalsApplied, arrivalsRejected, scheduleWakes, movementDeltas };
}

export function alignActorForPlayerConversation(
  layout: RunLayout,
  runtime: RunSchedulerRuntime,
  actorId: string,
  anchorRef: string,
  elapsedSeconds: number,
): void {
  const actor = layout.actors.find(candidate => candidate.actorId === actorId);
  if (!actor) throw new Error(`layout actor missing: ${actorId}`);
  const state = stateFor(runtime, actorId);
  if (state.pendingMovement) rememberSuperseded(state, state.pendingMovement.movementId);
  state.pendingMovement = null;
  state.confirmedAnchorRef = anchorRef;
  const block = blockAt(actor, elapsedSeconds);
  if (block?.target.kind === "route") {
    const index = routeById(layout, block.target.id).points.indexOf(anchorRef);
    state.routePointIndex = index >= 0 ? index : null;
    state.routePointArrivedAtSeconds = index >= 0 ? elapsedSeconds : null;
  } else {
    state.routePointIndex = null;
    state.routePointArrivedAtSeconds = null;
  }
}

/**
 * Issue one provider-selected movement without bypassing schedule policy.
 * The target must belong to the actor's currently active schedule block;
 * Godot still owns path execution and confirms the exact arrival later.
 */
export function issueActorGoalMovement(options: {
  runId: string;
  layout: RunLayout;
  runtime: RunSchedulerRuntime;
  actorId: string;
  targetAnchorRef: string;
  elapsedSeconds: number;
}): RunMovementDelta | null {
  const { runId, layout, runtime, actorId, targetAnchorRef, elapsedSeconds } = options;
  const actor = layout.actors.find(candidate => candidate.actorId === actorId);
  if (!actor) return null;
  const state = stateFor(runtime, actorId);
  const block = blockAt(actor, elapsedSeconds);
  if (!block || state.pendingMovement) return null;

  let routePointIndex: number | null = null;
  if (block.target.kind === "anchor") {
    if (block.target.id !== targetAnchorRef) return null;
  } else {
    const points = routeById(layout, block.target.id).points;
    if (
      state.routePointIndex === null ||
      state.routePointArrivedAtSeconds === null ||
      elapsedSeconds < state.routePointArrivedAtSeconds + ROUTE_CADENCE_SECONDS
    ) return null;
    routePointIndex = (state.routePointIndex + 1) % points.length;
    if (points[routePointIndex] !== targetAnchorRef) return null;
  }
  if (state.confirmedAnchorRef === targetAnchorRef) return null;

  const movementDeltas: RunMovementDelta[] = [];
  issueMovement({
    runId,
    runtime,
    actor,
    state,
    block,
    targetAnchorRef,
    routePointIndex,
    issuedAtSeconds: elapsedSeconds,
    movementDeltas,
  });
  return movementDeltas[0] ?? null;
}

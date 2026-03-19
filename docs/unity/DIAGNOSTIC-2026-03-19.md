# Unity Project Diagnostic — 2026-03-19

> Post-restructure diagnosis after 120+ GPT Codex commits.
> Project: `draem-of-one/` (153 C# files, 23,610 LOC)

---

## Executive Summary

The game compiles and launches. The player can move via WASD. **Everything else is broken.** The core game loop (violation -> suspicion -> report -> interrogation -> verdict) never executes due to three fatal blockers at the very start of the chain.

---

## Fatal Blockers (Game Loop Completely Broken)

### F1. No NavMesh — All NPCs Frozen

**Files:** `RuntimeBootstrap.cs`, `RuntimeNavMeshBaker.cs`

`RuntimeNavMeshBaker` is never instantiated by `RuntimeBootstrap.Build()`. No `NavMeshSurface` component is ever added to any GameObject. At NPC creation time, `NavMesh.SamplePosition()` fails for every NPC, causing `agent.enabled = false`. All 18 NPCs and Police become frozen capsules with active physics colliders.

`NpcPopulationBootstrap` waits up to 6 seconds for NavMesh to appear, but since no `NavMeshSurface` exists, it never will.

**Fix:** Add `RuntimeNavMeshBaker` to the bootstrap, or manually add a `NavMeshSurface` component to the ground and call `BuildNavMesh()`.

### F2. Zone Triggers Never Fire — Player Has No Rigidbody

**Files:** `RuntimeBootstrap.cs:151`, `Zone.cs`, `ZoneInteractable.cs`

Unity's `OnTriggerEnter` requires at least one participant to have a `Rigidbody`. The player has only a `CharacterController` (the default `CapsuleCollider` is explicitly destroyed at line 151). Zones have trigger `BoxCollider`s but no `Rigidbody`. Neither side qualifies.

**Result:** `OnTriggerEnter` never fires. `ZoneInteractable.playerInside` is never set to `true`. Zone entry/exit events are never recorded. The entire violation -> suspicion chain cannot start.

**Note:** The player CAN still interact via E-key raycast (bypasses trigger system), but this is unreliable and requires precise aiming at the zone collider.

**Fix:** Add a kinematic `Rigidbody` to either the Player or to every Zone trigger.

### F3. No Canvas Created at Runtime — UI Invisible

**Files:** `RuntimeBootstrap.cs:57-61`, `UIManager.cs`, `UILayouter.cs`

`RuntimeBootstrap` creates `UIManager` on a bare `GameObject("UI")` without creating a Canvas, CanvasScaler, or any TMP_Text children. All 14 `[SerializeField]` TMP_Text fields in UIManager remain null. `UILayouter` is never added and would exit immediately without a Canvas anyway.

**Fallback:** `useFallback` activates OnGUI rendering, which draws white text with no background at 26px — barely visible against the 3D scene.

**Fix:** Create a Canvas with CanvasScaler and GraphicRaycaster in RuntimeBootstrap, then add UILayouter (which already knows how to create all TMP_Text children).

---

## Severe Issues (Loop Blocked Even After Fatal Fixes)

### S1. Interrogation Threshold Unreachable

**Files:** `ReportManager.cs`, `GlobalSuspicionSystem.cs`

`CanTriggerInterrogation()` requires `GlobalSuspicion >= 0.2`. With 18 NPCs, global G = average of (suspicion_i / 100). To reach 0.2, total suspicion across all 18 NPCs must be 360+. Each violation gives ~20 suspicion to at most 3 witnesses (60 total per violation). 6+ violations needed just to approach threshold, before decay eats into it.

**Fix:** Lower `globalSuspicionThreshold` to ~0.05, or change the condition to count reports only (remove global G requirement), or reduce registered NPC count for the G calculation.

### S2. NPC Double Collision — CapsuleCollider + NavMeshAgent

**Files:** `RuntimeBootstrap.cs:219,259`, `NpcPopulationBootstrap.cs:202,224`

NPCs are created via `CreatePrimitive(PrimitiveType.Capsule)` which auto-generates a solid `CapsuleCollider`. The player's collider is destroyed and replaced with `CharacterController`, but NPC colliders are never removed. NPCs have both a physics `CapsuleCollider` and a `NavMeshAgent`, causing double-collision with the player (pushback, jitter).

After scale 0.7 is applied, `CapsuleCollider` radius becomes 0.35 but `NavMeshAgent` radius is set to 0.25 — 40% mismatch.

**Fix:** Destroy the `CapsuleCollider` on each NPC after creation (like the player), or set it to `isTrigger = true`.

### S3. NPCs Spawned Inside Building Colliders

**Files:** `RuntimeBootstrap.cs:115-132`

NPC positions are set as small offsets from landmark centers (e.g., `storePos + (1, 0, -1)`). Buildings are large cubes (6x3x6). The NPC spawn position falls inside the building's `BoxCollider` volume. `NavMesh.SamplePosition` fails → agent disabled → NPC becomes a frozen solid obstacle.

`NpcRoleRoutine` routes NPCs to building anchor positions which are also building centers — destinations inside solid geometry.

**Fix:** Move NPC spawn positions outside building collider volumes. Set building anchor positions to exterior points.

### S4. Police Has No Patrol Waypoints

**Files:** `RuntimeBootstrap.cs` (CreatePolice)

`patrolPoints` is `Array.Empty<Transform>()`. Police stands at (0, 0, -6) permanently. Even if NavMesh existed and interrogation triggered, the police has nowhere to patrol.

**Fix:** Assign patrol waypoints to the police, similar to how NPC waypoints are created.

---

## Visual / UX Issues (Player Cannot Understand the Game)

### V1. All 18 NPCs Are Identical White Capsules

**Files:** `RuntimeBootstrap.cs:219,259`, `NpcPopulationBootstrap.cs:202,224`

Every NPC (and Police) is `CreatePrimitive(PrimitiveType.Capsule)` with no material, color, label, or visual differentiation. The player capsule is also white. There is no way to distinguish Clerk from Elder from Police from Player.

No animations exist anywhere in the project (zero Animator/Animation references).

**Fix:** Assign distinct colors per NPC role. Add world-space name labels above NPCs. Distinguish police visually (e.g., dark blue).

### V2. NPC Patrol Range Is 3 Meters — Looks Like Standing Still

**Files:** `RuntimeBootstrap.cs` (SimplePatrol setup)

SimplePatrol waypoints are created only 1.5 units apart. At 1.2 m/s, NPCs shuffle back and forth in a tiny area that looks like standing still.

`NpcRoleRoutine` tries to navigate to `CITY_Anchors/` but RuntimeBootstrap names anchors under `Anchors/`. Name mismatch → route stays empty → NPC stands still.

**Fix:** Increase waypoint separation. Fix anchor naming to match `NpcRoleRoutine` expectations.

### V3. Zero Visual Feedback for Suspicion

**Files:** `SuspicionComponent.cs`, all NPC scripts

No code anywhere changes NPC appearance based on suspicion state. No overhead bars, no color shifts, no exclamation marks, no speech bubbles. Gossip events, suspicion changes, and NPC dialogue all exist only in the data layer (WorldEventLog).

The event log (OnGUI fallback) renders plain white text — easy to miss.

**Fix:** Add visual suspicion indicators (color tint on NPC material, overhead UI, or particle effects). Make OnGUI fallback more visible with background panels.

---

## No Physics Layers Defined

**File:** `ProjectSettings/TagManager.asset`

All custom layers (6-31) are empty. Everything is on Default layer (0). Player collides with everything: buildings (intended), NPC colliders (unintended), portal markers, etc. No selective collision filtering is possible.

**Fix:** Create layers (NPC, Building, Trigger) and configure the physics layer collision matrix.

---

## One-Shot Reporting Bug

**File:** `SuspicionComponent.cs:145,151`

`reported = true` is set permanently after first report. The flag is only reset by `ResetAfterInterrogation()`, which only runs after an interrogation that never occurs (see S1). Each NPC can file exactly ONE report per session.

**Fix:** Add a cooldown-based reset, or remove the `reported` flag and rely solely on `reportCooldownSeconds`.

---

## Confirmed Working

- Compilation: No errors. All packages present. Assembly definitions correct.
- Rendering: URP 3D Forward renderer properly configured (2D issue resolved).
- Input System: `com.unity.inputsystem` installed. `ENABLE_INPUT_SYSTEM` defined.
- Player movement: WASD + CharacterController functional.
- Code architecture: Event bus, suspicion math, report queue, police state machine — logic is sound.
- TextMesh Pro: Fully integrated (package + assets).
- Test infrastructure: 28 EditMode tests, PlayMode test framework present.

---

## Priority Fix Order

| Priority | Issue | Effort | Impact |
|:--------:|-------|:------:|:------:|
| 1 | F2: Add Rigidbody to zones (trigger detection) | 5 min | Unblocks entire game loop |
| 2 | F1: Instantiate RuntimeNavMeshBaker (NPC movement) | 10 min | NPCs can move |
| 3 | F3: Create Canvas in RuntimeBootstrap (visible UI) | 30 min | Player sees feedback |
| 4 | S1: Lower interrogation threshold (police activates) | 5 min | Interrogation becomes reachable |
| 5 | S2: Remove NPC CapsuleColliders (clean collision) | 5 min | No more collision jitter |
| 6 | S3: Fix NPC spawn positions (outside buildings) | 15 min | NPCs don't get stuck |
| 7 | S4: Add police patrol waypoints | 5 min | Police patrols |
| 8 | V1: Color-code NPCs by role | 15 min | NPCs are distinguishable |
| 9 | V2: Fix anchor naming + increase patrol range | 10 min | NPCs visibly move |
| 10 | V3: Add suspicion visual indicators | 30 min | Player understands NPC state |

**Estimated total: ~2-3 hours of code changes. Zero editor work required.**

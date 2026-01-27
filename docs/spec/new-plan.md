# AI Implementation Spec (Ultra‑Detailed) — **Dream of One**

**Document type:** Implementation Contract for an autonomous Unity‑builder AI (Unity MCP‑only)
**Revision date:** 2026‑01‑23
**Primary sources:** current project status + Dream of One design (v6.2)  

---

## 1) Executive Summary

**Dream of One** is a **log‑first social-organization simulation** presented as a small open-world city block. The world’s “truth” is not a fully modeled state; it is an **append‑only World Event Log (WEL)** of deterministic facts, continuously promoted into readable 1‑line statements by a **Semantic Shaper**, then surfaced locally via **Spatial Blackboards**. NPCs do not “understand the world” globally; they **ingest nearby recent logs** and act according to **organization procedures**, producing **gossip, reports, evidence artifacts, and procedural verdicts**.

**LLM is surface-only**: it may paraphrase or style a deterministic 1‑line message, but **never** decides whether something happened, whether evidence exists, or whether a verdict is reached. Deterministic systems own all truth transitions.

This spec defines:

* A **Minimum Complete Simulation Slice (MCSS)** you can call “complete” in a vertical-slice sense (production proof). (Vertical slice as “can we produce it?” framing.) ([Levelling The Playing Field][1])
* A **Unity architecture** that is reproducible and MCP-friendly: data-driven world building using ScriptableObjects, automated validation, and test gating.
* A deep, scalable plan: how the slice scales into a multi-block open world with streaming, additional orgs, and longer sessions.

---

## 2) Hard Constraints & Non‑Negotiables

### 2.1 Tooling constraint (Unity MCP‑only)

Therefore:

* **No manual placement as a dependency**: the world must be buildable from data.
* All “authoring” must be either:

  * **ScriptableObject data**, or
  * **prefabs / addressables**, or
  * **editor tools** that generate scenes/prefabs deterministically.

### 2.2 Determinism boundary (Core rule)

* **Deterministic Core** decides:

  * event truth,
  * suspicion changes,
  * rumor state transitions (Draft→Final),
  * evidence existence,
  * case bundling,
  * verdict outcomes,
  * scoring/metrics.
* **LLM only**:

  * writes **1‑line dialogue / 1‑line summary** (styling),
  * must be optional and fail-safe,
  * must not alter structured events.

### 2.3 “Rebuildability” requirement

The AI must implement:
**Tools → DreamOfOne → Rebuild World From Data**
This command is required for “complete” status.

### 2.4 Performance “truthiness” requirement

Simulation believability collapses with:

* stutters (GC spikes),
* repeated bugs (portal locks),
* inconsistent AI states.

So the slice must enforce:

* **0B allocations per frame in steady-state** (outside loading/scene transitions) using Unity GC best practices. ([Unity Documentation][2])
* Incremental GC is supported and is Unity’s default behavior; still avoid allocations. ([Unity Documentation][3])

---

## 3) Product Definition (Big Scale + Deep Identity)

### 3.1 One‑line definition

**A society that “thinks” by logs.**
In a city block of competing organizations, you survive by maintaining a believable **Cover** while the society records events as text logs, spreads gossip locally, creates evidence artifacts, and reaches procedural verdicts.

### 3.2 Pillars (must be felt in gameplay)

1. **Log‑First Reality**: everything meaningful becomes a log line.
2. **Organizations Drive Events**: NPCs act for org goals, not random wandering.
3. **Deterministic Core, LLM Surface**: outcomes are rule-based.
4. **Artifacts Make Truth Visible**: evidence is tangible (CCTV print, ticket, memo).
5. **Closed Loops, Not Content Quantity**: every incident resolves.

### 3.3 What “Open World” means here (scalable interpretation)

* “Open world” = **open simulation with locality**, not huge terrain.
* Scaling path:

  * Stage A (Slice): 1 block, 4 landmarks.
  * Stage B: 3×3 blocks (district), streaming, more orgs.
  * Stage C: multiple districts, inter-org politics, longer session persistence.

---

## 4) Target Deliverable: Minimum Complete Simulation Slice (MCSS)

### 4.1 Why “vertical slice” matters

A vertical slice is not “another prototype.” It proves production capability and end-to-end quality. ([Levelling The Playing Field][1])

### 4.2 MCSS promise (must happen within a 10–12 minute run)

Within one run (time-limited or “demo mode”):

* Player visits **4 landmarks**: Store, Studio, Park, Police.
* System produces **≥12 meaningful events** (not just movement).
* NPCs perform **≥6 log-driven social reactions** (gossip/challenge/report).
* World spawns **≥3 artifacts** that persist and can be inspected.
* There is **≥1 procedural closure** (verdict/cleared/escalation/case closed).
* No hard locks; session ends gracefully with final summary.

### 4.3 Definition of Done (DoD) for “Complete Slice”

**Playability**

* Start → loop → closure works reliably.
* Portals never permanently break AI/NavMesh states.
* Console is clean after “Run Diagnostics”.

**Legibility**

* Each landmark has signage + door + key props.
* UI shows: (a) recent local logs, (b) suspicion, (c) artifacts/case.

**Systems Integrity**

* Every key action emits structured event + canonical 1-line.
* NPCs demonstrably change actions due to injected nearby logs.

**Performance**

* Stable framerate.
* No sustained per-frame allocations (steady state). ([Unity Documentation][2])

**QA**

* Automated Play Mode tests cover the core loop; Play Mode tests can run as coroutines with `UnityTest`. ([Unity Documentation][4])

#### MCSS DoD Checklist (10–12 min)

**Success criteria**
- UI guides/confirms visits to 4 landmarks (Store/Studio/Park/Station)
- 12+ meaningful events (exclude Entered/ExitedZone)
- 6+ NPC social reaction events (Report/Rumor/Statement/Explanation/Rebuttal, etc.)
- 3+ artifacts created + verify Artifact panel
- `VerdictGiven` occurs at least once
- Session end screen shows “why it ended / outcome / replay reason”

**Verification steps**
- Unity: run `Tools > DreamOfOne > Run Diagnostics` → console errors = 0
- PlayMode smoke: `SessionPlayModeTests.DoDChecklistSignals` passes
- Confirm the above metrics in a 10–12 minute play run

---

## 5) Current Baseline (what exists and what must be preserved)

From your current project status:

* Scene: `Assets/Scenes/Prototype.unity`
* URP configured
* Runtime helpers: `RuntimeNavMeshBaker`, `UILayouter`
* `InteriorBootstrap` creates runtime box rooms at offsets
* Portal triggers near anchors; two-way; NPCs enter/exit; AI components toggled
* `NpcPopulationBootstrap` enforces minimum NPCs and spawns capsules if needed
* Session loop: time limit, suspicion threshold, verdict event ends session

**Preserve as scaffolding**, but replace “placeholder emptiness” with:

* authored landmarks and interactables,
* artifact pipeline,
* incident loops with closure,
* stable NPC prefabs and roles,
* reproducible world build tooling.

---

## 6) Architecture Overview (Systems Map)

### 6.1 High-level pipeline

**Player / NPC Actions → Structured Events → WEL Append → Semantic Shaper → Canonical Lines → Spatial Blackboards → NPC Knowledge Injection → NPC Decisions → More Events + Artifacts + Verdicts**

### 6.2 Mandatory runtime services (singleton-ish)

* `WorldClock`
* `EventBus` (domain events)
* `WELStore` (append-only JSONL)
* `SemanticShaper`
* `BlackboardRegistry`
* `KnowledgeInjectionSystem`
* `NpcDirector` (spawning + lifecycle)
* `OrganizationDirector` (procedures + schedules)
* `RumorDirector`
* `EvidenceDirector`
* `CaseDirector` (police)
* `LLMOrchestrator` (optional, surface only)
* `UIHudController`
* `DiagnosticsRunner`
* `WorldBuilder` (editor-only tool)

---

## 7) Data‑Driven World Authoring (MCP‑Friendly)

### 7.1 ScriptableObject as the authoritative content format

ScriptableObjects are designed as shared data containers that can reduce duplicated data and centralize configuration. ([Unity Documentation][5])
Important: ScriptableObjects are not a runtime save system in builds; they persist as assets authored in editor. ([Unity Documentation][6])

**Rule:** All gameplay content must be definable via ScriptableObjects; scenes are build outputs.

### 7.2 Required ScriptableObject assets (schemas)

#### `WorldDefinitionSO`

* `worldId: string`
* `seedMode: enum { FixedSeed, TimeSeed }`
* `seed: int`
* `chunks: List<WorldChunkRef>` (for streaming scale)
* `landmarks: List<LandmarkDefinitionSO>`
* `zones: List<ZoneDefinitionSO>`
* `globalRuleset: RulesetSO`
* `policyPacks: List<PolicyPackSO>`
* `runtimeBudgets: RuntimeBudgetSO`

#### `LandmarkDefinitionSO`

* `id: string` (e.g., `LM_STORE`)
* `displayName: string`
* `exteriorPrefab: GameObject/Addressable`
* `doorway: DoorwayDefinition` (position/rotation)
* `portal: PortalDefinition` (entry/exit)
* `interior: InteriorDefinition` (prefab or additive scene)
* `signagePrefab: GameObject`
* `keyProps: List<PropSpawnDef>` (bench, counter, board)
* `blackboardBindings: List<BlackboardBinding>` (counter board, bulletin)

#### `ZoneDefinitionSO`

* `id: string` (e.g., `ZONE_PARK`)
* `shape: enum { Box, Polygon }`
* `bounds/points`
* `blackboardCapacity: int = 10`
* `ttlSeconds: range`
* `noiseRadius: float`
* `injectionProfile: InjectionProfileSO`

#### `InteractableDefinitionSO`

* `id: string` (e.g., `INT_STORE_COUNTER_QUEUE`)
* `prefab: Addressable`
* `verbs: List<VerbDefinition>`
* `stateMachine: InteractableStateGraph` (simple)
* `emittedEvents: List<EventTemplate>`
* `artifactOutputs: List<ArtifactSpawnRule>`
* `uiPromptTemplate: string`

#### `NpcArchetypeSO`

* `id: string` (`NPC_POLICE_ALPHA`)
* `role: enum` (police, pm, dev, clerk, citizen…)
* `organization: OrganizationSO`
* `routine: ScheduleSO`
* `perception: PerceptionProfileSO`
* `injection: InjectionProfileSO`
* `dialogueStyle: StyleProfileSO`
* `authority: AuthorityProfileSO`
* `prefab: Addressable` (must not be capsule)

#### `RulesetSO` + `RuleDefinitionSO`

* Each rule has:

  * `ruleId: string` (R4 etc.)
  * `topic: string`
  * `detectors: List<DetectorDef>` (trigger conditions)
  * `severity: float`
  * `suspicionDelta: curve/table`
  * `artifactPolicy: optional`
  * `canonicalLineTemplate: string`

#### `ArtifactDefinitionSO`

* `artifactId: string` (A6 Ticket etc.)
* `prefab: Addressable`
* `state: enum { Draft, Final }`
* `ttlSeconds`
* `inspectTextTemplate`
* `links: { eventIds, rumorTopic, caseId }`

#### `PolicyPackSO`

* `id, displayName`
* overrides for:

  * thresholds,
  * CCTV delay,
  * suspicion weights,
  * report cadence,
  * etc.

#### `RuntimeBudgetSO`

* event rate budgets
* LLM budgets
* NPC limits
* memory/perf thresholds

---

## 8) Unity Project Structure & Runtime Content Loading

### 8.1 Scenes (slice)

* `Bootstrap.unity` (systems + UI + managers)
* `World_Block_A.unity` (exteriors, roads, zones)
* `Interiors_*.unity` (optional additive) OR interior prefabs loaded addressably

**Why:** scaling requires splitting. Scene loading supports full scene path to disambiguate identical names. ([Unity Documentation][7])

### 8.2 Addressables (recommended for scaling content)

Addressables manage async loading via `AsyncOperationHandle` and require explicit release to manage memory. ([Unity Documentation][8])
Addressables loading APIs like `LoadAssetAsync` are standard; releasing handles is crucial. ([Unity Documentation][9])

**Policy:**

* All interiors and NPC prefabs are Addressables.
* All interactables are Addressables.
* The world builder spawns via a single `ContentSpawner` API that:

  * loads (or references) addressables,
  * instantiates,
  * tracks handles,
  * releases on unload.

---

## 9) Movement, Navigation, and World Traversal

### 9.1 Player controller spec

Use `CharacterController`:

* It is a common solution for FPS/3rd-person control without Rigidbody physics. ([Unity Documentation][10])
* `CharacterController.Move` does not apply gravity automatically and returns collision flags (you implement gravity/jump). ([Unity Documentation][11])

**Player requirements**

* ground movement (camera-relative)
* jump + gravity
* step offset tuned
* slope limits tuned
* no wall-sticking
* interaction raycast / proximity

### 9.2 Input system spec

Use Input System `PlayerInput`:

* It connects player devices, Actions, and callbacks; supports flexible mapping. ([Unity Documentation][12])

**Bindings**

* Move (WASD)
* Look (mouse)
* Interact
* Sprint (optional)
* Open Log UI
* Inspect Artifact
* Debug toggle (dev only)

### 9.3 NavMesh (NPC movement)

Use AI Navigation:

* `NavMeshSurface` defines walkable areas per agent type and can exist multiple times in a scene. ([Unity Documentation][13])
* For dynamic obstacles, NavMeshObstacle carving behavior is documented (“carve when stationary”, thresholds, etc.). ([Unity Documentation][14])

**Navigation requirements**

* Prefer **baked navmesh** for stable slice.
* Runtime baking allowed only as a dev fallback (diagnostics).
* Portals must never leave agents with disabled NavMeshAgent indefinitely.

### 9.4 Doors, jumps, and “special traversal”

Use OffMeshLinks:

* OffMeshLinks represent shortcuts not on walkable surfaces (jump, door opening). ([Unity Documentation][15])
* For custom traversal, disable auto traversal and call `CompleteOffMeshLink`. ([Unity Documentation][16])

**Slice implementation**

* Every interior portal doorway is effectively a “door traversal”; represent this as:

  * trigger + animation, or
  * OffMeshLink + custom traversal (optional).
* Future scaling: ladders, fences, maintenance doors, etc.

---

## 10) Rendering, Lighting, and “Non‑Empty” Look (Minimal but Real)

### 10.1 Occlusion culling policy

Unity’s built-in occlusion culling is **not suitable** if the project generates scene geometry at runtime. ([Unity Documentation][17])
Since current interiors are runtime-generated: either move to authored interior prefabs/scenes OR accept that occlusion isn’t your main optimization.

### 10.2 Lighting policy

* Use baked lighting for exteriors.
* Use Light Probes for dynamic objects so they receive bounced light based on nearby probes. ([Unity Documentation][18])
* Reflection probes: realtime probes have more overhead than baked probes. ([Unity Documentation][19])

### 10.3 LOD policy

* Use LODGroup for repeated props/buildings.
* Cross-fading is supported and documented for smoother transitions. ([Unity Documentation][20])

---

## 11) Core Simulation: Event, Log, Shaper, Blackboard

### 11.1 Structured Event schema (canonical truth)

**Format:** JSON serializable, append-only

```json
{
  "t": 123.456,
  "sessionId": "S-2026-01-23-0001",
  "eventId": "E-00001234",
  "actor": { "kind": "npc", "id": "P1", "role": "POLICE" },
  "event": "ReportFiled",
  "place": "POLICE_OUTPOST",
  "topic": "QUEUE",
  "rule": "R4",
  "severity": 0.6,
  "objects": [{ "id": "OBJ_COUNTER", "kind": "INTERACTABLE" }],
  "pos": [12.3, 0.0, -4.2],
  "tags": ["procedural", "caseable"],
  "note": "No verbal agreement observed"
}
```

**Rules**

* Events are emitted only by deterministic systems (collisions, interaction verbs, procedure nodes).
* Event IDs are unique and stable.
* Every event must be “shapeable” into canonical 1-liner OR explicitly flagged `silent`.

### 11.2 WELStore (append-only)

* Writes JSONL lines to disk for debugging/telemetry.
* Not used for save/restore replay (per design).

### 11.3 Semantic Shaper (structured → canonical line)

Inputs:

* `StructuredEvent`
* rule definitions
* place labels / short names
* severity mapping

Outputs:

* `CanonicalLine`:

```json
{
  "t": 123.456,
  "eventId": "E-00001234",
  "placeId": "STORE",
  "topic": "QUEUE",
  "severity": 0.6,
  "text": "[R4][Queue][Violation] Queue cutting suspected at Store Counter."
}
```

**Canonical line requirements**

* <= 80 characters (hard limit; truncate if needed).
* Must contain WHO/WHAT/WHERE (or WHO implied by context, but prefer explicit).
* Deterministic templates:

  * `[Rule][Topic][Type] …`

### 11.4 Spatial Blackboards (local memory)

* Each Zone and key Object has a ring buffer (N=10 default).
* TTL default 6–10 minutes for social logs; longer TTL for evidence-related.
* NPCs read local blackboards based on injection rules.

---

## 12) Knowledge Injection (Distance/FOV/Noise)

### 12.1 Injection tick

Every NPC decision tick:

1. **Near** (<= 1.2m): read up to K1 (3) newest entries
2. **FOV** (<= 8m in view): read up to K2 (5)
3. **Noise** (<= 6m): read 1 “heard” entry
4. **Personal memory**: keep last N important entries (5) with TTL (8 min)

### 12.2 Priority

Evidence/Procedure > Violations > Gossip > General

### 12.3 Outputs

NPC updates internal belief:

* `p_i` (belief player is outsider)
* `s_i` (suspicion score)
* rumor memory graph

---

## 13) NPC AI: Organization‑Driven Social Agents

### 13.1 The “NPC Brain” contract

Each NPC must implement:

* `TickPerception()`
* `TickInjection()`
* `TickDecision()`
* `TickAction()`

### 13.2 Behavior representation (MCP-friendly)

Preferred: Behavior Graph / simple state machine that is data-driven.
States:

* RoutineMove
* WorkProcedure
* Observe
* Talk
* GossipShare
* ReportFile
* Investigate
* Escort / Interrogate (police)
* PortalEnter / PortalExit recovery-safe state

### 13.3 NPC embodiment minimum

Slice requirement:

* No capsule NPCs. Every NPC is a prefab with:

  * mesh + animator,
  * idle/walk/talk states,
  * role marker (uniform/accessory).

---

## 14) Organizations & Procedures (The Real Game Engine)

### 14.1 Organization system

Each organization defines:

* goals,
* procedures (ordered steps),
* resources (objects/places),
* artifacts it can produce/consume.

### 14.2 Slice organizations (minimum 4)

* Studio (RC submission)
* Store (queue + label norms)
* Park (bench priority, noise norms)
* Police (report → evidence → verdict)

### 14.3 Procedure as deterministic “task graphs”

Example: **Store Queue Procedure**

* Node: MaintainQueue
* Node: DetectViolation (R4)
* Node: Confront / warn
* Node: WriteNote (Artifact: A13 complaint)
* Node: EscalateToPolice if severity threshold

---

## 15) Gossip Network (Rumor as “semi-truth”)

### 15.1 Rumor object model

```json
{
  "rumorId": "RU-00045",
  "topic": "QUEUE",
  "subjectActorId": "PLAYER",
  "originEventId": "E-00001001",
  "state": "DRAFT",
  "confidence": 0.35,
  "sourceNpcId": "CZ2",
  "placeId": "STORE",
  "t0": 95.0,
  "tags": ["unconfirmed"]
}
```

### 15.2 Propagation

* Only via proximity conversation
* Trust weight updates
* Cooldowns per topic per NPC

### 15.3 Confirmation / debunk

Evidence artifacts flip rumor state:

* `DRAFT → FINAL_CONFIRMED`
* `DRAFT → FINAL_DEBUNKED`

---

## 16) Evidence & Artifacts (Make Truth Visible)

### 16.1 Artifact lifecycle

* Spawned by:

  * CCTV capture
  * ticket printer
  * memo writer
  * approval stamp
  * bulletin post

* Artifact has:

  * ID, type, state, TTL
  * link to events/rumors/case
  * inspect text

### 16.2 Required slice artifacts (minimum 6 types)

* A5 CCTV Capture (printable)
* A6 Violation Ticket
* A12 Rumor Card (Draft→Final)
* A13 Complaint Memo
* A14 Defense Memo
* A16 Approval Note (Studio)
  (Exact IDs align with design doc.)

---

## 17) Police Case & Verdict System (Procedural Closure)

### 17.1 Case bundle model

```json
{
  "caseId": "CASE-00012",
  "topic": "QUEUE",
  "suspect": "PLAYER",
  "events": ["E-..."],
  "artifacts": ["A5-...", "A13-..."],
  "reports": ["E-ReportFiled-..."],
  "status": "OPEN",
  "verdict": null
}
```

### 17.2 Verdict rules

Deterministic evaluation:

* severity sum
* evidence count/quality
* rebuttal presence
* procedure compliance

Outputs:

* Cleared
* Warning
* Ticket
* Escalation (session ends / major penalty)

LLM may only style the verdict line.

---

## 18) LLM Integration (Surface Layer Only, Fail‑Safe)

### 18.1 LLMOrchestrator responsibilities

* Request scheduling (batching)
* Semantic cache
* Timeouts
* Degrade modes:

  * L0 template only
  * L1 generator-only
  * Full gen+referee

### 18.2 Absolute rules

* If LLM fails: immediate fallback to canonical templates.
* LLM never writes structured event facts.

### 18.3 Budgeting (slice defaults)

* Average <= 4 calls/min (scene total)
* Peak <= 6 calls/min
* P95 latency <= 1.5s (if local)
* Hard output limit: 1 line / 80 chars

---

## 19) UI/UX Spec (Make the Simulation Readable)

### 19.1 HUD minimum

* Global awareness `G`
* Personal suspicion (player suspicion)
* Prompt + toast
* Event feed (canonical logs; optionally styled line secondary)

### 19.2 Artifact inspection UI

* Inventory-like panel
* Each artifact shows:

  * icon + state color (Draft gray, Final colored)
  * short inspect text
  * linked events (debug view)

### 19.3 “Why did this happen?” debug overlay (dev)

* Shows last injected blackboard lines for selected NPC
* Shows last decision reason code

---

## 20) Tooling: World Builder, Diagnostics, and Tests

### 20.1 World Builder (editor tool)

Menu: **Tools → DreamOfOne → Rebuild World From Data**

Functions:

* Clear prior generated objects (tagged root)
* Spawn landmarks, zones, props, portals
* Spawn interactables
* Spawn NPC spawners
* Validate:

  * missing prefabs
  * invalid portal pairs
  * overlapping colliders (simple check)
  * navmesh coverage check (raycast down points)
* Print summary report

### 20.2 Diagnostics Runner (runtime tool)

Menu: **Tools → DreamOfOne → Run Diagnostics**

Checks:

* required singletons exist
* WELStore is writing
* blackboards exist for each zone
* NPC count >= min; no capsule NPCs
* portal enter/exit returns AI to valid state
* no active exceptions in console

### 20.3 Automated tests (must ship with slice)

Unity Test Framework:

* Play Mode tests run as coroutines with `UnityTest`. ([Unity Documentation][4])

Required Play Mode tests:

1. `Test_Session_Start_End_NoErrors`
2. `Test_Portal_RoundTrip_RestoresNavMeshAgent`
3. `Test_Event_Emits_CanonicalLine`
4. `Test_Rumor_Draft_To_Final_WithEvidence`
5. `Test_Case_Verdict_Deterministic`

---

## 21) Profiling & Performance Requirements (Instrumented)

### 21.1 Profiler usage expectations

Unity Profiler:

* CPU Usage module gives overview of time spent per frame. ([Unity Documentation][21])
* Best practices explain CPU-bound vs GPU-bound analysis by comparing CPU frame time and GPU frame time. ([Unity][22])
* Unity provides frame timing APIs and tooling to identify CPU/GPU bound frames. ([Unity Documentation][23])

### 21.2 GC policy

* Apply Unity GC best practices (cache arrays, avoid closures in hot paths, pooling). ([Unity Documentation][2])
* Incremental GC is default; still enforce low allocation. ([Unity Documentation][3])

### 21.3 Runtime budgets (slice)

* NPC max: 12–16 (configurable)
* Event rate: baseline 2–4/min, peak 10/min
* Blackboard: 10 entries/zone
* LLM: <= 4/min average
* Steady allocations: 0B/frame outside loads

---

## 22) Content Requirements (Make It Feel “Not Empty”)

### 22.1 Landmarks (minimum authored clarity)

Each landmark must have:

* Door mesh + portal marker alignment
* Signage (big readable)
* Prop cluster at entrance (bench/trash/light/notice)
* Interior with at least 6 props + correct lighting

### 22.2 Interactables (minimum 20)

Distribution:

* Store: queue marker, label board, printer, shelf stock, complaint form
* Studio: kanban, RC terminal, approval stamp, lounge rumor hotspot
* Park: bench rule marker, bulletin board, quiet zone sign
* Police: report desk, evidence board, ticket printer, interrogation spot

---

## 23) Milestones / Work Packages (Dependency‑Oriented)

> These are **packages**, not time estimates. The AI may run them in order.

### WP0 — Repo & Build Hygiene

* Add `WorldDefinitionSO` root
* Add build config assets
* Add logging folder + JSONL writer

**Acceptance**

* Fresh project can run Bootstrap scene with no errors.

---

### WP1 — Event & Log Spine

* Implement EventBus + StructuredEvent types
* Implement WELStore JSONL append
* Implement SemanticShaper + canonical line templates
* Implement BlackboardRegistry + buffers

**Acceptance**

* Any interaction emits StructuredEvent + canonical line and appears in UI feed.

---

### WP2 — World Builder

* Implement Rebuild World From Data tool
* Convert Prototype scene to generated output structure
* Spawn zones + landmarks + portals from SO data

**Acceptance**

* One menu click rebuilds a playable world with landmarks.

---

### WP3 — Player Controller & Input

* CharacterController movement + jump + gravity
* Input via PlayerInput ([Unity Documentation][12])
* Interaction raycast + prompt UI

**Acceptance**

* Player can traverse, jump, and interact reliably without physics glitches.

---

### WP4 — Navigation & Portal Robustness

* Replace capsule NPC spawns with archetype prefabs
* Ensure NavMeshAgent state restoration is bulletproof
* Add OffMeshLink or deterministic portal traversal flow ([Unity Documentation][15])

**Acceptance**

* 100 portal round trips in stress test without stuck AI.

---

### WP5 — Organization Procedures & Two Incidents

Implement two repeatable incidents end-to-end:

**Incident A: Store Queue/Label**

* Violation → gossip → report → artifact(s)

**Incident B: Studio RC**

* Procedure → evidence/approval → caseable event → closure

**Acceptance**

* In any 10–12 minute run:

  * 2 incidents can occur without manual staging
  * at least one reaches closure

---

### WP6 — Gossip, Evidence, Case, Verdict

* Rumor objects + propagation
* Artifact spawning + linking
* Case bundling + deterministic verdict

**Acceptance**

* Rumor flips Draft→Final with evidence artifact.
* Police verdict triggers and is consistent.

---

### WP7 — UI Completion

* Artifact inventory/inspection
* Case board view
* “Why happened” dev overlay

**Acceptance**

* Player understands what happened and why, without reading raw debug logs.

---

### WP8 — Performance & QA Gate

* Add Play Mode tests ([Unity Documentation][4])
* Expand Diagnostics
* Profile & fix GC allocations using best practices ([Unity Documentation][2])

**Acceptance**

* Diagnostics clean.
* Tests pass.
* Stable frame pacing.

---

## 24) Scaling Plan (Beyond Slice: “Bigger World, Same Rules”)

### 24.1 Stage B: District (3×3 blocks)

Add:

* Chunk streaming: each block is a scene or addressable scene group.
* Shared WELStore; local blackboards per chunk.
* Cross-chunk rumor propagation with decay.

### 24.2 Stage C: City

Add:

* additional organizations (logistics, facilities, media)
* inter-org politics (policy packs have stronger effects)
* persistent sessions: snapshot save/restore of state (not WEL replay)

### 24.3 Streaming strategy

* Load scenes asynchronously using full path to avoid ambiguity. ([Unity Documentation][7])
* Addressables for chunk scenes + interiors, with strict release discipline. ([Unity Documentation][8])

---

## 25) Final Acceptance Criteria (MCSS “Complete” Checklist)

A build is “complete slice” when:

* **Rebuild World From Data** produces a playable world.
* A 10–12 minute run reliably yields:

  * ≥12 meaningful events
  * ≥6 social reactions
  * ≥3 artifacts
  * ≥1 closure
* LLM can be disabled and the sim still functions fully.
* Diagnostics clean; Play Mode tests pass. ([Unity Documentation][4])
* Profiling shows stable frame time with no steady-state allocations. ([Unity Documentation][2])

---

## 26) Implementation Notes for the AI (Operating Rules)

1. **Never hand-place content as a dependency.**
2. Everything must be reproducible via:

   * ScriptableObjects,
   * Addressables,
   * Builder tools.
3. Every new feature must come with:

   * at least one diagnostics check,
   * at least one Play Mode test (when feasible),
   * canonical logs proving it works.
4. When adding visuals: prioritize **signage + doors + key props + lighting**, not quantity.
5. If performance regressions appear:

   * use Profiler to classify CPU/GPU bound and fix the dominant bound. ([Unity][22])

---

If you want, I can also output the same spec as a **machine-oriented “task file”** (YAML/JSON) with:

* work package IDs,
* file/module targets,
* acceptance tests per task,
* required menu commands,
  so your autonomous AI can literally execute it like a build plan.

[1]: https://ltpf.ramiismail.com/prototypes-and-vertical-slice/?utm_source=chatgpt.com "Prototypes & Vertical Slice - Rami Ismail"
[2]: https://docs.unity3d.com/2022.3/Documentation/Manual/performance-garbage-collection-best-practices.html?utm_source=chatgpt.com "Garbage collection best practices"
[3]: https://docs.unity3d.com/2021.3/Documentation/Manual/performance-incremental-garbage-collection.html?utm_source=chatgpt.com "Incremental garbage collection"
[4]: https://docs.unity3d.com/Packages/com.unity.test-framework%401.0/manual/edit-mode-vs-play-mode-tests.html?utm_source=chatgpt.com "Edit Mode vs. Play Mode tests | Test Framework | 1.0.18"
[5]: https://docs.unity3d.com/6000.3/Documentation/Manual/class-ScriptableObject.html?utm_source=chatgpt.com "ScriptableObject"
[6]: https://docs.unity3d.com/2021.3/Documentation/Manual/class-ScriptableObject.html?utm_source=chatgpt.com "ScriptableObject"
[7]: https://docs.unity3d.com/6000.3/Documentation/ScriptReference/SceneManagement.SceneManager.LoadSceneAsync.html?utm_source=chatgpt.com "SceneManager.LoadSceneAsync"
[8]: https://docs.unity3d.com/Packages/com.unity.addressables%401.9/manual/AddressableAssetsAsyncOperationHandle.html?utm_source=chatgpt.com "Async operation handling | Addressables | 1.9.2"
[9]: https://docs.unity3d.com/Packages/com.unity.addressables%401.13/manual/LoadingAddressableAssets.html?utm_source=chatgpt.com "Addressables.LoadAsset(s)Async | Addressables | 1.13.1"
[10]: https://docs.unity3d.com/6000.3/Documentation/Manual/class-CharacterController.html?utm_source=chatgpt.com "Character Controller component reference"
[11]: https://docs.unity3d.com/6000.3/Documentation/ScriptReference/CharacterController.Move.html?utm_source=chatgpt.com "Scripting API: CharacterController.Move"
[12]: https://docs.unity3d.com/Packages/com.unity.inputsystem%401.5/manual/PlayerInput.html?utm_source=chatgpt.com "The PlayerInput component | Input System | 1.5.1"
[13]: https://docs.unity3d.com/Packages/com.unity.ai.navigation%401.1/manual/NavMeshSurface.html?utm_source=chatgpt.com "NavMesh Surface | AI Navigation | 1.1.7"
[14]: https://docs.unity3d.com/ScriptReference/AI.NavMeshObstacle-carving.html?utm_source=chatgpt.com "Scripting API: AI.NavMeshObstacle.carving"
[15]: https://docs.unity3d.com/2020.1/Documentation/Manual/class-OffMeshLink.html?utm_source=chatgpt.com "Off-Mesh Link - Manual"
[16]: https://docs.unity3d.com/ScriptReference/AI.NavMeshAgent.CompleteOffMeshLink.html?utm_source=chatgpt.com "Scripting API: AI.NavMeshAgent.CompleteOffMeshLink"
[17]: https://docs.unity3d.com/6000.3/Documentation/Manual/OcclusionCulling.html?utm_source=chatgpt.com "Occlusion culling"
[18]: https://docs.unity3d.com/6000.3/Documentation/Manual/LightProbes-MovingObjects.html?utm_source=chatgpt.com "Light Probes and moving GameObjects"
[19]: https://docs.unity3d.com/540/Documentation/Manual/RefProbePerformance.html?utm_source=chatgpt.com "Reflection Probe Performance and Optimisation"
[20]: https://docs.unity3d.com/6000.3/Documentation/Manual/class-LODGroup.html?utm_source=chatgpt.com "LOD Group component reference"
[21]: https://docs.unity3d.com/2022.3/Documentation/Manual/ProfilerWindow.html?utm_source=chatgpt.com "The Profiler window"
[22]: https://unity.com/how-to/best-practices-for-profiling-game-performance?utm_source=chatgpt.com "Best practices for profiling game performance"
[23]: https://docs.unity3d.com/6000.3/Documentation/Manual/frame-timing-manager-get-timing-data.html?utm_source=chatgpt.com "Get frame timing data"

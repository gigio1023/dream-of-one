# Dream of One — Project Doc (Integrated Design + Implementation Contract)

**Document type:** Integrated project definition and implementation contract
**Revision date:** 2026-01-23
**Primary inputs:** new-plan.md (v6.2 implementation spec) + existing project status

---

## 1) One-line definition
A log-first, organization-driven society sim set in a small city block, where deterministic event logs shape NPC behavior, evidence artifacts make truth visible, and procedural verdicts resolve incidents.

## 2) Scope and non-goals
**In scope**
- Log-first world model (WEL + canonical lines + spatial blackboards)
- Organization procedures that drive incidents and closure
- Deterministic core systems; LLM is surface-only styling
- Data-driven world building (ScriptableObjects, prefabs/addressables, editor tools)

**Out of scope**
- World-model AI that infers state outside logs
- Save/load via WEL replay or snapshot restore
- LLM-driven state transitions or verdict logic

## 3) Non-negotiables
- **Unity MCP only:** All authoring must be reproducible via ScriptableObjects, prefabs/addressables, and editor tools.
- **Determinism boundary:** Core truth transitions are rule-based. LLM never decides events, evidence, or verdicts.
- **Rebuildability:** `Tools/DreamOfOne/Rebuild World From Data` is required and must produce a playable world.
- **Diagnostics gate:** `Tools/DreamOfOne/Run Diagnostics` must be clean after any changes.
- **Performance truthiness:** No steady-state allocations per frame outside loading; avoid GC spikes.

## 4) Minimum Complete Simulation Slice (MCSS)
**Runtime target:** 10-12 minutes per session

**Must happen in one run**
- Player visits 4 landmarks: Store, Studio, Park, Police
- ≥12 meaningful events (not just movement)
- ≥6 social reactions (gossip/challenge/report)
- ≥3 artifacts spawn and are inspectable
- ≥1 procedural closure (verdict/cleared/escalation)
- Session ends gracefully with summary

**Definition of done**
- Start → loop → closure works reliably
- Portals never permanently break AI/NavMesh state
- Diagnostics clean; no console errors
- UI shows local logs, suspicion, artifacts/case
- LLM disabled mode still fully functional

## 5) World, organizations, and player cover
**Spatial scale**
- Single city block (~110m x 110m) for slice

**Slice landmarks**
- Store (queue/label norms)
- Studio (RC submission procedure)
- Park (bench/noise/photo norms)
- Police outpost (report → evidence → verdict)

**Organizations**
- Slice minimum: Studio, Store, Park, Police
- Future expansion: Cafe, Logistics, Facilities, Media, Citizens

**Cover (player identity)**
- Role + affiliation + expected procedures
- Outsiderness rises on procedure violations, taboo actions, or evidence tampering

## 6) Core pipeline (log-first society)
Actions → Structured Events → WEL append → Semantic Shaper → Canonical Lines → Spatial Blackboards → NPC Injection → NPC Decisions → More Events + Artifacts + Verdicts

## 7) Data-driven world authoring
**Rule:** Scenes are build outputs; content lives in ScriptableObjects and prefabs.

**Required ScriptableObjects (schemas)**
- WorldDefinition (seed, chunks, landmarks, zones, ruleset, policies, budgets)
- LandmarkDefinition (exterior, doorway, portal, interior, signage, key props)
- ZoneDefinition (shape, bounds, blackboard capacity, TTL, injection profile)
- InteractableDefinition (verbs, state machine, emitted events, artifact rules)
- NpcArchetype (role/org/routine/perception/injection/prefab)
- Ruleset + RuleDefinition (detectors, severity, suspicion delta, templates)
- ArtifactDefinition (prefab, state, TTL, inspect text, links)
- PolicyPack (thresholds/weights) and RuntimeBudget (limits)

**Scene layout (slice)**
- Bootstrap scene for systems + UI
- World block scene for exteriors + zones
- Interiors as additive scenes or interior prefabs (addressable preferred)

**Addressables policy**
- All interiors, NPC prefabs, and interactables are addressables
- Central ContentSpawner tracks handles and releases on unload

## 8) Movement, input, and navigation
**Player controller**
- CharacterController-based movement
- Camera-relative movement, jump + gravity, tuned step/slope
- Interaction raycast + prompt UI

**Input**
- Input System PlayerInput
- Bindings: Move, Look, Interact, Open Log UI, Inspect Artifact, Debug toggle

**NPC navigation**
- Baked NavMesh preferred; runtime bake only as dev fallback
- Portals must restore NavMeshAgent reliably
- Door traversal via triggers or OffMeshLink (custom traversal optional)

## 9) Rendering and environment clarity
- Baked lighting for exteriors; light probes for dynamic objects
- Reflection probes favor baked over realtime
- LODGroups for repeated props/buildings
- Occlusion culling not valid for runtime-generated geometry
- Visual priority: signage + doors + key props + readable paths

## 10) Simulation systems (deterministic core)
**Structured Event**
- JSON-serializable, append-only, unique IDs, shapeable into canonical lines

**WELStore**
- JSONL append for debug/telemetry (not save/restore)

**Semantic Shaper**
- Deterministic templates; canonical lines <= 80 chars

**Spatial blackboards**
- Ring buffer per zone/object; TTL-based forgetting

**Knowledge injection**
- Near/FOV/noise tiers + personal memory TTL
- Priority: Evidence/Procedure > Violation > Gossip > General

**NPC brain contract**
- TickPerception → TickInjection → TickDecision → TickAction
- Data-driven state machine preferred; no capsule NPCs

**Organizations and procedures**
- Deterministic task graphs (e.g., Store Queue Procedure)

**Gossip network**
- Draft → Final (confirmed/debunked) transitions via evidence

**Artifacts**
- Tangible evidence linked to events/rumors/cases
- Minimum types: CCTV capture, ticket, rumor card, complaint, defense, approval note

**Police case + verdict**
- Case bundle with events + artifacts + reports
- Deterministic verdict rules; LLM only styles the line

## 11) UI/UX requirements
- HUD: recent local logs, suspicion, prompt/toast
- Artifact inventory + inspection panel
- Case board view
- Dev overlay: “why this happened” (last injected lines + decision reason)

## 12) Tooling and QA gates
**World Builder**
- Menu: `Tools/DreamOfOne/Rebuild World From Data`
- Spawns landmarks/zones/portals/interactables/NPC spawners
- Validates prefabs, portal pairs, overlaps, navmesh coverage

**Diagnostics**
- Menu: `Tools/DreamOfOne/Run Diagnostics`
- Verifies required singletons, WEL writing, blackboards, NPC count, portal safety

**Automated tests (Play Mode)**
1. Session start/end without errors
2. Portal roundtrip restores NavMeshAgent
3. Event emits canonical line
4. Rumor draft → final with evidence
5. Case verdict is deterministic

## 13) Performance requirements
- 0B allocations/frame in steady state
- Budgets: NPC 12-16, events 2-4/min (peak 10/min), blackboard 10 entries
- LLM budget <= 4/min average, <= 6/min peak
- Profile and fix dominant CPU/GPU bounds

## 14) Work packages (dependency-oriented)
**WP0 — Repo & Build Hygiene**
- WorldDefinition root, build config assets, JSONL logging

**WP1 — Event & Log Spine**
- EventBus, StructuredEvent, WELStore, SemanticShaper, blackboards

**WP2 — World Builder**
- Rebuild tool, spawn from data, validate

**WP3 — Player Controller & Input**
- CharacterController movement, PlayerInput, interaction

**WP4 — Navigation & Portal Robustness**
- Archetype prefabs, NavMeshAgent recovery, portal traversal

**WP5 — Org Procedures & Two Incidents**
- Store queue/label; Studio RC incident; at least one closure

**WP6 — Gossip, Evidence, Case, Verdict**
- Rumor propagation, artifact linking, case bundling

**WP7 — UI Completion**
- Artifact UI, case view, debug overlay

**WP8 — Performance & QA Gate**
- Play Mode tests, diagnostics expansion, GC profiling

## 15) Scaling plan (post-slice)
- Stage B: 3x3 block district with chunk streaming and cross-chunk rumor decay
- Stage C: multi-district city, more orgs, policy packs, session persistence

## 16) Document policy
- `project.md` is the integrated source of truth for decisions and scope.
- `new-plan.md` remains the detailed implementation contract and reference.
- Update `project.md` when decisions change; update `new-plan.md` when execution details change.

# Dream of One — Task Plan (Derived from docs/spec/new-plan.md)

**Purpose:** Provide an execution-ready checklist to implement the MCSS slice defined in docs/spec/new-plan.md.
**Revision date:** 2026-01-23

---

## 0) Guardrails (must hold for every task)
- Use Unity MCP only for scene/content changes.
- No manual placement as a dependency; all content is ScriptableObject or prefab/addressable driven.
- Deterministic core owns truth transitions; LLM is surface-only styling.
- `Tools/DreamOfOne/Rebuild World From Data` must build a playable world.
- `Tools/DreamOfOne/Run Diagnostics` must be clean after changes.
- Avoid steady-state allocations; enforce GC best practices.
- Preserve existing runtime helpers and scaffolding until replaced with data-driven equivalents.

## 1) MCSS Acceptance Checklist (10–12 minute run)
- [x] Player visits Store, Studio, Park, Police
- [x] ≥12 meaningful events
- [x] ≥6 log-driven social reactions (gossip/report/challenge)
- [x] ≥3 artifacts spawn + inspectable
- [x] ≥1 procedural closure (verdict/cleared/escalation)
- [x] Session ends with summary; no hard locks
- [x] LLM disabled mode still works (template-only)

---

## 2) Work Packages (dependency order)

### WP0 — Repo & Build Hygiene
- [x] Add or verify root WorldDefinition asset
- [x] Ensure JSONL logging folder + writer exists
- [x] Confirm URP config and required scenes registered
- [x] Verify TMP essentials under `Assets/TextMesh Pro`
- [x] Diagnostics clean with no console errors

### WP1 — Event & Log Spine
- [x] StructuredEvent schema with unique IDs and deterministic fields
- [x] EventBus (domain events) + WELStore JSONL append
- [x] SemanticShaper templates (<= 80 chars) for canonical lines
- [x] Spatial Blackboard ring buffers with TTL and capacity
- [x] UI feed consumes canonical lines deterministically
- [x] Add diagnostics checks for WEL writing + blackboards
- [x] Enforce canonical line max length and deterministic formatting

### WP2 — World Builder
- [x] Implement `Rebuild World From Data` tool
- [x] Spawn landmarks, zones, props, portals from ScriptableObjects
- [x] Spawn interactables + NPC spawners from data
- [x] Validate prefabs, portal pairs, overlaps, navmesh coverage
- [x] Emit build summary report
- [x] Ensure generated content can be fully rebuilt without manual edits

### WP3 — Player Controller & Input
- [x] CharacterController movement (camera-relative)
- [x] Jump + gravity + tuned slope/step settings
- [x] Interaction raycast + prompt UI
- [x] Input System PlayerInput with bindings:
  - Move, Look, Interact, Open Log UI, Inspect Artifact, Debug toggle
- [x] Diagnostics: movement + jump sanity checks

### WP4 — Navigation & Portal Robustness
- [x] Replace capsule NPCs with archetype prefabs (mesh + animator)
- [x] Reliable NavMeshAgent restore on portal exit
- [x] Door/portal traversal flow (trigger or OffMeshLink)
- [x] Baked navmesh for slice; runtime bake only as dev fallback
- [x] Stress: 100 portal roundtrips without stuck agents
- [x] OffMeshLink or deterministic portal traversal implemented if needed

### WP5 — Organization Procedures & Two Incidents
- [x] Store queue/label incident (violation → gossip → report → artifact)
- [x] Studio RC procedure incident (procedure → evidence → closure)
- [x] Ensure both can occur in a 10–12 min run without manual staging
- [x] Emit structured events + canonical lines for each step

### WP6 — Gossip, Evidence, Case, Verdict
- [x] Rumor objects (Draft → Final) with propagation rules
- [x] Evidence artifacts spawn and link to events/rumors/cases
- [x] Case bundle assembly (events + artifacts + reports)
- [x] Deterministic verdict rules (LLM styles only)
- [x] Artifact inspection UI shows linked events

### WP7 — UI Completion
- [x] HUD: local logs, suspicion, prompt/toast
- [x] Artifact inventory/inspection panel
- [x] Case board view
- [x] Dev overlay: last injected lines + decision reason

### WP8 — Performance & QA Gate
- [x] Play Mode tests:
  - Session start/end no errors
  - Portal roundtrip restores NavMeshAgent
  - Event emits canonical line
  - Rumor Draft → Final with evidence
  - Case verdict deterministic
- [x] Expand diagnostics to cover required singletons + portal safety
- [x] Profile and fix steady-state allocations (0B/frame)
- [x] Record CPU/GPU bound classification during profiling

---

## 3) Required Content (slice minimum)

### Landmarks (authored clarity)
- [x] Door mesh + portal marker alignment
- [x] Signage per landmark
- [x] Entrance prop cluster (bench/trash/light/notice)
- [x] Interior with ≥6 props and proper lighting

### Interactables (≥20 total)
- [x] Store: queue marker, label board, printer, shelf stock, complaint form
- [x] Studio: kanban, RC terminal, approval stamp, lounge hotspot
- [x] Park: bench rule marker, bulletin, quiet zone sign
- [x] Police: report desk, evidence board, ticket printer, interrogation spot

### Artifacts (minimum 6 types)
- [x] CCTV capture
- [x] Violation ticket
- [x] Rumor card (Draft → Final)
- [x] Complaint memo
- [x] Defense memo
- [x] Approval note

---

## 4) Deterministic LLM Policy (surface-only)
- [x] LLM never writes structured events or outcomes
- [x] Fallback to templates on LLM failure or timeout
- [x] LLM output limited to 1 line, <= 80 chars
- [x] Budget: avg <= 4 calls/min, peak <= 6 calls/min

---

## 5) Knowledge Injection Rules (must be implemented)
- [x] Near (<= 1.2m): read up to 3 newest entries
- [x] FOV (<= 8m in view): read up to 5 entries
- [x] Noise (<= 6m): read 1 heard entry
- [x] Personal memory: keep last 5 important entries, TTL ~8 min
- [x] Priority: Evidence/Procedure > Violations > Gossip > General

---

## 6) Data Schema Completeness (fields present)
### WorldDefinition
- [x] worldId, seedMode, seed
- [x] landmarks, zones, ruleset, policy packs, budgets

### LandmarkDefinition
- [x] id, displayName, exteriorPrefab
- [x] doorway + portal definitions
- [x] interior prefab/scene reference
- [x] signage + key props

### ZoneDefinition
- [x] id, shape, bounds/points
- [x] blackboardCapacity, ttlSeconds, noiseRadius
- [x] injection profile

### InteractableDefinition
- [x] id, prefab, verbs/state machine
- [x] emitted events, artifact rules
- [x] prompt template

### NpcArchetype
- [x] id, role, organization
- [x] routine, perception, injection
- [x] dialogue style, authority profile
- [x] prefab (non-capsule)

### Ruleset + RuleDefinition
- [x] detectors, severity, suspicion delta
- [x] artifact policy, canonical line template

### ArtifactDefinition
- [x] artifactId, prefab, state, ttlSeconds
- [x] inspect text template, links

---

## 7) Scene/Addressables Policy
- [x] Bootstrap scene hosts core systems + UI
- [x] World block scene hosts exteriors + zones
- [x] Interiors loaded additively or as addressable prefabs
- [x] All addressable handles released on unload
- [x] ContentSpawner owns instantiation + handle tracking

---

## 8) Profiling & Budgets
- [x] NPC max: 12–16
- [x] Event rate: baseline 2–4/min, peak 10/min
- [x] Blackboard capacity: 10 entries/zone
- [x] Steady allocations: 0B/frame outside load
- [x] Profiling: classify CPU vs GPU bound, fix dominant bound

---

## 9) Baseline Preservation (do not regress)
- [x] `RuntimeNavMeshBaker` still builds navmesh in play
- [x] `UILayouter` still arranges HUD at runtime
- [x] Prototype scene remains playable (`Assets/Scenes/Prototype.unity`)
- [x] Portal enter/exit restores NPC AI state

---

## 10) Verification Steps (run for each change)
- [x] `Tools/DreamOfOne/Rebuild World From Data`
- [x] `Tools/DreamOfOne/Run Diagnostics` until clean
- [x] Play Mode tests (WP8 list) pass
- [x] No console errors or warnings

---

## 11) Scaling Targets (post-slice)
- [x] Stage B: 3x3 block streaming, cross-chunk rumor decay
- [x] Stage C: multi-district city, more orgs, policy packs, persistence

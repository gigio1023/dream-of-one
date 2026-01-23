# Dream of One — Task Plan (Derived from new-plan.md)

**Purpose:** Provide an execution-ready checklist to implement the MCSS slice defined in new-plan.md.
**Revision date:** 2026-01-23

---

## 0) Guardrails (must hold for every task)
- Use Unity MCP only for scene/content changes.
- No manual placement as a dependency; all content is ScriptableObject or prefab/addressable driven.
- Deterministic core owns truth transitions; LLM is surface-only styling.
- `Tools/DreamOfOne/Rebuild World From Data` must build a playable world.
- `Tools/DreamOfOne/Run Diagnostics` must be clean after changes.
- Avoid steady-state allocations; enforce GC best practices.

## 1) MCSS Acceptance Checklist (10–12 minute run)
- [ ] Player visits Store, Studio, Park, Police
- [ ] ≥12 meaningful events
- [ ] ≥6 log-driven social reactions (gossip/report/challenge)
- [ ] ≥3 artifacts spawn + inspectable
- [ ] ≥1 procedural closure (verdict/cleared/escalation)
- [ ] Session ends with summary; no hard locks

---

## 2) Work Packages (dependency order)

### WP0 — Repo & Build Hygiene
- [ ] Add or verify root WorldDefinition asset
- [ ] Ensure JSONL logging folder + writer exists
- [ ] Confirm URP config and required scenes registered
- [ ] Verify TMP essentials under `Assets/TextMesh Pro`
- [ ] Diagnostics clean with no console errors

### WP1 — Event & Log Spine
- [ ] StructuredEvent schema with unique IDs and deterministic fields
- [ ] EventBus (domain events) + WELStore JSONL append
- [ ] SemanticShaper templates (<= 80 chars) for canonical lines
- [ ] Spatial Blackboard ring buffers with TTL and capacity
- [ ] UI feed consumes canonical lines deterministically
- [ ] Add diagnostics checks for WEL writing + blackboards

### WP2 — World Builder
- [ ] Implement `Rebuild World From Data` tool
- [ ] Spawn landmarks, zones, props, portals from ScriptableObjects
- [ ] Spawn interactables + NPC spawners from data
- [ ] Validate prefabs, portal pairs, overlaps, navmesh coverage
- [ ] Emit build summary report

### WP3 — Player Controller & Input
- [ ] CharacterController movement (camera-relative)
- [ ] Jump + gravity + tuned slope/step settings
- [ ] Interaction raycast + prompt UI
- [ ] Input System PlayerInput with bindings:
  - Move, Look, Interact, Open Log UI, Inspect Artifact, Debug toggle
- [ ] Diagnostics: movement + jump sanity checks

### WP4 — Navigation & Portal Robustness
- [ ] Replace capsule NPCs with archetype prefabs (mesh + animator)
- [ ] Reliable NavMeshAgent restore on portal exit
- [ ] Door/portal traversal flow (trigger or OffMeshLink)
- [ ] Baked navmesh for slice; runtime bake only as dev fallback
- [ ] Stress: 100 portal roundtrips without stuck agents

### WP5 — Organization Procedures & Two Incidents
- [ ] Store queue/label incident (violation → gossip → report → artifact)
- [ ] Studio RC procedure incident (procedure → evidence → closure)
- [ ] Ensure both can occur in a 10–12 min run without manual staging
- [ ] Emit structured events + canonical lines for each step

### WP6 — Gossip, Evidence, Case, Verdict
- [ ] Rumor objects (Draft → Final) with propagation rules
- [ ] Evidence artifacts spawn and link to events/rumors/cases
- [ ] Case bundle assembly (events + artifacts + reports)
- [ ] Deterministic verdict rules (LLM styles only)
- [ ] Artifact inspection UI shows linked events

### WP7 — UI Completion
- [ ] HUD: local logs, suspicion, prompt/toast
- [ ] Artifact inventory/inspection panel
- [ ] Case board view
- [ ] Dev overlay: last injected lines + decision reason

### WP8 — Performance & QA Gate
- [ ] Play Mode tests:
  - Session start/end no errors
  - Portal roundtrip restores NavMeshAgent
  - Event emits canonical line
  - Rumor Draft → Final with evidence
  - Case verdict deterministic
- [ ] Expand diagnostics to cover required singletons + portal safety
- [ ] Profile and fix steady-state allocations (0B/frame)

---

## 3) Required Content (slice minimum)

### Landmarks (authored clarity)
- [ ] Door mesh + portal marker alignment
- [ ] Signage per landmark
- [ ] Entrance prop cluster (bench/trash/light/notice)
- [ ] Interior with ≥6 props and proper lighting

### Interactables (≥20 total)
- [ ] Store: queue marker, label board, printer, shelf stock, complaint form
- [ ] Studio: kanban, RC terminal, approval stamp, lounge hotspot
- [ ] Park: bench rule marker, bulletin, quiet zone sign
- [ ] Police: report desk, evidence board, ticket printer, interrogation spot

### Artifacts (minimum 6 types)
- [ ] CCTV capture
- [ ] Violation ticket
- [ ] Rumor card (Draft → Final)
- [ ] Complaint memo
- [ ] Defense memo
- [ ] Approval note

---

## 4) Verification Steps (run for each change)
- [ ] `Tools/DreamOfOne/Rebuild World From Data`
- [ ] `Tools/DreamOfOne/Run Diagnostics` until clean
- [ ] Play Mode tests (WP8 list) pass
- [ ] No console errors or warnings

---

## 5) Scaling Targets (post-slice)
- [ ] Stage B: 3x3 block streaming, cross-chunk rumor decay
- [ ] Stage C: multi-district city, more orgs, policy packs, persistence


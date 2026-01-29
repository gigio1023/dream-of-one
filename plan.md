# Dream of One — Execution Plan (Lucid Cover Social Stealth v1)

Revision date: 2026-01-29  
Plan sources: `project.md`, `docs/design/dream-laws.md`, `docs/design/cover-tests.md`  
Work tracking: Linear (Dream-of-one team). This file is a roadmap (not a task tracker).

## 0) Constraints (must stay true)
- Unity project root: `draem-of-one/`
- Scene authority: `Assets/Scenes/Prototype.unity`
- Determinism boundary:
  - Truth transitions (Suspicion/Exposure deltas, Report generation, Inquest verdicts, Artifact creation) are deterministic.
  - LLM is styling-only and must have a deterministic fallback.
- Rebuildability: `Tools/DreamOfOne/Rebuild World From Data` produces a playable world.
- Diagnostics gate: `Tools/DreamOfOne/Run Diagnostics` must be clean.
- Performance: steady-state allocations 0B per frame (excluding loads/transitions).

## 1) MCSS target (what “done” means for v1 slice)
- Session length: 10–12 minutes.
- Landmarks: Store / Studio / Park / Station.
- Must occur in one run:
  - >= 2 Cover Tests trigger (CT-01..CT-06).
  - >= 3 artifacts about `PLAYER` are created and inspectable.
  - >= 1 report OR >= 1 near-miss (enter Reporting stage).
  - End summary: Clean Pass / Narrow Escape / Exposed.
- Immediate lose: Verdict == “Lucid identified”.
- Always visible: “what raised suspicion/exposure and why” (lawId + detectorId + witness + record).

## 2) Implementation plan (recommended order)

### Phase 1 — Data schemas + IDs (no gameplay change)
Deliverables
- ScriptableObject schemas for v1 content:
  - DreamLawDefinition (DL_*)
  - CoverTestDefinition (CT_*)
  - TextSurfaceDefinition (TS_*)
  - ArtifactDefinition (Witness Statement / Memo / Ticket / Notice Snapshot / Approval Note)
- Keyword sets (KO/EN) for speech detectors.
- World rebuild pipeline can place/instantiate TextSurfaces and bind DreamLawIds deterministically.

Verification
- Rebuild produces all 4 landmarks and required text surfaces exist.
- Diagnostics clean.

### Phase 2 — Suspicion + Exposure + detectors (deterministic)
Deliverables
- Global Exposure (0–100) with thresholds (60 attention, 100 exposed).
- Detector evaluation that maps (speech act + keywords + context) -> (law hits + deltas + evidence policy).
- “Why visibility contract” is enforced in UI/logs: trigger + witness + created record linkage.

Verification
- Same input yields same deltas/evidence in LLM-off mode.

### Phase 3 — Text interaction model (Speech Acts)
Deliverables
- Player input constrained to Speech Acts (SA_COMPLY / SA_INQUIRE / SA_FRAME / SA_BREAK).
- Optional 1-line text input for styling only (LLM or template).
- Station multiplier rules apply for speech violations at intake.

Verification
- “Break” immediately spikes Exposure per rules; non-break stays within deterministic bounds.

### Phase 4 — Artifacts + Inquest Dossier (player case)
Deliverables
- Artifact generation policies:
  - Witness Statement as default for law hits.
  - Defense Memo creation path (fairness/defuse).
  - Ticket/Receipt and Notice Snapshot when procedural/text surface context exists.
- Report -> Station flow opens an Inquest Dossier for suspect `PLAYER`.
- Deterministic verdict scoring and thresholds:
  - Cleared / Warning / Detained / Lucid identified (immediate end).

Verification
- Dossier UI shows evidence list + readable reason lines for the verdict.

### Phase 5 — Cover Tests v1 (CT-01..CT-06)
Deliverables
- Implement Cover Test triggers, escalation ladders, evidence outputs, and defuse options as deterministic templates.
- Ensure at least 2 Cover Tests can occur in a 10–12 min run (including CT-06 as optional pressure).

Verification
- One run can produce: “suspicious -> challenging -> reporting -> dossier -> verdict” and also a “narrow escape” route.

### Phase 6 — QA automation (gates)
Deliverables
- PlayMode tests (minimum):
  1) Session start/end without errors.
  2) At least one CoverTest triggers escalation.
  3) Inquest dossier can form and verdict is deterministic.
  4) LLM disabled still passes.

Verification
- Local batch scripts pass where available (`scripts/unity/run_all_checks.sh`).

## 3) Supporting passes (non-blocking unless they break MCSS)
- World readability: landmark silhouettes + road navigation clarity.
- Portal + NavMesh stability: no hard locks, no stuck agents.
- HUD clarity: Suspicion (local/org) + Exposure + checklist + last reason codes always readable.

## 4) Progress log
- 2026-01-29: v1 contract docs saved + plan synced (Linear: DRE-60).

## 5) Next run focus
- Build Phase 1 schemas and hook *one* Dream Law to *one* Text Surface end-to-end (law hit -> log -> evidence -> UI “why”).

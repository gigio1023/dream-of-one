---
doc: docs/design/rule-runtime-trace-matrix.md
project: Dream of One
revision: 2026-02-18
status: Active
---

# Rule-to-Runtime Trace Matrix (WS2.1)

## 1) Goal
- Link Dream Law and Cover Test clauses to runtime-observable Evidence points.
- Classify non-executable clauses as `blocking` or `backlog` for v0.1 release governance.

## 2) Runtime observability anchors
Runtime Path Evidence for this matrix is limited to:
- Decision fields: `transport`, `threadId`, `usedFallback`, `reason`, `reasonCategory`, `warningTier`, `socialLoopStage`, `playerSpeechAct`.
- Telemetry records: `npc_decision_response`, `npc_decision_response_dropped`.
- Evidence Pack summaries: `decisionSummary.reasonCategory`, `decisionSummary.socialLoopStage`, `trajectorySummary.runSignature`.
- Gate artifacts: `data/evidence/ws8/gate-h/*-evidence-pack.json`, `data/evidence/ws8/gate-h/*-events.json`, `data/evidence/ws8/gate-h/trajectory-diversity.json`.

## 3) Dream Law trace matrix
| Rule ID | Design clause | Runtime trace point | Evidence fields | Executability status |
|---|---|---|---|---|
| `DL_G1` | No Dream Talk | Policy rejection when prohibited speech intent is detected | `reason`, `reasonCategory=policy`, `warningTier`, event line | `blocking` (detector mapping not implemented) |
| `DL_G2` | No Reality Testing | Policy rejection for reality-check attack speech | `reason`, `reasonCategory=policy`, `socialLoopStage` | `blocking` (detector mapping not implemented) |
| `DL_G3` | No Meta-Logic Attack | Policy rejection for meta-logic challenge utterances | `reason`, `reasonCategory=policy`, `warningTier` | `blocking` (detector mapping not implemented) |
| `DL_G4` | No Timeline Probing | Policy rejection for timeline probing | `reason`, `reasonCategory=policy`, `socialLoopStage` | `blocking` (detector mapping not implemented) |
| `DL_G5` | Cover Consistency | Invalid speech-act and bounded command guardrails | `playerSpeechAct`, `reason=policy_invalid_player_speech_act`, `usedFallback` | `partial` |
| `DL_S1` | Queue Sanctity | Report-stage escalation when queue/order incidents are observed | `socialLoopStage=report`, event keywords (`report`, `ticket`, `complaint`) | `partial` |
| `DL_S2` | Label Authority | Report-stage escalation for label disputes | `socialLoopStage=report`, `reasonCategory`, evidence-pack decision counters | `backlog` (no direct label detector) |
| `DL_ST1` | Approval Criteria | Report/intake escalation when approval artifacts are missing | `socialLoopStage=report|intake`, `reasonCategory`, verdict artifacts | `partial` |
| `DL_P1` | Observation Etiquette | Park observation pressure escalation with witness artifacts | `socialLoopStage=report`, witness references in events snapshot | `backlog` (witness attribution not deterministic) |
| `DL_N1` | Procedure Speech Only | Intake-stage hard policy for `SA_BREAK` rejection | `reason=policy_station_intake_requires_procedural_speech`, `socialLoopStage=intake`, `usedFallback=true` | `executable` |

## 4) Cover Test trace matrix
| Cover Test | Expected runtime behavior | Required runtime trace | Required artifact set | Executability status |
|---|---|---|---|---|
| `CT-01` Store Queue Language | Queue conflict moves from ambient to report stage | `socialLoopStage` transition, complaint/ticket event | run-level events snapshot + Evidence Pack summary | `partial` |
| `CT-02` Store Label Meaning | Label dispute produces traceable report and memo lane | `socialLoopStage=report`, `reasonCategory` distribution | events snapshot with label-related records | `backlog` |
| `CT-03` Studio Approval Criteria Speech | Approval claim must be tied to artifacts before acceptance | report/intake stage transitions and explicit reason fields | Evidence Pack + run manifest links | `partial` |
| `CT-04` Park Observation Pressure | Observation pressure is legible and escalates with witness context | report-stage records with witness references | events snapshot and review template notes | `backlog` |
| `CT-05` Station Soft Inquest | Intake at `Station` enforces procedural speech constraints | `socialLoopStage=intake`, `policy_station_intake_requires_procedural_speech` | events snapshot + Evidence Pack reason counters | `executable` |
| `CT-06` Global Reality Check Contagion | Cross-landmark pressure pattern appears in multi-run trajectory | non-identical `trajectorySummary.runSignature` across >=3 runs | `trajectory-diversity.json` + per-run evidence packs | `executable` |

## 5) Non-executable classification
### Blocking (must close for `design-complete`)
- Missing detector-to-Reason Code mapping for `DL_G1` through `DL_G4`.
- No deterministic runtime detector for Store `DL_S2` label authority dispute outcomes.
- No deterministic witness attribution contract for Park `DL_P1` pressure evidence.

### Backlog (post-v0.1 expansion unless promoted)
- Fine-grained per-law detector IDs in telemetry payloads (current payloads aggregate by stage/category).
- Landmark-specific witness confidence scoring for report/intake/verdict transitions.

## 6) Acceptance Criteria
- Every global and landmark Dream Law appears in this matrix with explicit trace points.
- Every Cover Test has required runtime traces and artifact expectations.
- Non-executable items are explicitly classified as `blocking` or `backlog`.

## 7) Validation Criteria
- Sample run review confirms each v0.1 mandatory rule has at least one runtime-observable trace point.
- `design-complete` status is blocked while any item in Section 5 `Blocking` remains unresolved.
- Gate evidence links remain machine-verifiable at declared paths.

## 8) Authority links
- Product Definition: `project.md`
- Design intent: `docs/design/dream-laws.md`, `docs/design/cover-tests.md`, `docs/design/game-design.md`
- Runtime Specification: `backend/npc-runtime/src/contracts/types.ts`, `backend/npc-runtime/src/runtime/bounded-behavior.ts`, `backend/npc-runtime/src/runtime/telemetry.ts`
- Runtime Evidence operations: `docs/design/runtime-evidence.md`

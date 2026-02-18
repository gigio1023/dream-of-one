---
doc: docs/design/social-causality-verification.md
project: Dream of One
revision: 2026-02-18
status: Active
---

# Social Causality Verification (WS2.2-WS2.4)

## 1) Goal
- Standardize deterministic report/intake/verdict causality requirements.
- Guarantee player-readable “why” lines and artifact linkage for each escalation stage.
- Keep v0.1 behavior within bounded Runtime Path constraints.

## 2) Causality line Specification
Each escalation record must be reconstructable as a single causality line:

`Trigger -> Witness -> Record -> Stage transition -> Outcome`

Minimum required fields:
- `trigger`: event token or landmark trigger source.
- `witness`: at least one NPC role or organization witness source.
- `record`: artifact type (`ticket`, `memo`, `statement`, `notice snapshot`, `case log`).
- `stage transition`: `ambient|report|intake|verdict`.
- `outcome`: `cleared|warning|detained|lucid_identified|case_closed` mapped into runtime reason and warning metadata.

## 3) Stage-by-stage deterministic requirements
| Stage | Trigger requirements | Witness requirements | Record requirements | Runtime fields that must exist |
|---|---|---|---|---|
| `report` | Trigger must come from recent event tokens (`report`, `statement`, `complaint`, `ticket`, `memo`) | Witness organization must be inferable from NPC context | At least one report artifact must be emitted | `socialLoopStage=report`, `reasonCategory`, `warningTier` |
| `intake` | Trigger must come from `Station` landmark or intake tokens (`intake`, `inquest`, `dossier`, `report_desk`, `interrogation`) | Station witness role must be identifiable | Intake dossier update or procedural statement record is required | `socialLoopStage=intake`, `playerSpeechAct`, policy reason when fallback occurs |
| `verdict` | Trigger must include verdict tokens (`verdict`, `detained`, `cleared`, `lucid_identified`, `case_closed`) | Final authority witness must be identifiable (`Officer` path) | Verdict record must include final outcome reason | `socialLoopStage=verdict`, `reason`, `reasonCategory`, `transport` |

## 4) Artifact categories by escalation stage
| Stage | Required artifact categories | Optional artifact categories |
|---|---|---|
| `report` | complaint/ticket/memo line, witness reference | notice snapshot, defense memo |
| `intake` | intake dossier line, procedural speech log | cross-landmark witness memo |
| `verdict` | final verdict line, reason/why summary | fairness explanation note |

## 5) Landmark scenario closure requirements
### Store
- Minimum trigger set: queue dispute or label dispute.
- Required records: `Violation Ticket` and either `Complaint Memo` or `Defense Memo`.
- Required runtime trace: at least one `report` stage transition in the run set.

### Studio
- Minimum trigger set: Release Candidate approval mismatch claim.
- Required records: `Approval Note` alignment and release note mismatch record.
- Required runtime trace: report-to-intake progression in at least one run.

### Park
- Minimum trigger set: observation-pressure complaint.
- Required records: `Complaint Memo` and policy witness note.
- Required runtime trace: report-stage pressure record with witness link.

### Station
- Minimum trigger set: inquest intake plus one procedural speech test.
- Required records: intake dossier line and verdict line.
- Required runtime trace: `policy_station_intake_requires_procedural_speech` appears when `SA_BREAK` is attempted during intake.

## 6) Bounded behavior consistency policy
v0.1 runtime behavior must remain within these bounded constraints:
- NPC Action Type must remain inside `Move|Talk|Ask|Observe|Work|Report|Escort|Idle`.
- Player speech acts must remain inside `SA_COMPLY|SA_INQUIRE|SA_FRAME|SA_BREAK`.
- Station intake must reject `SA_BREAK` with deterministic Fallback Path reasoning.
- Release planning must not require unbounded natural-language reasoning outside Runtime Path validation.

## 7) Acceptance Criteria
- Every escalation stage has deterministic trigger/witness/record requirements.
- Landmark coverage is defined for `Store`, `Studio`, `Park`, and `Station`.
- Bounded behavior policy is aligned with runtime contracts.

## 8) Validation Criteria
- Three-run acceptance sample can reconstruct causality lines for each stage.
- Reviewer can answer “what triggered / who witnessed / what record was created” for each landmark.
- No v0.1 acceptance requirement depends on unbounded behavior outside current Runtime Path constraints.

## 9) Authority links
- Product Definition: `project.md`
- Rule matrix: `docs/design/rule-runtime-trace-matrix.md`
- Design sources: `docs/design/dream-laws.md`, `docs/design/cover-tests.md`, `docs/design/game-design.md`
- Runtime contracts: `backend/npc-runtime/src/contracts/types.ts`
- Runtime enforcement: `backend/npc-runtime/src/runtime/bounded-behavior.ts`
- Runtime Evidence: `docs/design/runtime-evidence.md`

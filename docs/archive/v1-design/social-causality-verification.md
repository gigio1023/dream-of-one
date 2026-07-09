---
doc: docs/design/social-causality-verification.md
project: Dream of One
revision: 2026-02-18
status: Active, conversation redesign required
---

# Social Causality Verification (WS2.2-WS2.4)

## 1) Goal
- Standardize deterministic report/intake/verdict causality requirements.
- Guarantee player-readable “why” lines and artifact linkage for each escalation stage.
- Keep v0.1 behavior within bounded Runtime Path constraints.
- Align the next proof with conversation-first suspicion: prompt, player line,
  anomaly signal, NPC suspicion, social share/report, Station consequence.

## 2) Causality line Specification
Each escalation record must be reconstructable as a single causality line:

`Conversation trigger -> Witness -> Record -> Social transition -> Stage transition -> Outcome`

Minimum required fields:
- `conversation trigger`: conversation id, prompt id, selected choice id or free-input hash, and displayed player line.
- `witness`: at least one NPC role or organization witness source.
- `record`: artifact type (`conversation log`, `anomaly record`, `witness memo`, `Station report`, `case log`).
- `social transition`: `normal|uneasy|probing|shared|reported`.
- `stage transition`: `ambient|report|intake|inquest|verdict`.
- `outcome`: `cleared|warning|detained|lucid_identified|case_closed` mapped into runtime reason and warning metadata.

## 3) Stage-by-stage deterministic requirements
| Stage | Trigger requirements | Witness requirements | Record requirements | Runtime fields that must exist |
|---|---|---|---|---|
| `report` | Trigger must come from conversation anomaly signals or social share events | Witness NPC must be identifiable | At least one report artifact must be emitted | `socialLoopStage=report`, `conversationId`, `suspicionSignals`, `reasonCategory`, `warningTier` |
| `intake` | Trigger must come from Station receiving or observing a report | Station witness role must be identifiable | Intake dossier update or procedural statement record is required | `socialLoopStage=intake`, `conversationId`, `selectedChoiceId/freeInputHash`, policy reason when fallback occurs |
| `inquest` | Trigger must compare current answer with prior conversation records | Station or formal witness must be identifiable | Inquest dossier references prior turns and contradiction predicates | `socialLoopStage=inquest`, `priorTurnIds`, `suspicionSignals`, `whyLine` |
| `verdict` | Trigger must include verdict tokens (`verdict`, `detained`, `cleared`, `lucid_identified`, `case_closed`) | Final authority witness must be identifiable (`Officer` path) | Verdict record must include final outcome reason | `socialLoopStage=verdict`, `reason`, `reasonCategory`, `transport` |

## 4) Artifact categories by escalation stage
| Stage | Required artifact categories | Optional artifact categories |
|---|---|---|
| `report` | conversation anomaly record, witness reference, social share report | notice snapshot, defense memo |
| `intake` | intake dossier line, conversation turn log | cross-landmark witness memo |
| `inquest` | contradiction comparison, prior-turn references, why-line | repair attempt note |
| `verdict` | final verdict line, reason/why summary | fairness explanation note |

## 5) Landmark scenario closure requirements
### Store
- Minimum trigger set: routine conversation mismatch, memory gap admission, dream-language leak, or over-explanation.
- Required records: `ConversationTurnLog`, `AnomalyRecord`, and either `SocialShareReport` or `RepairNote`.
- Required runtime trace: at least one social transition from `normal` to `uneasy` or `reported` in the run set.

### Studio
- Minimum trigger set: Release Candidate approval mismatch claim.
- Required records: `Approval Note` alignment and release note mismatch record.
- Required runtime trace: report-to-intake progression in at least one run.

### Park
- Minimum trigger set: observation-pressure complaint.
- Required records: `Complaint Memo` and policy witness note.
- Required runtime trace: report-stage pressure record with witness link.

### Station
- Minimum trigger set: a report or contradiction from prior conversation records.
- Required records: intake dossier line, prior turn reference, and verdict or repair line.
- Required runtime trace: Station consequence is reconstructable from conversation trigger -> witness -> record -> transition -> outcome.

## 6) Bounded behavior consistency policy
Current runtime behavior must remain within these bounded constraints until the conversation schema replaces the old player-facing loop:
- NPC Action Type must remain inside `Move|Talk|Ask|Observe|Work|Report|Escort|Idle`.
- Existing player speech acts may remain as internal classification results, but the UI should expose dialogue choices and optional free input, not abstract speech-act buttons.
- Station intake must reject or escalate risky dialogue with deterministic Fallback Path reasoning.
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

# Beat-To-Runtime Matrix

## Purpose

This matrix is the executable scenario spec for the small release. Each row must become runtime state, content, UI, and QA evidence.

## Beat Matrix

| Beat | Time | Location | Player Goal | Rule Surface | Cover Test | Examiner | Codex Role | Deterministic Result | Evidence | Repair |
|---|---:|---|---|---|---|---|---|---|---|---|
| `B01_STATION_OPENING` | 0-3 | Station exterior | Learn that records are already active. | `TS_Station_IntakeRules` | `CT_READ_BEFORE_REPLY` | Station system | None | Reading unlocks route objective; skipping raises warning flag only after first pressure. | `Artifact_ProcedureRead` | Read board later before intake. |
| `B02_STORE_QUEUE` | 3-8 | Store | Buy/confirm item without over-explaining. | `TS_Store_QueueLabelRules` | `CT_QUEUE_LANGUAGE` | Store Clerk | Clerk pressure line | `SA_COMPLY` holds cover; `SA_INQUIRE` hints; `SA_FRAME` minor delta; `SA_BREAK` creates mismatch. | `QueueMismatchEvent` or `QueueReceipt` | Cite label/count at Station. |
| `B03_STUDIO_APPROVAL` | 8-14 | Studio | Request review using source, owner, reason. | `TS_Studio_ApprovalCriteria` | `CT_SOURCE_OWNER_REASON` | Studio PM | PM pressure line | Missing field creates `ReviewArtifact`; complete fields can reduce prior risk. | `ReviewArtifact` or `ProvisionalApproval` | Submit missing field before leaving Studio. |
| `B04_PARK_PUBLIC_FLOW` | 14-19 | Park | Cross public space without dream narration. | `TS_Park_PublicFlowNotice` | `CT_PUBLIC_FLOW_RESTRAINT` | Park Witness | Witness pressure line | Restraint holds cover; over-explanation creates public statement or snapshot. | `NoticeSnapshot` or `WitnessStatement` | Use ordinary route explanation at Station. |
| `B05_STATION_INTAKE` | 19-23 | Station report desk | Let Station formalize records. | `TS_Station_ReportDeskNotice` | `CT_RECORD_ALIGNMENT` | Station Officer | Officer narrowing line | Backend opens or skips intake from thresholds and artifacts. | `StationReport` | Correct one prior mismatch if threshold allows. |
| `B06_SOFT_INQUEST` | 23-28 | Station inquest desk | Answer who/what/where consistently. | `TS_Station_InquestPrompt` | `CT_CONTRADICTION_CHECK` | Station Officer | Officer pressure line | Backend compares answers against prior Evidence. | `InquestDossier` | One procedural clarification before verdict-ready. |
| `B07_VERDICT_EDGE` | 28-30 | Station chamber | Receive final state and why-line. | `TS_Station_FinalNotice` | `CT_FINAL_RECORD_REVIEW` | Station system | None | Backend emits clean cover, warning, verdict-ready, or lucid identified. | `FinalRecord` | Restart/new run only. |

## Required Per-Beat Content

### `B01_STATION_OPENING`

| Field | Requirement |
|---|---|
| First view | Station sign, intake board, route cue to Store, Officer silhouette. |
| Player lesson | Read first; answer later. |
| HUD | Exposure meter visible but calm; objective says read Station rule. |
| Audio | Low civic room tone; small chime after rule read. |
| Failure | Do not punish immediately. Mark `openingRuleSkipped` only if player enters next pressure zone unread. |

### `B02_STORE_QUEUE`

| Field | Requirement |
|---|---|
| Rule | Item count and label confirmation matter more than personal explanation. |
| NPC pressure | Clerk asks a short line about count, label, or queue position. |
| Good answer | "Label confirmed. One item." |
| Bad answer | Mentions dream state, unseen procedure, or contradicts visible label. |
| Why-line | "Store Clerk recorded a queue mismatch because your answer did not match the label rule." |
| Screenshot | Counter, queue rail, label board, Clerk, HUD delta. |

### `B03_STUDIO_APPROVAL`

| Field | Requirement |
|---|---|
| Rule | Source, owner, and reason must be named. |
| NPC pressure | PM asks for the missing field only; no generic suspicion. |
| Good answer | Names source, owner, reason. |
| Bad answer | Gives mood, dream, or vague creative explanation. |
| Why-line | "Studio review flagged missing owner/reason; the approval record remains provisional." |
| Screenshot | Criteria wall, review desk, project board, PM. |

### `B04_PARK_PUBLIC_FLOW`

| Field | Requirement |
|---|---|
| Rule | Public flow rewards restraint and observable route language. |
| NPC pressure | Witness asks why the player paused, crossed, or looked back. |
| Good answer | "I followed the posted route to Station." |
| Bad answer | "I know this is a dream" or any non-procedural explanation. |
| Why-line | "Park Witness recorded a public-flow break because your answer left the posted route frame." |
| Screenshot | Notice board, path, photo spot, Station sightline. |

### `B05_STATION_INTAKE`

| Field | Requirement |
|---|---|
| Rule | Station compares records; it does not ask the player to solve them. |
| NPC pressure | Officer narrows one contradiction at a time. |
| Good answer | Cites visible procedure or existing artifact. |
| Bad answer | Invents new facts or contradicts previous artifact. |
| Why-line | "Station intake opened because two public records required comparison." |
| Screenshot | Report desk, evidence list, Officer, active question. |

### `B06_SOFT_INQUEST`

| Field | Requirement |
|---|---|
| Rule | Who/what/where answers must align with prior records. |
| NPC pressure | Officer asks formal comparison questions. |
| Good answer | Aligns with recorded artifact chain. |
| Bad answer | Explains intent instead of record. |
| Why-line | "Inquest advanced because your Station answer contradicted the Store record." |
| Screenshot | Dossier UI, question, selected speech act, why-line. |

### `B07_VERDICT_EDGE`

| Field | Requirement |
|---|---|
| Rule | Final state cites the record chain. |
| Text | End card includes outcome, Exposure band, decisive artifacts, replay affordance. |
| No-go | Do not fade out with only mood text. |
| Why-line | Must name decisive trigger, witness/system, record, and final consequence. |
| Screenshot | End state and Evidence chain visible. |

## Canonical Playtest Paths

| Path | Required Choices | Expected Result |
|---|---|---|
| Clean Cover | Read all surfaces; mostly `SA_COMPLY`; one `SA_INQUIRE`. | Clean cover or warning below danger threshold. |
| Messy Repair | One `SA_FRAME`; one early mistake; repair at Station. | Intake opens, but verdict-ready is avoided. |
| Lucid Fracture | Skip surfaces; use `SA_BREAK` twice; contradict in Station. | Verdict-ready or lucid identified with complete why-line. |

## Implementation Gate

No beat is implementation-ready until it has:

- text surface string keys in Korean and English;
- runtime IDs for law, test, trigger, artifact, and examiner;
- Codex role card if NPC pressure is used;
- deterministic backend result table;
- Godot placement requirement;
- QA artifact path and pass/fail criteria.

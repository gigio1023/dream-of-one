# First Playable Scenario

This file is retained as migration-era playable-loop implementation notes. Active scenario canon lives in `docs/scenario/`, especially `docs/scenario/bible/12-conversation-suspicion-prologue.md`.

## Scenario Name

`Station Soft Inquest`

## Player Fantasy

The player is not solving a case. The player is trying to pass as procedurally normal while Store, Park, Studio, and Station systems record inconsistencies.

## Opening State

- Spawn near Station.
- HUD objective: read the Station intake board, then follow public procedure.
- Visible world: Store, Studio, Park, Station, NPC placeholders, routes, interaction zones, and Dream Law text surfaces.
- Stage: `ambient`.
- Exposure: `0`.

## Required Player Actions

1. Read at least one Dream Law text surface with `interact`.
2. Enter a Cover Test zone.
3. Choose a bounded speech act:
   - `SA_COMPLY`: procedural answer, defuses pressure.
   - `SA_INQUIRE`: asks for clarification, small pressure.
   - `SA_FRAME`: reframes the situation, medium pressure.
   - `SA_BREAK`: dream-state or non-procedural speech, heavy pressure.
4. Watch Exposure and Station state update.
5. Reach either defuse or verdict-ready state.

## Cover Test Map

| Cover Test | Location | Defuse | Failure Evidence |
|---|---|---|---|
| `CT_STORE_QUEUE_LANGUAGE` | Store counter | Restate item count and confirm label. | `QueueMismatchEvent`, `WitnessStatement` |
| `CT_STUDIO_APPROVAL_GATE_SPEECH` | Studio approval desk | Provide source, owner, and reason. | `ApprovalMismatchEvent`, `ReviewArtifact` |
| `CT_PARK_OBSERVATION_PRESSURE` | Park photo spot | Return to public-flow observation language. | `NoticeSnapshot`, `Statement` |
| `CT_STATION_SOFT_INQUEST` | Station report desk | Answer procedural questions consistently. | `StationReport`, `InquestDossier` |

## Prototype Thresholds

| Exposure | State |
|---:|---|
| `0-59` | Ambient/report pressure only. |
| `60-79` | Station intake opens. |
| `80-99` | Inquest opens. |
| `100+` | Verdict ready and session termination allowed. |

## Why-Line Requirements

Every Cover Test result must produce a why-line with:

- cover test id.
- speech act.
- Exposure delta.
- Station state change when any threshold crosses.
- defuse/failure wording.

## Definition Of Playable

The current M1 proof is playable when a fresh user can launch the project and, without reading docs, understand where they are, what NPC prompt is active, what the three dialogue choices mean, why pressure changed, and whether they defused or escalated the session.

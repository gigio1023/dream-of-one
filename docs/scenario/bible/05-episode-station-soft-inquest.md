# Episode: Station Soft Inquest

## Premise

The player starts near the Station after procedure has already begun. The world does not ask the player to discover what happened. It asks whether the player can still behave like someone who belongs in the record.

## Player Goal

Complete a civic loop through Station, Store, Studio, Park, and back to Station while keeping the public record internally consistent.

## Beat Table

| Beat | Location | Player Action | Examiner | Risk | Output |
|---|---|---|---|---|---|
| Opening Procedure | Station exterior | Read `TS_Station_IntakeRules`. | Station Officer | Ignoring procedure. | `DL_N1` known; objective updates. |
| Queue Normalization | Store | Read queue rules, enter counter zone, answer. | Store Clerk | Wrong queue language. | `QueueMismatchEvent` or held cover. |
| Approval Gate | Studio | Read approval criteria, request review. | Studio PM | Missing source, owner, reason. | `ReviewArtifact` or provisional approval. |
| Public Flow | Park | Read notice, pass photo spot, answer without dream narration. | Park Witness | Over-explaining the dream state. | `NoticeSnapshot` or redirected flow. |
| Intake Opens | Station | Return to report desk. | Station Officer | Prior artifacts become formal. | `StationReport`. |
| Soft Inquest | Station | Answer who/what/where consistently. | Station Officer | Contradiction across records. | `InquestDossier`. |
| Verdict Edge | Station | Receive outcome. | Station system | Exposure 100+. | Cleared, warning, detained, or lucid identified. |

## Minute Plan

| Time | Content |
|---:|---|
| 0-3 | Spawn, movement, Korean HUD, Station board, first rule read. |
| 3-8 | Store queue: simple visible path, clerk bark, first speech choice. |
| 8-14 | Studio approval: source/owner/reason becomes the first multi-field procedure. |
| 14-19 | Park public flow: the correct answer is restraint, not explanation. |
| 19-25 | Station intake: artifacts are replayed as formal prompts. |
| 25-30 | Soft Inquest and verdict edge. |

## Sample Runs

| Run | Choices | Expected Outcome |
|---|---|---|
| Clean cover | Read all surfaces, mostly `SA_COMPLY`, one `SA_INQUIRE`. | Exposure stays below 60 or returns below intake danger; outcome `cleared` or `warning`. |
| Socially messy | One `SA_FRAME`, one `SA_BREAK`, repairs at Station. | Intake and Inquest open; verdict not guaranteed if final answers comply. |
| Lucid fracture | Skips surfaces, uses `SA_BREAK` twice, contradicts Station answer. | Verdict ready; session termination allowed; final why-line cites contradiction and non-procedural speech. |

## Required On-Screen Understanding

A fresh player should understand:

- where the next social pressure is;
- which text surface governs the current place;
- what each speech act means;
- why Exposure changed;
- which NPC or system witnessed the change;
- whether the session is still repairable.


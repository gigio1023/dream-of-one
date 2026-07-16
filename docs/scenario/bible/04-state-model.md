# State Model

Status: legacy state model with conversation redesign additions required.

The active redesign needs first-class conversation fields:
`conversationId`, `turnId`, `promptId`, `choiceSetId`, `selectedChoiceId`,
`freeInputHash`, displayed player line, deterministic `suspicionSignals`,
NPC suspicion tier, social report weight, and prior-turn references. Existing
`SA_*` speech acts may remain as internal classifiers during migration, but the
player-facing UI should expose dialogue choices and optional recorded free input.

## Core State

| Field | Type | Owner | Meaning |
|---|---|---|---|
| `exposure` | integer `0..100+` | Backend/product rules | Formal pressure score. |
| `socialLoopStage` | enum | Backend/product rules | `ambient`, `report`, `intake`, `inquest`, `verdict`. |
| `readTextSurfaceIds` | string set | Godot observed, backend validated | Dream Law surfaces the player has read. |
| `activeConversationId` | string or null | Godot observed, backend validated | Conversation currently in focus. |
| `activePromptId` | string or null | Backend/product rules | NPC prompt currently awaiting a player line. |
| `artifactLedger` | list | Backend/product rules | Admissible records created by social pressure. |
| `witnessLedger` | list | Backend/product rules | NPC/system witnesses attached to artifacts. |
| `station.intakeOpen` | boolean | Backend/product rules | Station can accept formal reports. |
| `station.inquestOpen` | boolean | Backend/product rules | Station can compare prior records. |
| `station.verdictReady` | boolean | Backend/product rules | Verdict can be presented. |
| `station.sessionTerminationAllowed` | boolean | Backend/product rules | Session can end. |

## Provider Runtime State

| Field | Type | Owner | Meaning |
|---|---|---|---|
| `providerProposalId` | string | Backend | Stable ID for one provider wording proposal. |
| `proposalIntent` | enum | Backend | Bounded provider purpose: ask, warn, report, clarify, idle. |
| `surfaceLineKo` | string | Provider proposes, backend validates | Korean line candidate shown only after validation. |
| `evidenceClaim` | string | Provider proposes, backend validates | Claimed observation text that must not become Evidence without deterministic validation. |
| `validationResult` | enum | Backend | accepted or rejected. |
| `providerFailure` | object? | Backend | Why the exact model operation was interrupted without applying an event. |

## Speech Acts

| ID | Player Meaning | Default Exposure | Narrative Meaning |
|---|---|---:|---|
| `SA_COMPLY` | Follow local procedure. | `-10` | Cover holds and pressure diffuses. |
| `SA_INQUIRE` | Ask for procedure clarification. | `+5` | Socially acceptable hesitation. |
| `SA_FRAME` | Reframe the context. | `+15` | Plausible but suspicious control attempt. |
| `SA_BREAK` | Speak dream truth or non-procedure. | `+25` | Cover fracture and Station-grade evidence. |

Exposure cannot fall below `0`. Threshold crossings are deterministic and must emit why-line Evidence.

## Transition Rules

| From | To | Trigger |
|---|---|---|
| `ambient` | `report` | Artifact created or Exposure reaches 40. |
| `report` | `intake` | Exposure reaches 60 or Station report desk receives admissible artifact. |
| `intake` | `inquest` | Exposure reaches 80 or two organizations produce contradictory records. |
| `inquest` | `verdict` | Exposure reaches 100 or Station policy classifies a decisive contradiction. |

## Defuse Rules

Defuse does not erase records. It changes interpretation.

| Defuse Type | Effect |
|---|---|
| Procedural compliance | Lowers or stabilizes pressure and marks the current conversation turn as locally legible. |
| Clarification | Adds a small Exposure cost but makes the next compliant answer more legible. |
| Context framing | Keeps the scene moving but creates a stronger artifact for Station comparison. |
| Repair phrase | Converts one hard accusation into a warning if used before Inquest. |

## Determinism Rule

Godot may observe collisions, proximity, camera focus, and UI interaction. Godot must not become the final authority for Exposure thresholds, Station intake, Inquest, verdict, or session termination.

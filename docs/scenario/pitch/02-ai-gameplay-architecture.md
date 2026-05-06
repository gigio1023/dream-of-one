# Codex CLI Gameplay Architecture

Status: superseded for AI access architecture as of 2026-05-06. The active direction is API proposal-provider wording only with runtime model availability checks and deterministic fallback; Codex CLI-specific invocation below is historical.

## Thesis

Dream of One is an AI game because NPC interaction is generated through Codex CLI. It should not use Codex as an unrestricted storyteller. It should use Codex CLI as a bounded performance worker for NPC society.

Codex CLI may propose:

- NPC question;
- pressure bark;
- report summary;
- witness phrasing;
- soft inquest follow-up;
- local social reaction.

Codex CLI must not decide:

- Exposure thresholds;
- Station intake;
- Inquest opening;
- verdict;
- session termination;
- fallback;
- Evidence validity.

## Runtime Flow

```text
Godot observed scene
  -> ObservationFrame
  -> Backend context builder
  -> Codex CLI worker proposes NpcSocialPressureProposal
  -> Schema validation
  -> Deterministic policy/adjudication
  -> NpcCommandEnvelope or Fallback Path
  -> Godot presentation
  -> Evidence Pack
```

## AI Proposal Shape

| Field | Purpose | Example |
|---|---|---|
| `npcId` | Speaker identity. | `NPC_Store_Clerk` |
| `intent` | Bounded purpose. | `ask_procedure`, `report_mismatch`, `warn`, `clarify` |
| `surfaceLineKo` | Korean authored line candidate. | `수량과 라벨을 같이 말씀해 주세요.` |
| `evidenceClaim` | What the NPC thinks was observed. | `label_missing` |
| `targetCoverTestId` | Cover Test touched by the line. | `CT_STORE_QUEUE_LANGUAGE` |
| `requestedActionType` | Bounded command request. | `Talk`, `Report`, `Observe`, `Idle` |
| `confidence` | Codex worker self-rating for fallback selection. | `0.72` |

## Codex CLI Invocation Shape

The backend should call Codex CLI as a local worker process, not a direct LLM API.

```bash
codex exec --cd <repo-root> --ask-for-approval never --sandbox read-only "<structured NPC prompt>"
```

The prompt must contain:

- compact `ObservationFrame`;
- NPC role card;
- current Cover Test;
- allowed `intent` enum;
- allowed `requestedActionType` enum;
- required JSON-only response schema;
- explicit ban on changing Exposure, intake, Inquest, verdict, or session termination.

The backend must parse stdout as JSON and reject anything else.

## Backend Authority Checks

| Check | Reject If |
|---|---|
| Actor validity | `npcId` is missing, inactive, completed, or already in-flight. |
| Scope validity | Proposal references unavailable zone, law, text surface, or Cover Test. |
| Language validity | Codex line contains forbidden meta exposition, verdict claim, or ungrounded fact. |
| Action validity | Action type outside bounded runtime action set. |
| Evidence validity | Claim is not supported by ObservationFrame, artifact ledger, or context. |
| Authority validity | Proposal attempts to set Exposure, verdict, intake, Inquest, or termination. |

## Why This Is The Game's AI Hook

The player should feel that NPC society adapts to their behavior because Codex is generating the social interaction. The system should still be reviewable after the run.

That means:

- Codex creates surface variety;
- deterministic rules preserve fairness;
- Evidence explains why a run changed;
- bad or unsafe Codex output becomes a visible fallback, not broken gameplay.

## Vertical Slice AI Proof

The first slice must prove:

| Proof | Pass Condition |
|---|---|
| Contextual NPC pressure | Store, Studio, Park, and Station use Codex CLI to generate different pressure lines from the same player speech act. |
| Bounded variation | Two runs produce different phrasing but same deterministic outcome for the same validated state. |
| Fallback safety | Invalid Codex proposal is rejected with a deterministic fallback and Evidence reason. |
| Korean quality | Korean line passes role voice rules and avoids generic AI phrasing. |
| Auditability | Final verdict can reconstruct trigger -> witness -> record -> stage -> outcome. |

## Non-Negotiable Rule

If a Codex-generated line cannot be mapped to a Cover Test, witness, artifact, or harmless ambience, it should not ship.

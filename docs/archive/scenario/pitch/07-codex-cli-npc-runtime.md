# Codex CLI NPC Runtime

Status: superseded for runtime architecture as of 2026-05-06. The active direction is API proposal-provider wording only with runtime model availability checks and deterministic fallback; Codex CLI-specific invocation below is historical.

## Purpose

Dream of One uses Codex CLI for NPC interaction. The game does not need a direct LLM API for the first vertical slice.

The backend calls Codex CLI as a local worker, receives a structured NPC proposal, validates it, and sends only accepted bounded commands to Godot.

## Local Command Baseline

Local availability was confirmed through:

```bash
command -v codex
codex --help
```

The non-interactive path is:

```bash
codex exec --cd <repo-root> --ask-for-approval never --sandbox read-only "<structured NPC prompt>"
```

## Worker Contract

| Layer | Responsibility |
|---|---|
| Godot | Observe world state and display accepted NPC lines/actions. |
| Backend adapter | Build prompt, call `codex exec`, parse JSON, enforce timeout, log raw output. |
| Codex CLI | Generate NPC proposal only. |
| Backend validator | Accept, reject, or fallback based on Schema and product rules. |
| Product rules | Own Exposure, Station intake, Inquest, verdict, termination, and Evidence. |

## Prompt Inputs

The prompt must include:

- NPC role card;
- compact ObservationFrame;
- active Cover Test;
- read text surfaces;
- artifact ledger summary;
- Station state summary;
- allowed intents;
- allowed action types;
- JSON response schema;
- forbidden authority list.

## Required Output

Codex CLI must return JSON only:

```json
{
  "npcId": "NPC_Store_Clerk",
  "intent": "ask_procedure",
  "surfaceLineKo": "수량과 라벨을 같이 말씀해 주세요.",
  "surfaceLineEnIntent": "Ask the player to provide count and label.",
  "evidenceClaim": "label_missing",
  "targetCoverTestId": "CT_STORE_QUEUE_LANGUAGE",
  "requestedActionType": "Talk",
  "confidence": 0.72
}
```

## Rejection Rules

Reject and fallback if Codex:

- emits non-JSON;
- references unknown NPC, law, zone, Cover Test, or artifact;
- claims unsupported observation;
- attempts to change Exposure or Station state;
- outputs verdict, intake, Inquest, or termination decision;
- uses meta exposition or generic suspicion language;
- times out.

## Vertical Slice Proof

The slice is Codex-powered when:

- Store, Studio, Park, and Station each call Codex CLI for at least one NPC interaction;
- invalid Codex output is rejected with a visible fallback;
- two runs show line variation while preserving deterministic outcomes;
- Evidence Pack includes proposal ID, validation result, fallback reason when applicable, and final why-line.

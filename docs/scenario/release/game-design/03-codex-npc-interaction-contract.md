# Codex NPC Interaction Contract

Status: superseded for provider/API shape as of 2026-05-06. The active contract is API proposal-provider wording only: NPC line candidates, Station pressure wording, localized variants, and fallback text variants. Action type, risk tags, Evidence type, reason codes, why-line authority, Exposure, Inquest, Verdict, and Session End remain deterministic backend/runtime authority.

## Purpose

This contract defines how Codex CLI becomes player-facing AI gameplay without letting generated text corrupt deterministic game rules.

## Authority Boundary

| Owner | Owns |
|---|---|
| Codex CLI | Surface NPC wording, pressure phrasing, short diegetic observations, variation within a supplied frame. |
| Backend | Prompt construction, schema validation, fallback selection, Evidence, Exposure, Station intake, Inquest, verdict, session termination. |
| Godot | 3D presentation, controls, UI display, local interaction timing, screenshotable state. |

Codex output is a proposal. It is never authority.

## Proposal Schema

```ts
type CodexNpcProposal = {
  proposalId: string;
  npcId:
    | "NPC_STORE_CLERK"
    | "NPC_STUDIO_PM"
    | "NPC_PARK_WITNESS"
    | "NPC_STATION_OFFICER";
  requestedActionType: "Talk" | "Ask" | "Observe" | "Report" | "Idle";
  targetCoverTestId: string;
  surfaceLineKo: string;
  surfaceLineEnIntent: string;
  observedMismatch: string;
  evidenceClaim: string;
  reasonCodes: string[];
  confidence: number;
};
```

## Prompt Frame

Backend supplies only current, allowed facts.

```text
You are a Dream of One NPC proposal worker.
Return JSON only. You do not own game state.

Role card:
- npcId:
- wants:
- notices:
- reports:
- voice:
- never say:
- allowed pressure move:

Frame:
- activeBeatId:
- activeCoverTestId:
- visibleTextSurfaces:
- recentPlayerSpeechAct:
- recentEvents:
- artifactLedger:
- exposureBand:
- stationState:

Allowed:
- choose one allowed action type
- cite only supplied facts
- write one short Korean diegetic line
- describe one observed mismatch if present

Forbidden:
- changing Exposure
- deciding Station intake, Inquest, verdict, or termination
- inventing laws, witnesses, artifacts, zones, or records
- saying the player is suspicious without naming a mismatch
- explaining model, CLI, schema, or backend internals
```

## Role Cards

| NPC | Wants | Notices | Reports | Voice | Allowed Pressure Move |
|---|---|---|---|---|---|
| Store Clerk | Keep queue labels consistent. | item count, label, queue order, over-explanation. | queue mismatch, receipt confirmation. | clipped, procedural, tired. | Ask for count/label restatement. |
| Studio PM | Keep approval records defensible. | source, owner, reason, missing field. | review artifact, provisional approval. | polished, workplace-cold. | Ask for the missing approval field. |
| Park Witness | Keep public flow ordinary. | pauses, backtracking, route explanation, dream narration. | notice snapshot, witness statement. | casual but recording. | Ask why the player left ordinary route language. |
| Station Officer | Compare records. | contradictions, missing references, repaired explanations. | Station report, Inquest dossier. | formal, narrowing, calm. | Ask one comparison question. |

## Runtime Flow

1. Godot emits an observation or interaction event.
2. Backend builds a bounded prompt from current state.
3. Backend calls `codex exec` in non-interactive mode.
4. Backend parses the final JSON output.
5. Validator rejects malformed JSON, unknown IDs, unsupported action type, invented facts, or authority claims.
6. Accepted proposal becomes a displayed NPC line/action.
7. Rejected proposal becomes deterministic fallback.
8. Evidence records proposal ID, validation result, fallback reason if any, accepted intent, and why-line.
9. Godot displays only diegetic line/action plus deterministic consequence.

## Failure Modes

| Failure | Player-Facing State | Evidence |
|---|---|---|
| Missing `codex` binary | Setup screen blocks AI run and gives install/login instructions. | `CodexPreflightMissingBinary` |
| Not logged in/no access | Setup screen asks player to run login/status. | `CodexPreflightAuthFailed` |
| Timeout | NPC pauses, checks record, then fallback line fires. | `CodexTimeoutFallback` |
| Invalid JSON | NPC uses procedural fallback; backend logs invalid shape. | `CodexInvalidJsonFallback` |
| Unknown ID | Fallback; rejected proposal ID recorded. | `CodexUnknownIdRejected` |
| Authority attempt | Fallback; rejection reason names forbidden field. | `CodexAuthorityRejected` |

## Player Trust Rules

- The player sees consequences, not AI internals.
- The player can always inspect the why-line and Evidence artifact.
- Fallback must feel like institutional procedure, not broken software.
- Repeated Codex failure must preserve deterministic run integrity.
- Store page and setup UI must disclose that local Codex CLI and player-owned access are required.

## Acceptance Tests

| Test | Pass Criteria |
|---|---|
| Variation parity | Same frame, multiple Codex outputs: surface lines vary, deterministic outcome stays identical. |
| Authority rejection | Prompted authority attempt is rejected and fallback appears. |
| Missing fact rejection | Invented witness/law/artifact is rejected. |
| Timeout fallback | Timeout creates playable fallback and Evidence. |
| Korean-first line | `surfaceLineKo` is the displayed source line; English intent does not replace it in Korean mode. |

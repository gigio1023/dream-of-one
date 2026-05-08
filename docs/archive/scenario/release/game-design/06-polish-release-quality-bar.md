# Polish And Release Quality Bar

Status: superseded for AI access/release-copy details as of 2026-05-06. The active release premise is API proposal-provider preflight, runtime model availability checks, and deterministic fallback, not a Codex CLI-required demo.

## Purpose

This bar decides whether the small release feels like a finished indie prologue or an internal prototype.

## Release Identity

Ship as:

`Dream of One: Station Soft Inquest - Codex CLI Demo`

This is a complete technical prologue, not the full game and not a generic AI NPC sandbox.

## First Five Minutes Bar

Within five minutes, a new player must:

- understand that Station authority already exists;
- read a public rule;
- use movement and look controls;
- choose a bounded speech act;
- see NPC or system pressure;
- see an Exposure/Evidence/why-line consequence;
- understand that Codex CLI is required for live NPC pressure.

No lore cold open. No long setup after Codex preflight succeeds. No abstract "AI demo" framing inside gameplay.

## Minimum Polish Surface

| Surface | Minimum Bar |
|---|---|
| Title/setup | clean language selector, Codex disclosure, retryable preflight. |
| HUD | stable layout, readable Exposure, current objective, input prompt. |
| Signs | consistent board design, high contrast, localization-safe size. |
| NPC pressure | short, contextual, names observed mismatch. |
| Evidence UI | shows witness/system, artifact, reason code, delta, repair state. |
| Audio | UI confirmation, pressure cue, record-created cue, end-state cue. |
| Lighting | rule surfaces and exits readable; mood never hides procedure. |
| End card | outcome, decisive records, why-line, restart/quit. |

## Amateur Failure Modes

| Failure | Fix |
|---|---|
| "AI society" promise with one chatbot | Market and implement four bounded examiner interactions. |
| Empty 3D space | Build route, rule boards, light pools, and procedural props before decoration. |
| Pretty but unreadable signs | Treat signs as core mechanics, not set dressing. |
| NPCs explain lore | NPCs pressure procedure and observed mismatches. |
| Consequences feel random | Every state change gets Evidence and why-line. |
| Hidden Codex dependency | Put local Codex requirement in setup and store copy. |
| Fallback pretends to be AI | Label fallback as procedural failure handling in setup/store docs. |
| Ending just stops | End card reconstructs final state from records. |

## Store Page Minimum

Before public itch.io release:

- above-fold note: local Codex CLI and player-owned Codex/OpenAI access required;
- platform/language tags match actual tested builds;
- generative AI disclosure/tagging completed where applicable;
- screenshots show actual gameplay HUD and NPC pressure;
- setup instructions explain Codex preflight and failure states;
- privacy note explains bounded game context goes through the player's local Codex setup;
- no Steam demo page until exported setup proof exists.

## Trailer/GIF Minimum

First trailer or GIF should show actual play, not concept mood:

1. Station rule board.
2. Store NPC pressure.
3. Speech act choice.
4. Evidence/Exposure delta.
5. Station return.
6. Final why-line or outcome edge.

Target length: 90-120 seconds for trailer, shorter looping GIFs for itch sections.

## Go/No-Go Criteria

| Gate | Pass Criteria |
|---|---|
| Complete loop | Blind player finishes Station -> Store -> Studio -> Park -> Station. |
| AI value | Player can identify at least four Codex-generated NPC pressure moments. |
| Determinism | Same records produce same backend outcome despite varied AI wording. |
| Comprehension | 8/10 testers can explain why Exposure changed at least once. |
| Setup | Clean-machine testers reach first AI interaction from player-facing help. |
| Keyboard-only | One full run completed without mouse. |
| Localization | Korean and English critical paths have no missing keys or clipped UI. |
| Visual evidence | Five required screenshots/GIFs show actual gameplay state. |
| Store honesty | External dependency, AI disclosure, platform/language claims, and screenshots are accurate. |

## Deferred Until After Small Release

- broad NPC schedules;
- extra districts;
- voice acting or TTS;
- procedural city simulation;
- Steam demo;
- developer-hosted AI;
- save/load beyond run restart;
- complex inventory;
- combat or chase mechanics.

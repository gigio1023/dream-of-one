# Small Release Game Design Pack

Status: superseded for AI access/release-truth details as of 2026-05-06. Use `docs/direction/03-director-decision-ledger.md` DDR-004 and `docs/direction/06-release-strategy.md` for the active API proposal-provider premise. Codex CLI-specific claims in this pack are historical until rewritten.

This pack is the design source of truth for making `Station Soft Inquest` feel like a finished indie-game prologue, not a Godot prototype or an AI chatbot demo.

## Use This Pack For

- scenario writing;
- beat design;
- API proposal-provider wording boundaries;
- 3D hub composition;
- onboarding, localization, and accessibility;
- polish and release go/no-go decisions.

Use `docs/archive/scenario/release/small-release-team-execution-plan.md` for staffing and implementation order. Use this pack to decide what the team is actually building.

## Core Product Claim

`Dream of One` is a Korean-first 3D social-stealth game where NPCs and Station systems investigate the player. The player does not solve a case. The player tries to remain procedurally legible while every public word can become Evidence.

An API proposal provider may generate bounded NPC pressure wording and surface phrasing when configured and verified. It does not own action choice, facts, risk tags, reason codes, Exposure, Station intake, Inquest, verdict, session termination, or Evidence semantics.

## Reading Order

1. `00-authoring-method.md`
2. `01-small-release-game-design-bible.md`
3. `02-beat-to-runtime-matrix.md`
4. `03-codex-npc-interaction-contract.md`
5. `04-level-and-environment-design.md`
6. `05-onboarding-localization-accessibility.md`
7. `06-polish-release-quality-bar.md`
8. `07-research-source-map.md`

## Non-Negotiable Design Rails

| Rail | Requirement |
|---|---|
| Player role | The player is examined, not deputized as an investigator. |
| Core danger | Text is where danger starts. Signs, barks, speech acts, records, and why-lines matter more than lore dumps. |
| AI role | Provider proposes NPC/Station wording only. Backend validation and deterministic rules remain authority. |
| Scope | One complete 20-30 minute civic ritual: Station, Store, Studio, Park, Station. |
| Failure | Failure creates records and repair pressure; it does not become a dead end. |
| Release bar | Public release only when a blind player can finish a run and explain why Exposure changed. |

## Design Acceptance Question

After one blind run, the player should be able to answer without reading docs:

- What rule did each location test?
- Which NPC or system examined them?
- What record did they create?
- Why did Exposure change?
- Why did Station reach its final state?
- Where did provider-generated NPC pressure wording matter?

If those answers are unclear, the issue is not implementation scope. The issue is game design.

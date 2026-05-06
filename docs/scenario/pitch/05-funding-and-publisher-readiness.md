# Funding And Publisher Readiness

Status: superseded for AI access/release-truth details as of 2026-05-06. Use `docs/direction/03-director-decision-ledger.md` DDR-004, `docs/direction/06-release-strategy.md`, and `plan.md` for the active API proposal-provider premise. Codex CLI-specific pitch language below is historical and not current release truth.

## Pitch Position

Do not pitch Dream of One as a generic "AI NPC game." Pitch it as:

> A compact, authored 3D social-stealth game where Codex CLI performs NPC society and deterministic rules decide the case.

## Pitch Deck Outline

Keep the deck near 12-15 slides.

| Slide | Content |
|---|---|
| 1 | Title, one-line pitch, key art or in-engine screenshot. |
| 2 | Player fantasy: "you are not solving the case; you are becoming one." |
| 3 | Core loop: read rule -> perform cover -> AI pressure -> Evidence -> Station verdict. |
| 4 | Codex architecture: proposal-only Codex worker, deterministic backend authority. |
| 5 | Vertical slice: 10-30 minute `Station Soft Inquest`. |
| 6 | Visual direction: authored small civic hub, free assets, lighting, text surfaces. |
| 7 | Narrative direction: Korean-first institutional horror. |
| 8 | Market/comps: social stealth, procedural pressure, narrative indie audience. |
| 9 | Current proof: Godot slice, backend schema, Evidence, scenario bible. |
| 10 | Team plan: core roles and hiring order. |
| 11 | Production roadmap: prototype, vertical slice, demo, launch. |
| 12 | Budget model: team-months, contractors, Codex worker/backend, QA, marketing, contingency. |
| 13 | Risk controls: AI fallback, deterministic authority, scope cap, playtest gates. |
| 14 | Ask: funding, publishing support, localization/QA/marketing needs. |
| 15 | Contact, build link, trailer, next milestone. |

## Budget Model

Build the ask from team-months, not intuition.

| Category | Include |
|---|---|
| Core development | salaries or contractor rates for engineering, narrative, art, production. |
| Codex worker and backend | Codex CLI execution, prompt fixtures, logging, eval runs, backend hosting for tests/demos. |
| Art/audio/UI contractors | focused polish passes after mechanics are proven. |
| QA and playtest | blind tests, regression sweeps, localization checks. |
| Marketing | trailer, capsule art, Steam page assets, festival submissions. |
| Operations | software, hardware, builds, accounting, legal. |
| Contingency | 15-25% depending on team experience and publisher requirements. |

## Funding Gates

| Gate | Raise / Pitch For | Required Proof |
|---|---|---|
| Concept support | Prototype funding or collaborators. | Scenario bible, playable skeleton, Codex architecture proof. |
| Vertical slice funding | 4-6 month focused production. | Current Godot build, team plan, budget, proof of deterministic Codex safety. |
| Full production funding | Launch budget. | Polished vertical slice, playtest data, pitch video, wishlists or audience signal if public. |

## Small Public Release Gate

Use these release docs as the release-readiness source of truth:

- `docs/scenario/release/small-release-definition.md`
- `docs/scenario/release/small-release-readiness-report.md`
- `docs/scenario/release/small-release-team-execution-plan.md`

The first public release should be a Codex CLI-required technical demo/prologue. It should target itch.io first, with Steam demo considered only after setup, disclosure, and external dependency copy are proven.

The demo must state that players need their own Codex CLI installation, login, and subscription/access. There is no developer-hosted AI worker for the first small release. The demo must prove `Station Soft Inquest` as a complete short AI game: local Codex CLI-backed NPC pressure, deterministic backend Evidence, Korean-first text, keyboard-only playability, setup/failure handling when Codex is missing or invalid, exported build, real store assets, and blind playtest evidence.

## Publisher Readiness Checklist

- A playable build exists.
- The first two minutes show the hook.
- The Codex-driven NPC interaction is visible in-game, not only in docs.
- Budget and timeline are readable.
- Team roles are named even if some are contractor slots.
- Scope excludes expensive features until the loop works.
- Similar games are named by audience and production lesson, not by imitation.
- Risks are acknowledged with mitigation.
- Korean-first localization is framed as a strength and a production requirement.

## External Baseline

- [Rami Ismail](https://ltpf.ramiismail.com/prototypes-and-vertical-slice/) distinguishes prototype proof from vertical slice production proof.
- [FirstLook](https://firstlook.gg/blog/how-to-get-indie-game-published/) emphasizes polished vertical slice, pitch deck, budget/timeline, and playtest validation.
- [Playdigious](https://playdigious.com/wp-content/uploads/2023/06/PlaydigiousOriginals_HowToPitch.pdf) asks for a deck, vertical slice, team, budget, differentiators, and competitors.
- [IndieGameBusiness](https://indiegamebusiness.com/state-of-pitching-in-2025/) warns that publishers increasingly expect strong genre fit, realistic pipelines, and unique story-driven positioning.

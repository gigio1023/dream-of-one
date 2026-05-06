# Director Decision Ledger

This file records director-level decisions. It should not duplicate task-level implementation notes.

## DDR-001: Codex CLI Is a Player Prerequisite

Status: superseded
Date: 2026-04-30
Superseded: 2026-05-06 by DDR-004

Decision:
- Dream of One assumes the player has Codex CLI installed and access to their own subscription. The game does not pay for or bundle LLM API usage.

Current ruling:
- Do not use this as release truth.
- Player-installed Codex CLI is no longer the public prerequisite premise.
- Keep this record only as historical context for why the project originally avoided developer-hosted AI.

Rationale:
- This makes the AI feature realistic for the project budget and clarifies why AI behavior is local/user-provisioned.

Risks:
- Higher install friction.
- Store/demo copy must be explicit.
- Offline/provider-unavailable path needs graceful fallback.

Superseded evidence:
- install/run guide.
- deterministic fallback behavior.
- public copy that does not hide the prerequisite.

## DDR-002: Proposal Providers Generate Text Proposals, Not Verdicts

Status: accepted
Date: 2026-04-30
Updated: 2026-05-06

Decision:
- API proposal providers may generate NPC/Station wording proposals only. Backend/runtime owns action choice, risk tags, Evidence type, reason codes, why-line authority, Exposure, inquest, verdict, and session termination.

Rationale:
- Preserves deterministic product authority while allowing AI variation.

Risks:
- Implementation may accidentally let generated prose imply or control state.

Required evidence:
- proposal schema.
- validation/fallback.
- Evidence why-lines.
- backend fixture parity.

## DDR-003: 3D Requires a Dedicated Value Gate

Status: accepted
Date: 2026-04-30

Decision:
- The project can continue in Godot 3D only if 3D space increases surveillance pressure and legibility.

Rationale:
- 3D costs more than text/2D. It must prove more than visual novelty.

Risks:
- Empty hub feeling.
- asset polish masking weak gameplay.
- camera/input friction.

Required evidence:
- M3 contact sheet.
- playable route.
- text readability at gameplay distance.
- keyboard-only path.

## DDR-004: API Proposal Provider Is the AI Premise

Status: accepted
Date: 2026-05-06

Decision:
- Dream of One uses an API-based proposal provider as the release premise for live AI NPC text.
- Player-installed Codex CLI is not assumed as a release prerequisite.
- The game must check configured provider access and GPT model availability at runtime.
- `gpt-5.4-nano` is preferred only when runtime verification proves it for the configured provider.
- Design, docs, release copy, and tests must not treat any GPT model as available before runtime verification.

Rationale:
- The game needs a provider boundary that can be validated, disclosed, and replaced without moving product authority into generated prose.

Risks:
- Provider packaging is not decided.
- API costs, credentials, privacy copy, rate limits, and platform policy remain release blockers.
- Model availability can change after documentation is written.

Required evidence:
- provider access disclosure.
- runtime model availability preflight.
- proposal schema.
- deterministic validation and fallback Evidence.
- release copy that matches the configured provider mode.

## DDR-005: M1 Technical Pass Is Not Product Closure

Status: accepted
Date: 2026-05-06

Decision:
- M1 technical pass records local backend/Godot/Evidence verification only.
- Product closure still requires council review, player comprehension evidence, live provider/setup decisions, and release-truth review.
- Long-running PR updates must separate technical pass, product blockers, bot feedback, and unresolved release claims.

Rationale:
- The project can pass local protocol checks while still being blocked for public demo truth, player understanding, or live provider availability.

Risks:
- PR summaries may overclaim if they collapse technical evidence and product readiness.
- Review bots may treat stale wording as resolved unless feedback state is tracked explicitly.

Required evidence:
- verification ledger with technical pass and product blockers separated.
- PR bot-feedback ledger with each review item resolved, blocked, or deferred.
- release strategy that does not promise live API access or fixed GPT availability without runtime verification.

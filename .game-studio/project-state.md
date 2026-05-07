# Game Studio Project State

Last updated: 2026-05-07

This file records how Game Studio guidance is applied to Dream of One. It does not replace `.game-harness/`, which remains the current execution harness for M1 handoffs, reviews, evidence, and drift.

## Routing

- **Entry mode**: `direction-carry-in`.
- **Reason**: `docs/direction/` already defines the thesis, pillars, roadmap, council, player targets, release strategy, and role model.
- **Direction authority**: The human owns taste, Direction Lock, stage movement, and public promises.
- **Install decision**: Preserve the existing direction and audit proof gaps instead of starting a new concept slate.

## Selected Profiles

| Profile | Selection | Project alignment |
|---|---|---|
| Engine | `godot` | Active Runtime Path is Godot 4.x with a TypeScript NPC backend. |
| Scope | `solo-indie` primary | Codex acts as a force multiplier, and lean written verdicts replace meetings. |
| Scope overlay | `small-team` role model | Work still names Game Director, Systems, Godot, Narrative, QA, and Producer lanes. |
| Genre | `social-stealth` | NPCs and Station systems watch the player through dialogue, suspicion signals, reports, Exposure, and verdict pressure. |
| Genre overlay | `narrative-ai` | API proposal providers may generate bounded wording only, while deterministic rules own actions and consequences. |
| Review mode | `lean` | Require focused role verdicts at gates, not large process artifacts. |
| Decision mode | `agentic` with human authority | Agents may execute scoped work, but cannot lock direction, move stages, or make public promises. |

## Runtime Carry-In

- **Godot root**: `godot/`.
- **Main scene**: `godot/scenes/main.tscn`.
- **Runtime data**: `godot/data/world_layout.json`.
- **Backend root**: `backend/npc-runtime/`.
- **Runtime Schema**: `backend/npc-runtime/src/godot/runtime-schema.ts`.
- **Evidence output**: `data/evidence/godot/`.

Godot owns scene presentation, player and NPC movement, 3D collision or navigation observations, visual hierarchy, dialogue UI, and player input capture. Backend/runtime owns deterministic validation, conversation memory, suspicion signals, social reports, fallback selection, Exposure thresholds, Station intake, Inquest, verdict, and session termination.

## Current Stage

Dream of One is before a trustworthy vertical slice. The active director-level target is M1 Conversation Protocol Proof.

| Item | Current state |
|---|---|
| M0 Thesis Lock | Mostly established; future director decisions still need ledger entries. |
| M1 Conversation Protocol Proof | Local technical proof passing; product closure pending. |
| M1 goal | Prove NPC prompt -> three choices plus typed-free-input contract -> deterministic suspicion signal -> Evidence/Exposure/report consequence. |
| M1 current handoff | `.game-harness/milestones/M1-implementation-handoff.md`. |
| M1 harness source | `.game-harness/milestones/M1-protocol-proof.md`. |
| Broad vertical slice | Blocked until M1 product closure. |

Current M1 carry-in:

- evidence contract is defined.
- M1 implementation handoff is drafted.
- M1 content/runtime contract is drafted.
- initial council review is completed with conditions.
- dirty worktree scope is recorded.
- required role reviews remain pending in the current stage record.
- Station Soft Inquest smoke is internal authority/Evidence harness evidence, not the target player-facing conversation loop.
- `Same Order` playable smoke now proves Store Clerk prompt -> risky choice -> preset recorded statement -> deterministic suspicion/report -> Station inquest/session end.
- backend tests preserve conversation Evidence fields and prevent same-NPC conversation turn coalescing.

## M1 Proof Target

M1 must prove one NPC conversation with three dialogue choices, optional typed free-input contract if available, one safe/local response, one uncertain/repair response, one risky/weird response, one deterministic suspicion/report consequence, one Evidence why-line, and one Godot-visible result. The current smoke records a preset free-input statement; it does not prove manual text-entry UI.

Required proof:

- backend fixture and check.
- Godot-visible conversation UI.
- Evidence JSON with conversation identity, suspicion signals, why-line, and Exposure/report delta.
- renderer-backed screenshot showing NPC reaction and player-facing consequence. Current non-headless visual capture produces Store conversation PNGs and a contact sheet; human readability review remains pending.
- API proposal-provider preflight, model availability, and fallback record.
- Korean source text with English consequence parity.

## API Migration Decision

Dream of One supersedes the Codex CLI player-prerequisite decision.

- **Accepted path**: Use an API proposal provider for live NPC/Station wording when configured and verified at runtime.
- **Rejected path**: Do not require player-installed Codex CLI as the release prerequisite. Do not let provider prose own gameplay rules.
- **Invocation model**: Backend/runtime performs provider preflight, checks configured model availability, validates structured wording proposals, and falls back deterministically.
- **Model rule**: `gpt-5.4-nano` may be tried as a configured preferred model, but it is not assumed. Runtime must fall back to configured available models such as `gpt-5-nano`.
- **Authority boundary**: Provider output is wording only: NPC line candidates, Station pressure wording, localized variants, and fallback text variants.
- **Deterministic owner**: Backend/runtime owns action choice, risk tag, suspicion signal, Evidence type, reason codes, why-line authority, fallback, Exposure, social reports, Station transitions, verdict, session termination, and Evidence semantics.
- **Failure rule**: Missing key, unavailable model, rate limit, timeout, invalid JSON, unsupported claims, or authority attempts fail closed with deterministic fallback and Evidence.

## Review And Evidence Rules

- Use `docs/framework/substantive-review.md` for role review shape.
- Use `docs/framework/evidence-gates.md` for internal artifact gates.
- Use proof-gate language in user-facing output. Reserve Evidence for concrete internal artifacts and captures.
- Passing scripts are necessary for repository health, but they do not prove game quality.

## Local Artifacts

| Artifact | Purpose |
|---|---|
| `.game-studio/core/` | Project-local copy of Game Studio core guidance, roles, rubrics, schemas, workflows, and templates. |
| `.game-studio/project-state.md` | Current Game Studio routing and project state. |
| `docs/framework/evidence-gates.md` | Project-local internal artifact gate guidance. |
| `docs/framework/substantive-review.md` | Project-local Codex-led game-substance review guidance. |
| `.game-harness/` | Existing execution harness for M1 work. Do not replace it without an explicit migration decision. |

## Open Blockers

- M1 role reviews are still pending in the current stage record.
- M1 has fresh conversation-first Godot/backend proof artifacts, but product closure still needs role review, visual recapture, external comprehension, and provider/export decisions.
- Manual typed free-input UI remains pending if free input stays in the demo promise.
- Live Godot backend bridge remains a follow-up path unless implemented in the same scoped issue.
- Broad vertical-slice implementation remains blocked until M1 product closure, not merely technical proof.

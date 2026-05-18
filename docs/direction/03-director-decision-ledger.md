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
- Dream of One uses direct `openai-codex` as the default proposal provider premise for live AI NPC text.
- Player-installed Codex CLI is not assumed as a release prerequisite.
- The game must check configured provider access and GPT model availability at runtime.
- `gpt-5.4-mini` low reasoning effort is the default `openai-codex` model, but
  live behavior is claimed only when runtime verification proves access and the
  configured request budget.
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
- Product closure still requires council review, player comprehension evidence, live in-game provider/setup decisions, and release-truth review.
- Long-running PR updates must separate technical pass, product blockers, bot feedback, and unresolved release claims.

Rationale:
- The project can pass local protocol checks while still being blocked for public demo truth, player understanding, or live in-game provider availability.

Risks:
- PR summaries may overclaim if they collapse technical evidence and product readiness.
- Review bots may treat stale wording as resolved unless feedback state is tracked explicitly.

Required evidence:
- verification ledger with technical pass and product blockers separated.
- PR bot-feedback ledger with each review item resolved, blocked, or deferred.
- release strategy that does not promise live API access or fixed GPT availability without runtime verification.

## DDR-006: Conversation Choices Are The Primary Player Verb

Status: accepted
Date: 2026-05-06

Decision:
- Dream of One's player-facing loop is conversation-first.
- Default interaction is three diegetic dialogue choices, plus optional free input only where deterministic classification and fallback behavior are proven.
- NPC suspicion begins when conversation history contains local routine mismatch, dream-language leak, memory gap, contradiction, evasion, or over-explanation.
- Suspicion should escalate socially through unease, probing, sharing, report, Station intake, inquest, and verdict.
- The current `SA_COMPLY`/`SA_BREAK` Station Soft Inquest loop remains an internal authority/Evidence harness, not the target player-facing design.

Rationale:
- The previous Cover Test button loop proved deterministic authority but drifted away from the intended game: most interaction should be dialogue, and the player should be exposed by sounding socially wrong.
- Three choices reduce free-chat fatigue while keeping conversation as the core verb.
- Optional free input preserves expressive risk without promising an open-ended chatbot sandbox.

Risks:
- Choices may become obvious safe/risky buttons if wording is too blunt.
- Free input can overpromise if release copy calls it open conversation.
- NPC suspicion may feel arbitrary unless the why-line references the exact conversational mismatch.

Required evidence:
- conversation prompt/choice schema.
- deterministic suspicion signal fixtures.
- Godot UI capture with NPC prompt, three choices, optional free input, NPC reaction, why-line, and report/inquest consequence.
- safe, risky, repair, and report route Evidence Packs.
- external comprehension note proving players understand that NPCs suspect them because of dialogue history.

## DDR-007: Design Spine Is The Development Basis

Status: accepted
Date: 2026-05-14

Decision:
- Dream of One development should use `docs/direction/09-game-design-spine.md`
  as the design basis before planning new gameplay work.
- New NPC, location, conversation, provider, and UI work should be shaped with
  `docs/scenario/content/social-simulation-cards.md` before implementation.
- The project should deepen the game through procedure, pressure, record,
  repair, and Station reconciliation rather than through broad content volume or
  unconstrained AI dialogue.

Rationale:
- The thesis and M1 proof are strong, but development can still drift if the
  team only follows proof tasks.
- A thicker design spine lets agents and humans judge whether work strengthens
  the actual game: pressured cover performance under social and institutional
  record comparison.
- Social simulation should be created through NPC preoccupations, shared
  context, storylet state, and deterministic artifacts, not through an expensive
  or opaque AI society simulation.

Risks:
- Design cards can become paperwork if they do not feed implementation.
- The game may still overfit to the Store `Same Order` cell unless the content
  ladder is reused for Studio, Park, and Station.
- LLM/provider work may be overvalued unless deterministic authority remains
  the design boundary.

Required evidence:
- Same Order design cell implemented or explicitly cut down using the design
  spine.
- New storylets name location procedure, examiner NPC, player action, signal,
  artifact, repair window, and future Station consequence.
- Comprehension notes show players understand cover performance, not
  investigation fantasy.
- Provider prompts use NPC role, preoccupation, local procedure, recent
  records, drama act, deterministic signal state, and forbidden authority.

## DDR-008: Same Order Is The Current Team Prototype

Status: accepted
Date: 2026-05-14

Decision:
- The current team-operable scope is the Same Order M1 prototype, not broad
  prologue production.
- Team work should follow `docs/direction/10-team-operating-brief.md`,
  `docs/scenario/content/same-order-storylet-packet.md`, and
  `.game-harness/milestones/M1-same-order-four-week-prototype-plan.md`.
- M2 content expansion, playable Studio/Park work, public demo copy, live AI
  claims, and vertical slice language remain blocked until the Same Order proof
  passes product review and player comprehension.

Rationale:
- Parallel Game Studio council review found that the direction is strong enough
  for a narrow planning team but not yet enough for broad production.
- The fastest way to make the design operational is to complete one Store to
  Station design cell with readable proof, not to add more world content.

Risks:
- The team may treat the four-week plan as a release schedule instead of a proof
  budget.
- Free-input and provider decisions may expand scope unless cut rules are used.
- Art/audio/UX work may drift into mood polish unless tied to first-read and
  comprehension proof.

Required evidence:
- Week 1 recorded-statement or cut decision.
- readable Store consequence capture.
- visible report handoff and Station reconciliation prompt.
- external comprehension notes.
- provider/fallback decision and setup truth.
- M1/M2 go/no-go review.

## DDR-009: Simulator Benchmarks Are The Planning Scaffold

Status: accepted
Date: 2026-05-14

Decision:
- Dream of One should use simulator benchmark research as the next planning
  scaffold.
- The active benchmark method is recorded in
  `docs/direction/11-simulator-benchmark-adoption-brief.md`,
  `docs/direction/12-simulator-reference-map.md`, and
  `docs/research/simulator-benchmarks/2026-05-14/`.
- Same Order should first prove a mundane Store-to-Station procedure simulator:
  normal procedure, player line, clerk comparison, visible record,
  exact Station citation, and deterministic outcome.
- Dream fiction, broad society simulation, and OpenAI/provider wording should be
  layered only after that cause chain is readable.

Rationale:
- The creator does not need to judge a blank-page game design document from
  taste alone.
- Benchmarking proven simulator grammar makes design review concrete: each
  feature must name player job, judgment cues, watcher, record,
  repair cost, formal citation, and proof.
- This keeps the project away from an unbounded AI chat demo while preserving
  the intended fantasy of being investigated through speech.

Risks:
- Reference games can confuse direction if treated as genre templates rather
  than pattern sources.
- Procedure can become dry if dream tone and social pressure are never layered
  back in.
- LLM/provider novelty can still distract from simulator readability.

Required evidence:
- Store procedure guide screenshot or capture.
- visible receipt, correction slip, report, or dossier artifact.
- Station prompt citing the exact Store record.
- backend Evidence JSON with captured line, watcher, mismatch code, and route.
- provider-off fallback parity for the same route outcomes.
- fresh-player or proxy comprehension note.

## DDR-010: Same Order M1 Uses Fallback-Only Provider Truth

Status: accepted
Date: 2026-05-17

Decision:
- The current Same Order M1 product proof is deterministic fallback-only.
- Provider-shaped backend contracts, scheduling, dispatch packets, backend live
  `openai-codex` probes, and the proof-only NPC-to-NPC Godot
  `PlayableSession` route dispatch smoke remain valid internal evidence for the
  future live provider boundary.
- Live in-game provider behavior is not part of the current demo claim. One
  actual route now sends Store Clerk and Waiting Customer `PlayableSession`
  route-context jobs through the live backend and proves fallback parity, but
  the running HUD/Evidence product state remains `fallback_only_m1`.
- `gpt-5.4-mini` low reasoning effort is the default configured Codex model,
  and backend plus proof-only Godot route verification now pass. It still must
  not be claimed as a player-visible Godot product feature until the running
  scene deliberately exposes that mode and records usage in playable Evidence.

Rationale:
- The current work proves the important authority rule: generated wording must
  not own records, risk, Exposure, Evidence, inquest, verdict, or session end.
- The current Ubuntu ARM machine has a per-device ignored Codex auth profile,
  and backend live access is proven. This still does not move the Godot product
  truth out of fallback-only mode.
- A fallback-only M1 keeps the Store/Station cell honest while the game proves
  conversation, records, role actions, and Station citation.

Risks:
- Public copy may sound less novel without live AI wording.
- Later live-provider work can still distract from readable procedure proof.
- In-game UI still needs to show the selected provider/fallback state before a
  tester-facing build.

Required evidence:
- `.game-harness/provider/same-order-provider-mode-decision-2026-05-17.md`.
- `.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md`.
- budgeted backend live smoke, tiny social probe, and NPC-to-NPC Godot
  PlayableSession route dispatch smoke pass with usage accounting.
- provider-shaped backend tests keep rejecting forbidden authority fields.
- live role-voice policy separates NPC speech from player choices and rejects
  Waiting Customer player-blame wording before player-visible live wording is
  considered.
- future player-visible live provider claims require explicit HUD/Evidence mode
  proof, not only proof-only dispatch evidence.

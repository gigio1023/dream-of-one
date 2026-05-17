# M1 Game Improvement Council Review

Date: 2026-05-14
Stage: M1 Protocol Proof
Review mode: lean Game Studio council
Status: improvement execution ready; product closure not ready

## Review Input

Checked artifacts:

- `.game-studio/project-state.md`
- `.game-harness/current-stage.md`
- `.game-harness/verification-ledger.md`
- `.game-harness/player-comprehension-gate.md`
- `.game-harness/milestones/M1-protocol-proof.md`
- `project.md`
- `plan.md`
- `docs/design/game-design.md`
- `docs/direction/README.md`
- `godot/project.godot`
- `godot/scenes/main.tscn`
- `godot/data/world_layout.json`
- `godot/scripts/runtime/playable_session.gd`
- `godot/scripts/ui/social_stealth_hud.gd`
- `godot/tools/playable_slice_smoke.gd`
- `data/evidence/godot/visual-capture/contact-sheet.png`

## Verdict

| Gate | Verdict | Reason |
|---|---|---|
| M1 product closure | `NOT_READY` | Core technical proof exists, but manual player authorship, human readability, external comprehension, live authority/provider truth, and export/setup proof remain unresolved. |
| M2 content expansion | `NOT_READY` | Expanding content before comprehension and authority decisions would hide the central game risk. |
| Scoped game improvement execution | `READY_WITH_CONCERNS` | The next improvements are clear and bounded if they target player understanding and consequence clarity, not process polish. |

Strictest current call:

- Continue M1 improvement work.
- Do not claim product closure.
- Do not begin broad M2 content expansion.

## Improvement Definition

A change counts as a game improvement only when it makes the playable experience
stronger for the player, not merely more documented or easier for agents.

For Dream of One M1, an improvement must strengthen at least one of these:

1. The player understands they are being investigated by NPC/Station systems.
2. The player can deliberately choose safe, repair, risky, or recorded-statement speech.
3. The game visibly connects a player utterance to suspicion, report, Evidence, Exposure, inquest, or session end.
4. Replay or repair produces a meaningfully different outcome.
5. Korean-first text preserves consequence parity in English.
6. Provider or fallback status is truthful and cannot imply open-ended chat.
7. Deterministic authority remains inspectable without making the UI feel like a debug tool.

The following do not count by themselves:

- More internal Evidence JSON without a player-visible consequence.
- More screenshots without human readability or comprehension review.
- More docs that do not change the next playable proof.
- More content before the Same Order loop is manually playable and understood.
- Provider prose that sounds better but can obscure deterministic authority.

## Role Findings

### Game Director

Verdict: `CONCERNS`

The thesis is strong: the player is not solving a mystery; they are being judged
through ordinary speech. The current Same Order proof is the right micro-loop.
The risk is that the game still feels like a technical demonstration unless the
typed recorded-speech route is proven in a fresh Godot run and external notes.

Required next proof:

- Fresh proof of player-authored typed recorded speech, with the fixed fallback kept internal.
- A visible causal chain from utterance to NPC suspicion to Station pressure.
- External comprehension notes showing the player does not invert the role into "I am the investigator."

### Narrative Director

Verdict: `CONCERNS`

The Store Clerk prompt is a good playable storylet because "same order" creates
local memory pressure immediately. The unsafe lines are legible, but the current
typed recorded speech must now prove that the player's own text can become
Evidence.

Required next proof:

- Player-entered typed recorded speech with clear provenance.
- Korean-first review of safe, repair, risky, and recorded-statement wording.
- English parity check that preserves the same consequence, not just the same rough meaning.

### Systems Designer

Verdict: `CONCERNS`

Route contrast is real: clean cover, repair recovery, soft report, and inquest
are distinct deterministic outcomes. The system still needs product-level
clarity around live backend authority and provider/fallback state before public
or demo claims.

Required next proof:

- Keep route-proof validation passing after manual input changes.
- Decide whether M1/M2 requires live backend authority or an explicit fallback-only mode.
- Show provider/fallback status in player-facing terms without letting provider output own rules.

### Godot Runtime And UX

Verdict: `NOT_READY` for product closure; `READY_WITH_CONCERNS` for scoped improvement

The HUD and visual capture now show the conversation path, but the UI still
leans toward proof instrumentation. The game needs a more playable input moment,
stronger NPC/Station reaction feedback, and a readability pass judged by a human
or tester, not only by smoke scripts.

Required next proof:

- Manual typed-statement UI or a deliberate free-input cut.
- Contact sheet or capture after the UI change.
- Human readability notes for prompt, choices, why-line, Evidence count, and end state.

### QA And Producer

Verdict: `NOT_READY` for stage advancement

The current state is good enough to continue focused M1 improvement. It is not
good enough for M2 content expansion or demo framing.

Required next proof:

- External comprehension session using `.game-harness/player-comprehension-gate.md`.
- Export/setup proof before tester-facing demo claims.
- Updated verification ledger after each proof run.

## Required Next Actions

1. Execute the M1 game improvement program in `.game-harness/milestones/M1-game-improvement-program.md`.
2. Start with manual recorded-statement UI or cut the free-input promise.
3. Preserve route contrast and Evidence validation after every playable change.
4. Run human readability and external comprehension before any M2 expansion.
5. Record a live-authority or fallback-only product decision before public demo claims.

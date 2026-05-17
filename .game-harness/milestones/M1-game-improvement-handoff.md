# M1 Game Improvement Handoff

Status: ready for issue split
Date: 2026-05-14
Source program: `.game-harness/milestones/M1-game-improvement-program.md`

## Entry Check

- Entry mode: `direction-carry-in`.
- Active stage: M1 Protocol Proof.
- Direction source: `docs/direction/`, `project.md`, `plan.md`.
- Current proof target: Same Order conversation loop.
- Current verdict: technical conditional pass; product closure open.
- Stage movement authority: human only.

## Execution Rule

Work must improve the playable experience. Do not start broad content expansion
until M1 product closure passes.

Every package must preserve:

- player as investigated subject;
- speech as the place where danger starts;
- deterministic authority over rules and consequences;
- Korean-first consequence parity;
- valid Evidence Pack semantics.

## Work Packages

### GI-01 Manual Recorded Statement

Owner role: Godot Runtime/UX plus Systems

Goal:

- Add manual recorded-statement input, or record a deliberate cut from the demo
  promise.

Experience intent:

- The player should feel that their own words can be captured and used as
  Evidence, not that a smoke test pressed a hidden route.

Files in scope:

- `godot/scenes/ui/social_stealth_hud.tscn`
- `godot/scripts/ui/social_stealth_hud.gd`
- `godot/scripts/runtime/playable_session.gd`
- `godot/tools/playable_slice_smoke.gd`
- backend schema/tests only if Evidence shape changes
- `.game-harness/verification-ledger.md`

Files out of scope:

- multi-location content
- new NPCs
- release/store copy
- provider prose expansion

Required proof:

- entered or deliberately selected statement is visible to the player.
- Evidence event records displayed player line or hash.
- Same Order route proofs still validate.
- UI does not imply open-ended chat.

Verification:

```bash
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
npm run check --prefix backend/npc-runtime
```

Manual review:

- player can tell that typed speech is the tester-facing recorded-speech path.
- why-line explains why the statement creates risk.

Handoff path:

- `.game-harness/verification-ledger.md`
- `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`

### GI-02 Consequence Readability

Owner role: Godot UX plus Narrative Director

Goal:

- Make prompt, selected or entered line, NPC reaction, why-line, pressure, and
  end state readable as one causal chain.

Experience intent:

- The player should understand "I said X, the clerk noticed Y, the Station did Z."

Files in scope:

- `godot/scripts/ui/social_stealth_hud.gd`
- `godot/scenes/ui/social_stealth_hud.tscn`
- `godot/scripts/runtime/playable_session.gd`
- `godot/scripts/localization/localization_manager.gd` if copy keys move
- `godot/tools/visual_capture.gd`
- `.game-harness/verification-ledger.md`

Files out of scope:

- threshold rebalance unless readability exposes a systems bug.
- new scenario branches.

Required proof:

- renderer-backed capture or contact sheet after the pass.
- human readability note for Korean default path.
- English parity spot check.

Verification:

```bash
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

Manual review:

- no critical overlap or unreadable text.
- visible consequence does not feel like debug-only instrumentation.

Handoff path:

- `data/evidence/godot/visual-capture/contact-sheet.png`
- `.game-harness/verification-ledger.md`

### GI-03 NPC And Station Investigation Feedback

Owner role: Godot World plus Game Director

Goal:

- Strengthen in-world feedback that the NPC society and Station are observing
  the player.

Experience intent:

- Investigation pressure should be visible in the scene, not only in the HUD.

Files in scope:

- `godot/data/world_layout.json`
- `godot/scenes/actors/npc_placeholder.tscn`
- `godot/scripts/actors/npc_placeholder.gd`
- `godot/scripts/world/world_generator.gd`
- `godot/scripts/runtime/playable_session.gd`
- `godot/tools/visual_capture.gd`

Files out of scope:

- final art pass.
- full animation system.
- new level.

Required proof:

- capture shows Store Clerk reaction or Station/inquest state change.
- player-facing framing remains "you are being investigated."

Verification:

```bash
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

Manual review:

- reaction cue is readable at current camera distance.
- cue does not require reading backend logs.

Handoff path:

- `data/evidence/godot/screenshots/`
- `.game-harness/verification-ledger.md`

### GI-04 External Comprehension Dry Run

Owner role: QA/Producer

Goal:

- Run a dry run or fresh-player comprehension session before content expansion.

Experience intent:

- Confirm the core loop communicates the intended role and consequence.

Files in scope:

- `.game-harness/player-comprehension-gate.md`
- `.game-harness/verification-ledger.md`
- `docs/development/harness/player-comprehension-gate.md` if the procedure needs tightening

Files out of scope:

- gameplay code unless the test finds a blocker.

Required proof:

- tester notes say whether the player understood investigation, speech danger,
  Evidence, consequence, and role.
- fail results become product blockers, not release caveats.

Verification:

- manual session notes.
- optional capture from the tested build.

Handoff path:

- `.game-harness/verification-ledger.md`
- `.game-harness/review-log.md`

### GI-05 Live Authority Or Fallback-Only Decision

Owner role: Systems plus Producer

Goal:

- Decide and prove whether near-term demo authority is live backend/provider or
  explicitly fallback-only.

Experience intent:

- The player should never be promised live AI behavior that the build cannot
  truthfully provide.

Files in scope:

- `godot/scripts/runtime/backend_bridge.gd`
- `godot/tools/live_backend_bridge_smoke.gd`
- `backend/npc-runtime/src/**`
- provider integration tests
- HUD/provider status copy only after the decision
- `.game-harness/verification-ledger.md`

Files out of scope:

- new generated content.
- public copy before the decision is proven.

Required proof:

- selected authority mode is visible or documented for the build.
- provider failures fall back deterministically.
- provider output cannot decide rules or consequences.

Verification:

```bash
godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
npm run check --prefix backend/npc-runtime
```

Manual review:

- public/demo language remains truthful for the selected mode.

Handoff path:

- `.game-harness/verification-ledger.md`
- `.game-harness/drift-log.md` if the authority decision changes scope.

### GI-06 Export And Setup Proof

Owner role: Release Producer plus Godot Runtime

Goal:

- Prove a tester-facing build can launch outside the editor and preserve the
  chosen authority/fallback behavior.

Experience intent:

- External comprehension should not depend on the developer editor environment.

Files in scope:

- Godot export preset or local export notes
- provider/fallback setup notes
- `data/evidence/godot/` output path review
- `.game-harness/verification-ledger.md`

Files out of scope:

- store launch.
- Steam setup.
- final trailer or marketing assets.

Required proof:

- exported build launch note.
- Evidence output path works or a blocker is recorded.
- provider/fallback state is clear at startup.

Verification:

- Godot export/run command for selected platform.
- manual launch note.

Handoff path:

- `.game-harness/verification-ledger.md`

## File Ownership And Parallelism

Safe parallel lanes:

- GI-03 can run in parallel with GI-04 if no code review blocker is active.
- GI-05 product decision can start in parallel with GI-01 if it does not edit HUD or playable session files.

Do not parallelize:

- GI-01 and GI-02, because both touch HUD and session UI.
- GI-02 and GI-03 visual capture updates without agreeing on capture expectations.
- GI-05 UI copy with GI-01/GI-02 unless ownership is explicitly split.

## Completion Handoff

Each package handoff must record:

- files changed;
- player experience strengthened;
- required proof run or blocked;
- internal evidence artifacts updated;
- residual game risk;
- whether M1 product closure moved closer, stayed blocked, or regressed.

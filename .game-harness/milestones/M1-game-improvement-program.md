# M1 Game Improvement Program

Status: ready for scoped execution
Date: 2026-05-14
Current stage: M1 Protocol Proof
Reducer verdict: `M1_CONDITIONAL`

## Product Hypothesis

Dream of One improves as a game when the player can feel and understand that
ordinary speech is being used against them by NPC and Station systems.

The next improvement work must make the Same Order loop more playable and more
comprehensible. It must not merely add framework artifacts, internal logs, or
technical confidence.

## Improvement Definition

A change counts as an M1 game improvement only if it strengthens one or more
player-facing proof points:

- The player understands they are being investigated, not investigating.
- The player can intentionally answer through safe, repair, risky, or recorded-statement speech.
- The game visibly connects the player's speech to suspicion, report pressure, Evidence, Exposure, inquest, or session end.
- A repair or replay path produces a meaningfully different outcome.
- Korean-first wording and English parity preserve the same consequence.
- Provider/fallback status is truthful and does not imply open-ended chat.
- Deterministic authority remains inspectable without making the player-facing UI feel like a debug console.

Non-improvements:

- Additional docs without a resulting proof target.
- Additional screenshots without human readability or comprehension review.
- More content before M1 player comprehension passes.
- Hidden Evidence data that does not change player-facing consequence or review confidence.
- Provider-generated prose that makes the game sound richer while blurring rule authority.

## Current Proof Checked

Existing proof:

- Backend checks and integration tests pass according to `.game-harness/verification-ledger.md`.
- Godot shell/runtime/playable Evidence Packs validate against the backend schema.
- `Same Order` internally proves clean cover, repair recovery, soft report, and inquest routes.
- Renderer-backed Store conversation screenshots and contact sheet exist.
- HUD exposes prompt, three choices, recorded-statement label, suspicion/report pressure, why-line, Evidence count, and deterministic end controls.

Missing proof:

- Manual typed free-input UI if free input remains in the demo promise.
- Human readability review of the current capture.
- External player comprehension.
- Live backend/provider authority or explicit fallback-only product decision.
- Exported build/setup and provider UX proof.

## Smallest Useful Proof

The next useful proof is not more content. It is one manually playable Same
Order loop where:

1. The player starts at the Store conversation.
2. The player chooses or enters speech.
3. The NPC visibly reacts as a local observer.
4. The UI shows a readable causal chain from speech to suspicion/report/Evidence.
5. The run can end in clean cover, repair recovery, soft report, or inquest.
6. A tester can explain why the result happened without being taught the design intent.

## Required Artifacts

| Artifact | Purpose |
|---|---|
| Godot route run or capture | Prove the playable loop, not just script logic. |
| Valid playable Evidence Pack | Preserve deterministic authority and route-proof validation. |
| Human readability note | Judge whether the current screen explains prompt, choices, why-line, and consequence. |
| Player comprehension note | Judge whether a fresh player understands they are being investigated. |
| Provider/fallback decision note | Prevent public or demo copy from overstating live AI behavior. |
| Verification ledger update | Keep proof trail current after each improvement package. |

## Priority Work Packages

### GI-01 Typed Recorded Speech

Goal: Prove player-entered typed speech is the tester-facing recorded-speech
path for Same Order, with the fixed fallback kept internal only.

Why this improves the game:

- It restores player authorship to the moment where speech becomes risky.
- It makes "your words become Evidence" playable instead of simulated.

Exit proof:

- A player-entered statement or accepted cut decision is visible in the Godot run.
- Evidence records preserve displayed line or free-input hash.
- Same Order route validation still passes.

### GI-02 Consequence Readability

Goal: Make the cause chain from utterance to NPC suspicion to Station pressure
readable without debug interpretation.

Why this improves the game:

- The player should understand what they did wrong, what the NPC noticed, and
  what the Station will do with it.

Exit proof:

- Capture shows prompt, selected or entered line, NPC reaction, why-line,
  pressure change, and end state.
- Human readability note records no critical ambiguity.

### GI-03 NPC And Station Investigation Feedback

Goal: Strengthen in-world feedback that NPCs and Station systems are watching
the player.

Why this improves the game:

- The investigation premise should be felt in the world, not only in HUD text.

Exit proof:

- Store Clerk reaction, report pressure, and Station/inquest state are visible
  in capture or walkthrough notes.
- The player-facing route still does not frame the player as an investigator.

### GI-04 External Comprehension Dry Run

Goal: Run the comprehension gate with a small fresh-player sample or proxy dry
run before expanding content.

Why this improves the game:

- It checks whether the core idea survives outside the author's head.

Exit proof:

- Notes follow `.game-harness/player-comprehension-gate.md`.
- Result records whether testers understood investigation, speech danger,
  Evidence, and consequence.

### GI-05 Live Authority Or Fallback-Only Decision

Goal: Decide whether the near-term demo requires live Godot-to-backend/provider
authority or ships the M1/M2 proof as explicitly fallback-only.

Why this improves the game:

- It prevents a misleading AI promise and keeps deterministic gameplay
  authority clear.

Exit proof:

- Decision note records selected mode.
- UI or setup text communicates provider/fallback state truthfully.
- Verification ledger names the checked mode.

### GI-06 Export And Setup Proof

Goal: Prove the tester-facing build can launch outside the editor and preserve
Evidence/provider/fallback behavior.

Why this improves the game:

- External comprehension needs a build path that does not depend on local editor
  context.

Exit proof:

- Exported build run note.
- Evidence output path and provider/fallback failure behavior are recorded.
- Public/demo copy remains blocked until this proof exists.

## Recommended Sequence

1. GI-01 Manual Recorded Statement.
2. GI-02 Consequence Readability.
3. GI-03 NPC And Station Investigation Feedback.
4. GI-04 External Comprehension Dry Run.
5. GI-05 Live Authority Or Fallback-Only Decision.
6. GI-06 Export And Setup Proof.

GI-05 can start earlier as a product decision if it does not touch GI-01/GI-02
files. GI-06 should not be used to bypass the comprehension gate.

## Cut Candidates

If M1 remains too large:

- Cut manual typed input from the immediate demo promise and keep only three
  authored choices plus a clearly labeled recorded-statement button.
- Cut live provider wording from M1 and mark the demo mode fallback-only.
- Cut multi-location expansion until the Store Same Order loop passes comprehension.

Do not cut:

- Player role as investigated subject.
- Text as the place where danger starts.
- Deterministic ownership of suspicion, Evidence, Exposure, report, inquest,
  verdict, and session end.
- Korean-first consequence parity.

## Typed Input Proof

Manual text input is now the intended tester-facing route:

- three authored choices plus HUD typed recorded speech;
- active UI copy points to typed input, not the internal fixed fallback;
- smoke/capture scripts target the typed inquest route when Godot is available;
- comprehension notes must confirm players understand typed speech becomes a Store record.

## Gate Reviewers

Required reviewers for each package:

- Game Director: role, promise, and stage discipline.
- Narrative Director: Korean-first wording, storylet pressure, generated-text boundary.
- Systems Designer: route contrast, deterministic authority, thresholds, Evidence.
- Godot Runtime/UX: scene, input, HUD readability, capture.
- QA/Producer: proof trail, comprehension, export/setup, go/no-go.

## Exit Decision

The improvement program can move from `M1_CONDITIONAL` to `M1_PRODUCT_GO` only
when:

- manual recorded-statement path or cut decision is resolved;
- role review has no critical fail;
- human readability and external comprehension pass;
- provider/live-authority decision is recorded;
- verification ledger has fresh proof for the selected path.

Until then, the allowed work is focused M1 improvement only.

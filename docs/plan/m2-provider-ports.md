# M2 — LLM-Native Agent Loop

**Status: active.** Rewritten 2026-07-10 after the owner interview moved
judgment authority to the model (see
[`../vision/design-pillars.md`](../vision/design-pillars.md)).

## Goal

The model becomes the NPCs' actual mind in the live build: it writes the
dialogue, judges how suspicious each answer is (and says why), decides the
next world action, and its record-writing visibly changes how another NPC
behaves. Deterministic code keeps validity only — sight/context separation,
tool validation, bounded deltas, and a session that always ends.

`Same Order` remains a regression scenario, not a dialogue tree. Fixed lines,
tool sequences, and route outcomes exist only in the scripted test adapter
and generated fixtures.

## Owner-approved 2D restoration contract

Approved 2026-07-10 after reviewing the current build against the last known
good 2D implementation. This is a presentation and interaction restoration
inside M2, not a return to M1's authored gameplay policy. The current
provider-backed judgment, two-sided conversation memory, ambient NPC reaction,
record authority, and honest-ending behavior remain authoritative.

### Outcome

Restore the complete asset-backed Store and Station play loop from commit
`83983ebd` around the current LLM social-simulation behavior, with a native,
responsive HUD and selectable output sizes from 720p through 4K.

The visual references are:

- [`../assets/readme-same-order-conversation.png`](../assets/readme-same-order-conversation.png)
  for the Store, characters, props, conversation composition, and pressure
  presentation.
- [`../assets/readme-same-order-hard-inquest.png`](../assets/readme-same-order-hard-inquest.png)
  for the Station transition, intake scene, citation beat, and ending panel.

When those references conflict with current behavior, current behavior wins.
Adapt the restored presentation as little as necessary; do not resurrect
hard-coded dialogue policy, projected routes, or fixed social reaction chains.

### Player-visible scope

- Restore the full Store and Station loop: top-down movement, collision,
  character animation, focus and interaction, readable room dressing, record
  props, conversation, NPC reactions, inspection, transition, and ending.
- Use the committed Kenney 2D and project greybox assets already present in the
  repository before considering new art. New paid or redistribution-restricted
  art requires a separate owner decision.
- Replace the black-field/debug-circle presentation with the asset-backed world
  in normal play. Diagnostic rings, permanent influence lines, and raw labels
  belong to an explicit debug view only.
- Preserve keyboard play and the existing Session API boundary. Suggestions
  and free input continue through the same model judgment path.

### Resolution and composition contract

The world and HUD use separate scale domains:

- The pixel-art world renders at a fixed logical **640×360** through a
  `SubViewport`, nearest-neighbor filtered and integer-scaled. Supported output
  presets are 1280×720 (2×), 1920×1080 (3×, default), 2560×1440 (4×), and
  3840×2160 (6×).
- The minimum supported window is 1280×720. Resizing between presets may
  letterbox the world; it must not introduce fractional pixel distortion.
- The HUD is a native-resolution `Control` hierarchy outside the world
  viewport. Anchors and containers, not manually scaled world coordinates,
  determine its layout. Text and controls therefore remain readable at 4K
  instead of becoming a six-times-scaled 640×360 overlay.
- Generated conversation text grows its panel to a defined maximum height,
  then scrolls internally. It must not displace response controls off-screen.
- Output-size selection is exposed in the game UI and persisted locally; the
  default remains 1920×1080. Fullscreen/window mode stays independent from the
  selected output preset.

### Information policy

Normal play always exposes the facts needed for social reading:

- NPC identity and role;
- the NPC's current speech bubble;
- a short reaction marker;
- the NPC's current social action.

The immediate influence line and action source appear briefly when an event
lands, then clear. Detailed judgment reasons, longer relationship or memory
state, cited record contents, and the full causality chain live in the inspect
view. Debug mode may add collision, sensing, influence, ids, and raw state, but
none of those overlays may be required to understand normal play.

### Execution order

1. **Recover the render baseline.** Compare current runtime output with
   `83983ebd`, locate the first asset/camera/atlas/import regression, and make
   the Store playable with visible tiles, props, actors, and focus behavior.
2. **Separate world and HUD scaling.** Introduce the 640×360 world viewport,
   native responsive HUD, output presets, and capped scrolling conversation
   layout without changing Session API semantics.
3. **Restore the full social presentation.** Bring the Station, record props,
   ambient reactions, normal/inspect/debug information policy, transitions,
   and honest ending presentation onto the restored asset-backed path.
4. **Prove the actual game.** Exercise every output preset, then play live
   Qwen and OpenAI sessions that include generated dialogue, a typed answer,
   model judgment, a record write, and a second NPC's visible reaction.

Each item is a coherent playable slice: run its narrow proof, commit it, and
push it before moving to the next item.

### Restoration acceptance

- [ ] Normal Store and Station play shows the intended tiles, characters, and
      props; no black background or debug-circle-only presentation remains.
- [ ] Every current gameplay state has an asset-backed player-facing
      presentation, including conversation, records, ambient reaction,
      Station intake, and ending.
- [ ] 720p, 1080p, 1440p, and 4K presets show undistorted world pixels and a
      readable, unclipped HUD.
- [ ] Live Qwen and OpenAI sessions each show generated dialogue, typed-input
      judgment, record creation, and another NPC's visible reaction without a
      fallback response.
- [ ] A conversation of at least three turns retains the NPC's own prior lines;
      long generated text grows to its cap and then scrolls.
- [ ] Normal, inspect, and debug views follow the information policy above.
- [ ] Backend checks and Godot asset, scene-load, localization, and route
      smokes pass in fixture and scripted modes.

### Explicit non-goals

No 3D return, engine replacement, new location, broad art-pack purchase,
additional authored route, or expansion of deterministic judgment authority.
This work does not redesign the game's direction; it restores the proven 2D
presentation around that direction.

## Player-visible deliverables

1. **A clerk that judges.** The player answers with a generated suggestion or
   a short typed phrase; the live model reads the content, moves suspicion,
   and the reason it gives appears on the HUD as the why-line. Rules only
   clamp the per-turn delta, keep context visibility honest, and guarantee
   the session ends. Provider failure shows the fallback label and switches
   to the deterministic classifier.
2. **A record that another NPC reads.** A model-proposed `write_record`
   actually lands in the ledger, and a second NPC (manager or waiting
   customer) reads it during the ambient loop and visibly changes behavior
   (speech bubble, reaction marker). The game client calls the ambient
   decision endpoint during real play — not only in tests.
3. **An NPC that remembers its own words.** The conversation history sent to
   the model contains both sides of the exchange, so an NPC cannot
   contradict what it just said (owner-set unacceptable failure #3).
4. **Honest endings.** The outcome panel cites only ledger events that exist
   and never narrates a consequence that did not happen.

## Technical deliverables

- `NpcProposalPort` gains `judgeConversationTurn`; the deterministic signal
  classifier becomes its fallback implementation and stops being the product
  default.
- Session state keeps a two-sided dialogue history and feeds it to
  conversation, judgment, and agent-step requests.
- The runtime never leaks a projected ending to the model; NPC goals carry
  the NPC's own perceived state (its suspicion, its pressure), not a route
  hint.
- The ambient decision path covers the ambient NPCs (waiting customer,
  manager) and is wired into the Godot client's play loop.
- Provider runtime budgets fit judgment-grade calls (timeout and token
  ceilings raised from the M1 values).
- Storylets carry scene facts, actor goals, ending thresholds, and outcome
  presentation only. Classification rules do not live in storylet data.

## Acceptance

- [x] One opt-in live provider smoke succeeds (conversation + judgment) with
      the checked-in default profile. *Verified 2026-07-10 with
      `openai/gpt-5.4-mini`: both calls used live transport with no fallback
      (706 conversation tokens, 816 judgment tokens). The same smoke also
      passed with `modelscope/qwen3.7-plus` after aligning its private model id
      and JSON-instructed request shape (748 conversation tokens, 775 judgment
      tokens). Credentials were process-local and were not copied into the
      repository.*
- [ ] Playing in a real window: a typed improvised answer moves suspicion
      with a model-authored why-line on the HUD (fallback label when the
      provider is down).
- [ ] Playing in a real window: a model-proposed record write appears in the
      ledger and a second NPC visibly reacts to it in the same session.
      *Wired 2026-07-10: `main.gd` runs one ambient beat after every resolved
      answer; scripted-mode probe shows the manager reading the clerk's
      statement. Live-window observation still pending.*
- [ ] A conversation running three or more turns shows no self-contradiction
      of the NPC's own prior lines in the transcript. *Structure landed
      2026-07-10 (two-sided history reaches the model); live observation
      pending.*
- [x] The outcome panel's cited ledger ids exactly match the session ledger;
      a no-record session shows the no-record ending text. *Verified
      2026-07-10 against the production sidecar in fallback mode.*
- [x] `bun run --cwd backend/npc-runtime check`, Session API parity, and
      Godot route smoke (fixture + scripted modes) pass. *79 tests + both
      smoke modes green as of 2026-07-10.*

## Non-goals

Multiple locations, cross-session memory, local model support, save/load, and
broad concurrent society scheduling. Station verdict reversal through
argument (the model judging intake → inquest → verdict end-to-end) is the
next milestone's centerpiece; M2 only moves conversation suspicion judgment
to the model.

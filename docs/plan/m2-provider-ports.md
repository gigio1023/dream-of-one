# M2 — LLM-Native Agent Loop

**Status: done — closed 2026-07-11.** Acceptance passed; fun gate honestly
recorded as *no on immersion* (owner playtest review below). Per the
boundary interview, the closeout slate executes as M3's opening slices
([`m3-agent-loop-npcs.md`](m3-agent-loop-npcs.md)). Rewritten 2026-07-10
after the owner interview moved judgment authority to the model (see
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

The world and HUD use separate scale domains. (Revised 2026-07-10: the owner
rejected the original fixed-640×360 rule — on large monitors it re-magnified
the same narrow view instead of showing more world.)

- The pixel-art world renders 1:1 into a `SubViewport` whose logical view is
  chosen by window height — 320×180 (720p), 384×216 (1080p, 4K), 426×240
  (1440p) — nearest-neighbor filtered and integer-scaled (4×/5×/6×/10×).
  Output size and world magnification are independent; the Store fills most
  of the frame at Stardew-band density, and locations draw a pavement apron
  so wide views never expose void. Output presets are 1280×720, 1920×1080
  (default), 2560×1440, and 3840×2160.
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

- NPC identity and role (quiet nameplate with a role-accent tick, plus the
  role-accent ring under each sprite);
- the NPC's current speech bubble (gist in a world-anchored native HUD chip,
  full line in inspect);
- a short native reaction chip anchored to the NPC;
- the NPC's current social action — on the nameplate for the conversation
  speaker, the focused NPC, and any recently changed action, and always in
  inspect. A permanent per-NPC card is explicitly not required.

The immediate influence line and action source appear briefly when an event
lands, then clear. Detailed judgment reasons, longer relationship or memory
state, cited record contents, and the full causality chain live in the inspect
view. Debug mode may add collision, sensing, influence, ids, and raw state, but
none of those overlays may be required to understand normal play.

Generated Korean speech, reaction, and record-state text never renders inside
the integer-scaled world SubViewport. The HUD projects those chips back onto
the room, keeps them within the inner floor, and routes them around actors,
props, and visible panels; sprites and tiles remain in the pixel scale domain.

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

- [x] Normal Store and Station play shows the intended tiles, characters, and
      props; no black background or debug-circle-only presentation remains.
- [x] Every current gameplay state has an asset-backed player-facing
      presentation, including conversation, records, ambient reaction,
      Station intake, and ending.
- [x] 720p, 1080p, 1440p, and 4K presets show undistorted world pixels and a
      readable, unclipped HUD.
- [x] Live Qwen and OpenAI sessions each show generated dialogue, typed-input
      judgment, record creation, and another NPC's visible reaction without a
      fallback response.
- [x] A conversation of at least three turns retains the NPC's own prior lines;
      long generated text grows to its cap and then scrolls.
- [x] Normal, inspect, and debug views follow the information policy above.
- [x] Backend checks and Godot asset, scene-load, localization, and route
      smokes pass in fixture and scripted modes.

Verified 2026-07-10: engine-native frames at 720p, 1080p, 1440p, and
4K preserved 2×/3×/4×/6× world pixels and native HUD layout. A Qwen live
session reached the third Station turn at 125 suspicion/125 report pressure;
the Station prompt cited the clerk's prior statement, the actual Store record,
and the player's earlier “first visit” claim. Both live profiles completed
typed-answer sessions with zero fallback, created two records, and produced
validated manager/customer actions; the manager read the created records.
The Qwen live prompt was also rendered in the real Godot conversation panel
with the `live` profile label. Long prompt and normal/inspect/debug behavior are
covered by the public Godot route smoke.

That pass proved integer scaling, not composition: reviewing the same build on
a large monitor, the owner rejected the default density (fixed 640×360 view
re-magnified to 6×, HUD text at twice the recommended body size, panels
dominating the world) later the same day. The resolution contract above was
revised accordingly and re-verified with engine-native frames at all four
presets.

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
      (727 conversation tokens, 961 judgment tokens). The same smoke also
      passed with `modelscope/qwen3.7-plus` after aligning its private model id
      and JSON-instructed request shape (773 conversation tokens, 921 judgment
      tokens). Credentials were process-local and were not copied into the
      repository.*
- [x] Playing through the live Session path: a typed improvised answer moves
      suspicion with a model-authored why-line in the HUD inspect layer
      (fallback label when the provider is down). *Verified with both Qwen and
      OpenAI; the live Qwen opening was rendered in the real Godot window.*
- [x] Playing through the live Session path: a model-proposed record write appears in the
      ledger and a second NPC visibly reacts to it in the same session.
      *Verified live with both profiles: each created two records with zero
      fallback and the manager read them through validated `read_record`
      actions; Godot renders the same action as a card/marker.*
- [x] A conversation running three or more turns shows no self-contradiction
      of the NPC's own prior lines in the transcript. *Verified live with Qwen:
      the third-turn Station prompt accurately combined the clerk's earlier
      words, Store record, and player's prior claim.*
- [x] The outcome panel's cited ledger ids exactly match the session ledger;
      a no-record session shows the no-record ending text. *Verified
      2026-07-10 against the production sidecar in fallback mode.*
- [x] `bun run --cwd backend/npc-runtime check`, Session API parity, and
      Godot route smoke (fixture + scripted modes) pass. *82 tests + both
      smoke modes green as of 2026-07-10.*

## Non-goals

Multiple locations, cross-session memory, local model support, save/load, and
broad concurrent society scheduling. Station verdict reversal through
argument (the model judging intake → inquest → verdict end-to-end) is the
next milestone's centerpiece; M2 only moves conversation suspicion judgment
to the model.

## Owner playtest review (2026-07-11)

The owner played the completed build (likely `db1ae765`, head of the
live-Qwen worktree branch `codex/qwen-openai-provider-proof` at recording
time — not an ancestor of this branch; the owner's exact run is not pinned)
on a live Qwen profile and
reported nine findings. This section records them with root causes and
dispositions. No scope is added to M2: items marked *closeout* are defects
or cuts inside existing M2 deliverables; items marked *M3 queue* are
recorded in [`m3-agent-loop-npcs.md`](m3-agent-loop-npcs.md).

The owner did not state the fun-gate answer in so many words, but the review
reads as a **no on immersion**: the judgment loop itself was not the
complaint — the crammed single room, the static cast, the unexplained
generation stalls, and the artificial record props break the fiction before
the loop can be felt.

| # | Owner finding | Root cause in this build | Disposition |
|---|---|---|---|
| 1 | Map is too small; even a very tiny village would do. Everything is crammed inside one building, which kills immersion (몰입도) | The whole game happens in one Store room (plus Station) from `world_layout.json`; town scope was deferred to M4 | **M3 queue** — pull a minimal exterior shell forward; full four-location theming stays M4 |
| 2 | The receipts/conversation-log props next to NPCs are unnecessary and feel artificial; view them from a menu or just delete them | In-room record props (`receipt_tray`, `correction_slip`, `usual_order_cue`, …) exist to satisfy this doc's information policy — surfacing record state in normal play | **Closeout (cut)** — owner overrides the record-prop point of the information policy: remove from normal play, inspect/menu at most. Bulletin-board variant (other NPCs read and write it) queued at very low priority; maps to M4's existing notice board |
| 3 | Even Qwen takes noticeably long, and it looks like everything (extra info, actions) is generated together. Must split: respond to the player first, generate the rest in parallel or during player think-time | Confirmed: `resolveAnswer` serializes judgment (1 call) + agent-loop beat (≤3 calls) + next-turn generation (1 call) before the player sees anything; the per-session `serialize()` chain additionally lets in-flight ambient decision calls (≤3 × 2 actors) block the next answer | **M3 queue (first technical slice)** — respond-first pipeline split, precondition for scaling the cast |
| 4 | While the LLM generates, nothing on screen says so — the game just freezes, which feels broken. At minimum "~가 생각 중입니다" plus a spinner | `set_busy` only disables buttons; the missing wait indicator was a known P2 | **Closeout** — diegetic thinking state required wherever the player waits on the model |
| 5 | Time pressure is far too harsh; there is no time even to type. Answering late should not itself be problematized | `HESITATION_SECONDS = 6.0` auto-submits "(응답 지연)", which is judged and can leave a hesitation ledger record | **Closeout (cut)** — remove auto-submit hesitation as a default mechanic; slow answers cost nothing by default |
| 6 | Only one NPC is interactive; make more | Only the clerk speaks Store beats (officer at Station); manager and waiting customer are ambient-only | **M3 queue** — already M3's concurrent-goal thesis; make 2–3 NPCs conversable |
| 7 | NPCs are parked like Pokémon furniture. The game is NPCs doing social building with the player joining in, so they should move around — policy-based game AI (non-LLM) is explicitly fine | `npc_2d.gd` has no locomotion; ambient actions render as chips on stationary sprites | **M3 queue** — policy-driven ambient movement and visible NPC-to-NPC interaction; the model owns judgment, not locomotion |
| 8 | The screen micro-shakes while the character moves; nausea-inducing | `world_location.gd` enables `Camera2D` position smoothing (fractional positions) while `project.godot` snaps 2D transforms to pixel and the world is integer-upscaled 5–10×, producing stepped jitter | **Closeout (fix)** — presentation bug in an existing deliverable |
| 9 | HUD should be bigger | Default HUD body scale (19px @1080p) is below the owner's comfort; the 80–150% setting exists but the default is wrong | **Closeout (fix)** — raise the default |

What the findings share: this build surfaces the social simulation the way a
test harness would — props, chips, and labels that prove state instead of a
place and cast that embody it — and it spends the player's waiting time
proving judgment instead of answering first. The architecture passed its
acceptance; the fiction did not. That is the gap the next milestone must
close.

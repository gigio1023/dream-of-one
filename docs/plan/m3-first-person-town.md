# M3R — First-Person Town

**Status: active (2026-07-11).** Created at the direction-conversion boundary
that killed the 2D M3 ([`roadmap.md`](roadmap.md) history). Direction source:
the owner-approved interview closure (2026-07-11) recorded in
[`../vision/design-pillars.md`](../vision/design-pillars.md) and
[`../vision/pitch.md`](../vision/pitch.md).

## Goal

Convert the game into one seamless first-person 3D town where six persistent
LLM NPCs verifiably live — move on schedules, meet, talk to one another in
real utterances, and remember — and give the player a complete run: arrive as
an outsider, edit what residents believe about you through conversation only,
and face a scheduled Station hearing that pools their real memories into a
verdict.

## Owner decisions shaping this milestone

1. **Full conversion, not a probe.** The 2D presentation is replaced. Low-fi
   free assets are the accepted norm; coherence, collision correctness, and
   social legibility are the bars.
2. **World**: park center + enterable single-story studio reception, office,
   and Station; no loading screens; no fake buildings; sightline composition
   closes the map.
3. **Run frame**: the existing per-NPC opinion is presented as
   `oppose`/`uncertain`/`vouch`; four of six vouches are necessary (not
   sufficient) for the model-judged hearing to classify the player as
   ordinary. The scheduled hearing is the only run-ending verdict;
   interrogation before it stays survivable. Target: 30–60 minutes per run,
   one sitting.
4. **Time**: continuous world time, fully paused only while the player is in a
   modal conversation, including its merged LLM wait. Ambient provider work
   never pauses free exploration and revalidates against the fresh world
   revision before applying. No timer outside Station interrogation (≥40s
   there).
5. **Six NPCs, one event-driven loop** regardless of player distance;
   provider calls wake on events/goals, never per tick; policy-based
   movement between wake-ups.
6. **Personal propagation through real speech only**; explicit records remain
   a separate administrative path and cannot directly move stance.
   Direction-aware subtitles cover audible speech; every off-screen change is
   attributed when the player first encounters it, with an
   open-questions/rumor-log surface for encountered knowledge.
7. **Modal conversation** locks movement and camera until a clean end;
   merged judgment+reply call stays the only player-blocking provider work.
8. **Minimal physicality**: doors plus a few pick/move/throw props; no
   inventory; observation may enter factual NPC memory, but has no automatic
   reaction and cannot directly advance a vouch.
9. **Audio**: CC0 SFX and ambience land here (footsteps, doors, park murmur,
   short spatial speech murmurs/blips, the record-scribble cue); no TTS or BGM
   in M3R.

## First playable proof

Walk in first person from the park into the studio reception with no loading
screen, answer the receptionist's ordinary question, and watch her stance
about you visibly change — while at least one other resident walks its own
schedule outside and two residents hold an audible conversation the player
can overhear with subtitles.

## Dependency notes and ordering

- **Godot AI integration lands first.** The owner's pinned Godot AI
  integration (add-on, autoload, and working contract) is the inspection
  infrastructure for scene trees, logs, non-player-controlled snapshots, and
  the final Terra run. Sol may prove its handshake and use those non-play
  surfaces during implementation, but does not drive the game. Commit and
  prove that workstream (owner's existing changes, preserved verbatim) before
  or alongside the first 3D slice; it must not displace playable slices after
  that.
- **Asset validation before scene work.** The asset family is decided on
  desk research (2026-07-11, recorded in
  [`../art/asset-pipeline.md`](../art/asset-pipeline.md)): greybox
  architecture + Kenney environment/props + Quaternius modular characters,
  all CC0 and committable. The first art slice runs that doc's in-engine
  validation gates (scale reference, import, character legibility,
  retargeting if needed, test corner) instead of re-surveying, and applies
  the recorded ranked fallback if a gate fails.
- **Runtime authority carries over; run scope does not yet exist.** The current
  implementation owns conversation-session state and budgets. The first
  runtime slice adds a `RunService` keyed by `runId`, owning the six memories,
  coarse stances, records, ledger, world clock, scheduler, and run-level
  provider budget; existing conversation sessions become children. Judgment,
  provider-port, fallback, and validity boundaries stay unchanged.
- **Final live verification is owner-routed.** Planning, implementation, and
  diagnosis remain with GPT-5.6 Sol ultra. After implementation and self-review
  are complete, Sol produces one bounded run-only packet using the
  `lower-capability-executor-prompt` contract; GPT-5.6 Terra high performs the
  actual game play through Godot AI. Every model-backed play run pins
  `modelscope/qwen3.7-plus` and proves `transport=live` with zero fallback.
  Missing Qwen credentials block live acceptance rather than authorizing a
  substitute model. Exact commands and the distinction from model-free smokes
  live in [`../tech/verification.md`](../tech/verification.md).
- **Scenario canon slices**: the player's concrete identity/secret and the
  six resident identities are drafted from `docs/scenario/` canon for owner
  approval as content slices inside this milestone.

## Player-visible deliverables

- A first-person controller delivering the full interaction baseline in
  [`../tech/godot-3d-client.md`](../tech/godot-3d-client.md): mouse look
  with capture rules, reticle + in-fiction interaction prompts, slide-along
  collision with no player/NPC shoving and never-trap rules, no jump or
  crouch, out-of-bounds failsafe, and the minimal Esc settings surface
  (FOV, sensitivity/invert, UI scale, volume, language). The comfort
  research slice tunes the numbers, not the list; keyboard+mouse full play.
- The seamless town: park, studio reception, office, Station, street
  connective space; every door opens; collision and navigation correct.
- Six residents on schedules with policy movement, meeting windows, and
  audible NPC-to-NPC conversations (subtitled when in earshot) whose content
  listeners actually remember.
- Modal first-person conversation: focus the speaker, lock movement/camera,
  pause the world, generated suggestions + bounded free text, typewriter
  reveal over the merged call's diegetic thinking wait.
- The run frame: visible hearing date, per-NPC coarse stance, one institutional
  pressure surface, the open-questions/rumor-log surface, a survivable
  interrogation, the hearing itself, and a ledger-built recap. Numeric
  per-NPC suspicion remains internal/inspect/debug data, not another normal
  HUD meter beside stance.
- NPC-initiated contact: a resident whose suspicion or goals warrant it
  approaches and questions the player unprompted.
- SFX/ambience per owner decision 9.

## Technical deliverables

- Godot 3D client per [`../tech/godot-3d-client.md`](../tech/godot-3d-client.md):
  engine baseline (Forward+, Jolt, fixed daylight, single-story rule), the
  world construction plan (editor-authored scene bound to
  `world_layout.json`, greybox-owned collision/navmesh, blockout-then-dress
  order, metric standards), scene architecture, navmesh, interaction ray,
  subtitle/HUD surfaces, unchanged RuntimeBridge transport.
- `world_layout.json` re-expressed for 3D (landmarks, zones, anchors,
  sight/audibility volumes) — one file, client renders it, runtime reasons
  over it.
- A run-scoped runtime above conversation sessions: `runId`, six memories,
  stances, records/ledger, world clock, scheduler state, and shared provider
  accounting. Initial timing data sets a 90-world-second grace period and a
  hearing after 30 minutes of unpaused world time; final Qwen/Terra play may
  tune the numbers without changing the continuous-time model.
- Event-driven NPC scheduler: wake events (schedule, arrival, observation,
  goal, conversation), policy movement between wakes, and stale-result
  revision checks. Initial guardrails, tuned only from measured Qwen runs:
  three global provider calls maximum, one foreground slot reserved for the
  player, at most two background calls, and at most one ambient NPC
  conversation at a time. A run starts with 120 calls / 300k tokens, reserving
  the final 20 calls / 50k tokens for player conversation and the hearing;
  ambient exhaustion yields to policy movement rather than consuming the
  reserve.
- Bounded NPC-to-NPC conversation through the same validated tools: two
  agents alternate 2–4 real utterances, store an audibility snapshot, end
  cleanly, and append attributed listener memory only after each utterance is
  validated.
- Stance model: model-judged, rule-clamped presentation of existing per-NPC
  opinion (`oppose`/`uncertain`/`vouch`), with firsthand provenance required
  for a vouch. The four-of-six quorum is a deterministic eligibility floor;
  the model still judges the pooled memories and final defense inside a
  guaranteed hearing procedure with fallback.
- 3D spatial validation for `move_to`/`look`/`talk_to` (navmesh reachability,
  line of sight, audibility).
- Provider cost/cadence research within the existing port layer (six agents,
  event-driven; per-run call/token budget proven in play).

## Acceptance

- [ ] First playable proof (above) holds in a live run.
- [ ] The park-idle test: stand still in the park for two minutes of world
      time — at least one NPC-to-NPC conversation occurs within potential
      earshot, its validated utterances enter the actual listener's attributed
      memory, and schedule/hearing time advances. If stance moves, the player
      can later trace `speaker → listener → source memory → why`; if it does
      not, that no-change judgment is visible in diagnostics. Waiting was not
      free because no vouch can be earned without firsthand conversation and
      a meeting window was spent.
- [ ] Walking from park into all three interiors and back crosses no loading
      screen and no invisible wall that reads as arbitrary.
- [ ] A full run is completable both ways: hearing passed (classified
      ordinary, with four evidenced vouches) and hearing failed (definitive
      verdict), inside one sitting. No pre-hearing interrogation ends the run.
- [ ] Interrogation before the hearing remains survivable by argument, and
      an in-run recovery path visibly lowers a wary NPC's suspicion.
- [ ] No provider call ever blocks the player except the merged
      judgment+reply call. Ambient calls never pause free exploration, stale
      results cannot mutate a newer world revision, and any result completed
      during the player's modal pause waits to apply until resume.
- [ ] Provider-call accounting shows event-driven wake-ups only — zero
      per-tick provider calls; a full run stays inside the configured
      call/token budget.
- [ ] An NPC that never conversed with the player contributes hearing
      testimony consistent with that fact.
- [ ] Every off-screen stance/record change the player encounters arrives with
      its allowed provenance (who spoke or wrote, who heard or read, source
      memory, and why), while the open-questions surface reveals only content
      the player has actually encountered.
- [ ] No timer exists outside Station interrogation; interrogation allows at
      least 40 seconds.
- [ ] Deterministic fallback keeps a run completable (visibly marked) when
      the provider is unavailable, including the hearing.
- [ ] Every LLM-backed acceptance and fun-gate run is driven by GPT-5.6 Terra
      high through Godot AI with the Qwen profile pinned, and the resulting
      packets show `profileId=modelscope/qwen3.7-plus`, `transport=live`, and
      no fallback. Fixture/scripted/fallback checks remain valid engineering
      evidence but do not prove the LLM game experience.
- [ ] `bun run --cwd backend/npc-runtime check`, headless import, and scene
      smoke pass; the fun gate is answered honestly in the PR.

## Non-goals

The rumor-diffusion run clock and notice board (M4); save/load (M4, pulled
forward only if runs outgrow a sitting); cross-run persistence; trespass,
theft, combat, health, damage, chase; inventory; store/commerce; BGM (M5);
graphical fidelity beyond coherence; local-model support; any second
simulation tier for distant NPCs.

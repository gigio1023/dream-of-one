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

Korean remains the source and tone-reference language. The same game path must
support Korean, English, Italian, Simplified Chinese, French, and Japanese —
including generated dialogue, ambient speech, why-lines, fallback, hearing,
and recap, not only menu chrome.

## Owner decisions shaping this milestone

1. **Full conversion, not a probe.** The 2D presentation is replaced. Low-fi
   free assets are the accepted norm. A visibly occupied town, collision
   correctness, and social legibility matter more than keeping every prop in
   one art family; repeated or mixed CC0 dressing is acceptable.
2. **World**: park center + enterable single-story studio reception, office,
   and Station; every building portal stays permanently open, with no physical
   door body or interaction; no loading screens; no fake buildings; sightline
   composition closes the map.
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
   provider calls wake on events/goals, never per tick. Deterministic local
   patrol routes and staggered dwell times keep residents moving between
   wake-ups without spending an LLM call.
6. **Personal propagation through real speech only**; explicit records remain
   a separate administrative path and cannot directly move stance.
   Direction-aware subtitles cover audible speech; every off-screen change is
   attributed when the player first encounters it, with an
   open-questions/rumor-log surface for encountered knowledge.
7. **Modal conversation** locks movement and camera until a clean end;
   merged judgment+reply call stays the only player-blocking provider work.
8. **Minimal physicality**: a few pick/move/throw props; no inventory;
   observation may enter factual NPC memory, but has no automatic reaction and
   cannot directly advance a vouch.
9. **Audio**: license-safe SFX and ambience land here (the current baseline is
   project-owned procedural audio; verified CC0 replacements remain allowed):
   footsteps, park murmur, short spatial speech murmurs/blips, and the
   record-scribble cue; no TTS or BGM in M3R.
10. **Six gameplay locales, one implementation**: presentation ids are
    `ko`, `en`, `it`, `zh`, `fr`, and `ja`; target run API locales are
    `ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP`. Chinese means
    Simplified Chinese for this target; preserve full
    locale tags so a later Traditional Chinese target does not require a new
    locale system. One run fixes its gameplay locale at start, and a settings
    change applies to the next run or an explicit restart so memories never
    mix languages. No locale gets a separate UI, conversation path, NPC loop,
    or provider adapter.

## First playable proof

Walk in first person from the park into the studio reception with no loading
screen, answer the receptionist's ordinary question, and watch her stance
about you visibly change — while at least one other resident walks its own
schedule outside and two residents hold an audible conversation the player
can overhear with subtitles.

## Dependency notes and ordering

- **Reuse before implementation.** Extend the existing Dream path first, then
  Godot/Bun platform facilities; add only the smallest missing behavior. The
  owner-referenced Ponytail repository is an agent instruction/plugin, not a
  reusable game library; its audit identified no compatible Dream gameplay
  component to import. It contributes this reuse order, not a dependency. In
  particular, keep the existing `Localization` /
  `TranslationServer`, `HUD3D`, `RunSession` / `RuntimeBridge`, `RunService`,
  provider ports, and fixture generator instead of creating parallel systems.

- **Godot AI is active in every 3D spatial/UI slice.** Before changing a slice,
  select the editor session whose canonical path is this checkout's `godot/`
  root and require Godot 4.7.x, plugin/server 2.9.1, and
  `readiness=ready`. Files and the CLI own code, data, bulk resources, import,
  and smokes. Godot AI owns scene/Inspector work where appropriate, saved
  hierarchy/property inspection, current editor/game diagnostics, and the
  smallest non-input capture needed for a visual claim. During implementation,
  Sol may run the fixture helper without treating it as play evidence; final
  live acceptance may be driven by a native Sol-ultra child with exclusive
  Godot run ownership. If one
  bounded recovery cannot restore the integration, file/CLI evidence may
  diagnose the problem but the spatial/UI slice cannot claim scene or visual
  completion. Add the scene-owned `AgentPlaytestSurface` with the 3D main
  scene, not as a later test-only slice. The full contract is
  [`../tech/godot-ai-playtest.md`](../tech/godot-ai-playtest.md).
- **Asset validation before scene work.** The asset baseline is decided on
  desk research (2026-07-11, recorded in
  [`../art/asset-pipeline.md`](../art/asset-pipeline.md)): greybox
  architecture + verified CC0 environment/props + Quaternius modular
  characters. Kenney is the already-imported base, not an exclusivity rule;
  other creator-sourced CC0 packs may join the dressing layer. The first art
  slice runs that doc's in-engine
  validation gates (scale reference, import, character legibility,
  retargeting if needed, test corner) instead of re-surveying, and applies
  the recorded ranked fallback if a gate fails.
- **Run scope carries the authority.** The landed `RunService`, keyed by
  `runId`, owns the six memories and coarse stances, world clock, scheduler,
  world revision, and run-level provider budget; player conversations are
  children. Records, institutional pressure, hearing, and terminal recap
  extend that same scope rather than creating another state owner. Judgment,
  provider-port, fallback, and validity boundaries stay unchanged.
- **Final live verification is owner-routed.** GPT-5.6 Sol ultra may own
  planning, implementation, diagnosis, repair, and actual play through Godot
  AI. High-volume Godot work stays in one native child with exclusive run
  ownership so the lead session remains available. Do not use the
  `lower-capability-executor-prompt` contract unless the owner explicitly asks
  for it. Every model-backed play run pins
  `modelscope/qwen3.7-plus` and proves `transport=live` with zero fallback.
  Missing Qwen credentials block live acceptance rather than authorizing a
  substitute model. Exact commands and the distinction from model-free smokes
  live in [`../tech/verification.md`](../tech/verification.md).
- **Scenario canon slice (owner-approved 2026-07-13).** The player wakes in
  the park with only an uncertain clue that they may be included in a Studio
  review schedule; neither the missing pre-waking memory nor the booking is a
  mystery objective. The six residents are Mira, Ivo, Nora, Sol, Elian, and
  Toma, with the roles, voices, and holder-local pressures recorded in
  `docs/scenario/bible/07-characters-and-dialogue.md`. Public names and the
  player's own uncertain brief use localization keys. Private cast context is
  backend-only, filtered to its owning actor, and cannot become memory,
  provenance, stance, record, ledger evidence, or hearing testimony unless it
  is later expressed through a validated in-world action.
- **Locale work follows the playable slices instead of becoming a second
  framework.** The shared six-locale foundation now carries the selected
  locale through the existing UI, run, session, provider, ambient, fallback,
  and fixture paths. A run locks one locale; later setting changes apply to
  the next run or restart. Subsequent
  administrative, hearing, recap, physicality, and onboarding work adds text
  only through that path. Milestone integration verifies exact key/placeholder
  parity, long Latin text, CJK glyphs, IME input, and one bounded generated
  round trip per locale. New player-facing text is always keyed content even
  before translation parity lands.

## Player-visible deliverables

- A first-person controller delivering the full interaction baseline in
  [`../tech/godot-3d-client.md`](../tech/godot-3d-client.md): mouse look
  with capture rules, reticle + in-fiction interaction prompts, slide-along
  collision with no player/NPC shoving and never-trap rules, a small grounded
  jump that is never required to reach content, no crouch, out-of-bounds
  failsafe, and the minimal Esc settings surface
  (FOV, sensitivity/invert, UI scale, volume, language). The comfort
  research slice tunes the numbers, not the list; keyboard+mouse full play.
- One six-locale settings and content path (`ko/en/it/zh/fr/ja`) whose selected
  locale governs HUD, generated and fallback conversation, subtitles,
  records, hearing, and recap for the whole run.
- The seamless town: a densely dressed park, studio reception, office,
  Station, and street connective space; all building portals remain open;
  collision and navigation remain correct. Repetition and mixed CC0 prop
  families are preferable to large empty surfaces.
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
  hearing after 30 minutes of unpaused world time; final Qwen live play may
  tune the numbers without changing the continuous-time model.
- Event-driven NPC scheduler: wake events (schedule, arrival, observation,
  goal, conversation), policy movement between wakes, and stale-result
  revision checks. Initial guardrails, tuned only from measured Qwen runs:
  three global provider calls maximum, one foreground slot reserved for the
  player, at most two background calls, and at most one ambient NPC
  conversation at a time. A run starts with 120 calls / 300k tokens, reserving
  the final 20 calls / 50k tokens for player conversation and the hearing;
  ambient exhaustion yields to policy movement rather than consuming the
  reserve. Reaching `hearing_due` closes the background lane: queued preload
  or goal work cannot begin transport, and active background work plus stale
  cleanup drains before the hearing provider path starts. Semantic goal changes
  (memory, records, gained or renewed contact, interrogation) wake immediately;
  deterministic schedule transitions and contact loss do not spend a provider
  call by themselves;
  spatial-only changes are latest-state-wins, admit at most one goal per actor
  every 600 world seconds, and never stack multiple active goals for one actor.
  An authored meeting owns its participants' social goal throughout the
  participant-anchor lead-in and active window so the same two-turn exchange is
  not paid twice. A grounded player contact already active when ownership begins
  remains higher priority and holds its participant in place, but a newly
  available automatic contact does not create parallel participant work.
  The live client gives each resident one automatic opening-preload attempt
  when it first becomes the nearby priority. Nearest-distance hysteresis picks
  the passive priority, the NPC under the current raw interaction ray overrides
  it, and active contact overrides both. After evidence invalidates an attempted
  opening, only raw aim or active contact may request another attempt; one
  continuous demand epoch permits at most one such retry, and authoritative
  rebase completes before another preload dispatch. Passive proximity cannot
  create a preload treadmill. HUD focus, prompts, and `E`
  remain gated by runtime conversation readiness. This conservative policy
  follows a measured 367-world-second Qwen run in which the former 180-second,
  eager-refresh path reached 54 used/reserved calls and 180,289 used/reserved
  tokens.
- Bounded NPC-to-NPC conversation through the same validated tools: two
  agents alternate 2–4 real utterances, store an audibility snapshot, end
  cleanly, and append attributed listener memory only after each utterance is
  validated. The current two-turn floor uses one ordinary first proposal and
  one merged `ambient_reply` for the listener's exact reply plus model-owned
  stance judgment, so reaction adds no third call. Speech and judgment commit
  atomically after fresh evidence/audibility checks; no-change remains visible
  in diagnostics, while a changed off-screen opinion reaches `socialView` only
  at the player's next successful conversation start with exact
  `speaker → listener → source memory → why` provenance.
- Stance model: model-judged, rule-clamped presentation of existing per-NPC
  opinion (`oppose`/`uncertain`/`vouch`), with firsthand provenance required
  for a vouch. The four-of-six quorum is a deterministic eligibility floor;
  the model still judges the pooled memories and final defense inside a
  guaranteed hearing procedure with fallback.
- 3D spatial validation for `move_to`/`look`/`talk_to` (navmesh reachability,
  line of sight, audibility).
- Provider cost/cadence research within the existing port layer (six agents,
  event-driven; per-run call/token budget proven in play).
- A shared supported-locale contract used by Godot, run schemas, provider
  prompts/envelopes, fallback content, and fixture generation. Exact locale
  and placeholder-key parity is checked without accepting Korean fallback as
  a missing translation; the HUD has a licensed Latin/Hangul/Han/kana font
  fallback and wraps long Italian/French text without a locale-specific scene.

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
- [ ] During ordinary exploration, no provider call blocks the player except
      the merged judgment+reply call. The already-staged terminal hearing may
      block once on its final model judgment. Ambient calls never pause free
      exploration, stale results cannot mutate a newer world revision, and
      any result completed during the player's modal pause waits to apply
      until resume.
- [ ] Provider-call accounting shows event-driven wake-ups only — zero
      per-tick provider calls; a full run stays inside the configured
      call/token budget.
- [ ] Each hearing assessment declares the exact memory-derived contact basis:
      meaningful firsthand, limited direct conversation, or never conversed.
      The player sees that validated basis beside the model's testimony, whose
      live wording stays consistent with it; attributed ambient memory may
      still support oppose or uncertain, but never a vouch.
- [ ] Every off-screen stance/record change the player encounters arrives with
      its allowed provenance (who spoke or wrote, who heard or read, source
      memory, and why), while the open-questions surface reveals only content
      the player has actually encountered.
- [ ] No timer exists outside Station interrogation; interrogation allows at
      least 40 seconds.
- [ ] Deterministic fallback keeps a run completable (visibly marked) when
      the provider is unavailable, including the hearing.
- [ ] Every LLM-backed acceptance and fun-gate run is driven by GPT-5.6 Sol
      ultra through Godot AI with the Qwen profile pinned, and the resulting
      packets show `profileId=modelscope/qwen3.7-plus`, `transport=live`, and
      no fallback. Fixture/scripted/fallback checks remain valid engineering
      evidence but do not prove the LLM game experience.
- [ ] `ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP` each pass exact
      player-facing key and placeholder parity, show no raw localization key,
      preserve readable glyphs/layout at 100% and 150% UI scale, and accept
      Korean/Chinese/Japanese IME composition where text entry is offered.
      Each locale completes one bounded Qwen-live opening → answer → why-line
      plus ambient/fallback language check; six full 30–60 minute runs are not
      required.
- [ ] `bun run --cwd backend/npc-runtime check`, headless import, and scene
      smoke pass; the fun gate is answered honestly in the PR.

## Non-goals

The rumor-diffusion run clock and notice board (M4); save/load (M4, pulled
forward only if runs outgrow a sitting); cross-run persistence; trespass,
theft, combat, health, damage, chase; inventory; store/commerce; BGM (M5);
graphical fidelity beyond coherence; local-model support; any second
simulation tier for distant NPCs. Traditional Chinese is not part of the
initial six-locale content target, but the locale contract must preserve the
tag needed to add it without redesign.

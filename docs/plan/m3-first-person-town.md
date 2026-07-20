# M3R — First-Person Town

**Status: corrective playable slices active (2026-07-19 comprehensive
review, re-examined 2026-07-20).** Created at the direction-conversion
boundary that killed the 2D M3 ([`roadmap.md`](roadmap.md) history). The
implementation is substantially built, but the milestone is `NOT_READY` to
close: the dated review below records a player-voice integrity blocker and
the corrective restart order. A fresh session starts work at the review's
"Restart order"; the sections before the review record design intent and the
2026-07-16 checkpoint, not current completion. Direction
source: the owner-approved interview closure (2026-07-11) recorded in
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
including generated dialogue, ambient speech, why-lines, hearing, recap, and
provider-interruption UI, not only menu chrome.

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
   interrogation before it stays survivable. The 15-minute unpaused world
   boundary lands around 20–30 minutes of wall time once modal conversations
   and their provider waits are included; one sitting.
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
  provider-port, fail-closed interruption, and validity boundaries stay
  unchanged.
- **Final live verification is owner-routed.** GPT-5.6 Sol ultra may own
  planning, implementation, diagnosis, repair, and actual play through Godot
  AI. High-volume Godot work stays in one native child with exclusive run
  ownership so the lead session remains available. Do not use the
  `lower-capability-executor-prompt` contract unless the owner explicitly asks
  for it. Every model-backed play run pins
  `modelscope/qwen3.7-plus` and proves `transport=live` with no provider
  interruption.
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
  locale through the existing UI, run, session, provider, ambient,
  provider-interruption, and fixture paths. A run locks one locale; later setting changes apply to
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
  locale governs HUD, generated conversation, subtitles, records, hearing,
  recap, and provider-interruption UI for the whole run.
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
  approaches unprompted. Ordinary contact waits for the player's explicit `E`
  response and may be ignored; mandatory Station interrogation begins
  automatically after the grounded approach.
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
  accounting. Timing data sets a 90-world-second grace period and a hearing
  after 15 minutes of unpaused world time. This was tuned from a complete
  1,800-second Qwen run where the background reserve closed at 947 seconds
  and left the final half of the run without enough interaction to pass the
  fun gate; modal conversation still pauses the continuous world clock.
- Event-driven NPC scheduler: wake events (schedule, arrival, observation,
  goal, conversation), policy movement between wakes, and stale-result
  revision checks. Initial guardrails, tuned only from measured Qwen runs:
  three global provider calls maximum, one foreground slot reserved for the
  player, at most two background calls, and at most one ambient NPC
  conversation at a time. A run starts with 120 calls / 450k tokens, reserving
  the final 20 calls / 200k tokens for player conversation and the hearing
  while keeping the measured autonomous-background ceiling at 250k tokens;
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
  create a preload treadmill. A localized, non-actionable preparation status
  may reflect explicit preload intent, but green HUD focus, the `E` talk
  prompt, and `E` interaction remain gated by runtime conversation readiness.
  This conservative policy
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
  hearing procedure that visibly interrupts without a verdict when the model
  result is unavailable or invalid.
- 3D spatial validation for `move_to`/`look`/`talk_to` (navmesh reachability,
  line of sight, audibility).
- Provider cost/cadence research within the existing port layer (six agents,
  event-driven; per-run call/token budget proven in play).
- A shared supported-locale contract used by Godot, run schemas, provider
  prompts/envelopes, provider-failure content, and fixture generation. Exact locale
  and placeholder-key parity is checked without accepting Korean fallback as
  a missing translation; the HUD has a licensed Latin/Hangul/Han/kana font
  fallback and wraps long Italian/French text without a locale-specific scene.

## Current implementation checkpoint (2026-07-16)

This is the restart point for the milestone. It records current build truth,
not a substitute for the acceptance checklist below.

### Landed and mechanically verified

- The default game is the seamless first-person 3D town: park, Studio,
  Office, and Station share one world and navigation map; all three building
  portals are permanently open. Mouse look, grounded jump, interaction,
  collision recovery, three physical props, settings, onboarding, procedural
  SFX, and the six-resident presentation are implemented.
- All six residents have ordinary non-LLM local wander, authored schedules,
  NavMesh movement, avoidance, meeting slots, and bounded obstruction
  recovery. Their provider work remains event-driven rather than per-frame or
  per-tick.
- `RunService` owns the persistent run clock, memories, stances, records,
  ledger, institutional pressure, contacts, interrogation, hearing, terminal
  result, and provider budget. Player and NPC-to-NPC conversations use the
  same provider port, grounding, validation, memory, provenance, and fail-closed
  boundaries.
- Player conversations expose generated suggestions and bounded free text,
  model-owned suspicion/stance judgment, why-lines, open questions, and
  encountered-only provenance. Background speech, administrative record
  choices, contact approach, survivable interrogation, recovery, both hearing
  verdicts, and visible provider interruption have backend and fixture
  coverage. A failed operation commits no substitute speech, action, memory,
  stance, record, testimony, or verdict and retains the exact request for retry.
- The six gameplay locales share one registry, content path, provider route,
  interruption surface, and bundled Noto CJK font setup. The client exposes exact
  run-wide provider accounting: physical calls, repair calls, charged and
  in-flight tokens, logical resolutions, runtime-consumed proposal metadata,
  failures, drops, and truncation. Legacy fallback metadata is accepted only
  at compatibility decoding boundaries and is rejected before simulation
  state can change.
- The fail-closed checkpoint described here passes all 258 backend checks.
  Godot 4.7 headless import and the 19-scene fixture smoke pass. A fresh
  2026-07-19 localization smoke instead found ten real contact-placeholder
  mismatches plus one stale onboarding expectation; the earlier rendered
  six-locale routes remain prior-run visual evidence, not current exact-parity
  proof. Earlier route, NPC movement, physical prop, Godot AI input, asset
  manifest, and asset-validation smokes remain recorded in the verification
  history. The ignored
  `backend/npc-runtime/.env` remains the local credential source and is never
  committed.

The original milestone contract said deterministic fallback would guarantee
session and hearing completion. Implementation review showed that this would
replace the LLM simulation with authored social behavior precisely when the
simulation failed. The conservative permanent choice is now fail-closed: one
same-model schema repair is allowed, then the exact operation visibly
interrupts with no social or world mutation. The player may retry that exact
operation or idempotently abandon the interrupted run and start clean; abandon
returns no verdict or terminal result. Revisit this only if the owner changes
the game's provider-first premise, not merely to improve availability.

### Latest rendered Qwen evidence

A native Godot AI run on exact commit `f9a06083` used `ko-KR` and
`modelscope/qwen3.7-plus`. It proved grounded jump, camera control, the open
Park-to-Studio portal, multiple non-target residents moving without blocked
movement, immediate grounded contact with Mira despite provider latency, a
generated three-choice conversation, a visible `uncertain` stance and
why-line, and clean control restoration after the conversation.

The same run reached a complete two-utterance Manager/Caretaker meeting. Both
utterances carried the correct listener, entered runtime history, and used
Qwen live with no fallback. A later direct Caretaker encounter exposed the
no-change result as `태도 유지 · 판단 보류` with a grounded why-line. The
final provider evidence was complete and quiescent: 39 physical calls, 144,089
charged tokens, 35 resolutions, 35 runtime-trace entries, four successful
repair calls, and zero fallback, failed calls, dropped evidence, truncation,
or in-flight remainder. The honest five-minute fun answer was **yes, narrowly**:
resident circulation and generated social consequences made another five
minutes appealing, while mandatory three-answer conversations and easy-to-miss
ambient speech remained noticeable friction.

This run does not close the first-playable checkbox by itself. It verified the
ambient exchange and listener memory structurally, but did not capture both
live ambient subtitles and speech blips while they were visibly on-screen.
It also did not reach interrogation, hearing, provider-interruption
presentation, or OS IME.

A 2026-07-19 correction run on `codex/m3r-acceptance-corrections` resolved the
missed-subtitle defect without widening speech geometry (softened to *likely
fixed* by the 2026-07-20 re-examination in the review section below — the
park-north-edge in-radius watch item remains open). The exact reported
player point `(0.28, 0.05, -6.89)` and west-meeting speaker slot are both in
`AUD_PUBLIC_CENTER`, 8.06 m apart, and therefore pass the existing 13 m
audibility contract; this is now protected by the scene smoke. The client
instead retains hidden ambient subtitles while logs, settings, outcomes, or
provider-interruption UI obscure them, pauses their lifetime until they can be
shown, and gives readable lines a 4–8 second lifetime. Korean contact cues now
select `이/가` from the final Hangul syllable, so `관리인이` is produced by the
localization template rather than a one-off corrected string.

The native Godot AI rerun then stood at the authored park spawn and captured
the two-turn Manager/Caretaker exchange in earshot. The first subtitle was
attributed to `이보 · 스튜디오 관리자` with a left cue at 12.87 m; the queued
reply was captured on-screen as `솔 · 공원 관리인 · 왼쪽`. Both sequential
events used `modelscope/qwen3.7-plus`, live transport, and no fallback. The
spatial blip nodes had generated streams and the same 13 m maximum distance;
the immediate fixture smoke verifies `playing=true` for each matching turn
(the blip itself lasts 0.14 seconds). At quiescence the live run reported 19
physical calls, 59,595 charged tokens, zero failed/fallback/dropped/truncated
evidence, and `allExpectedProfileLiveNoFallback=true`. This closes the ambient
capture part of ordered item 1, not its traversal, conversation-friction, or
fun-route requirements.

The same correction branch then completed the remaining automatable acceptance
routes. Ordinary run `run-aa3e2230-68bf-4f29-acfb-ddfb6ee28f7c` traversed
park → Studio → park → Office → park → Station → park → Studio → park,
including grounded jump, open portals, readable ambient activity, and all six
resident contacts. Four meaningful-firsthand vouches produced the ordinary
hearing verdict. Its final audit used 66 physical calls and 290,993 charged
tokens. Materially different abnormal run
`run-c299bdf7-aa58-4082-93f6-c6031bfedd7e` used an invented secret-bureau
claim, only two direct conversations, an ignored contact that expired into
factual memory, and a visible Station Officer
`uncertain → oppose → uncertain` recovery before the abnormal verdict. Its
final audit used 58 physical calls and 246,027 charged tokens. Both audits
were complete and quiescent on `modelscope/qwen3.7-plus`, with live
transport and zero failed, fallback, dropped, truncated, or in-flight
evidence.

The production-provider interruption route was also rendered through the
sidecar with a connection-failing proxy rather than a scripted adapter. The
same pending request resumed exactly once after the identical provider was
restored; abandoning instead created clean run
`run-5d1b06d2-14ca-484e-a92d-fa867d1ba2f0` with no verdict or invented
mutation. The interruption panel was then inspected in all six locales.
Normal Qwen opening → answer → why-line rounds were rendered in all six
locales at 100%, and the same long-text/why-line surfaces were inspected at
150%. Commit `bd01185e` makes settings and conversation panels
viewport-bounded, exposes the `1–3` shortcuts on their buttons, suppresses
the detached onboarding card over conversations, and releases hidden button
focus when a modal closes.

After the two full routes, the honest five-minute fun answer is **yes,
narrowly**. Different player claims produced different social trajectories,
recoverable suspicion, contact bases, and hearing verdicts worth replaying.
Generated choices can still invent more backstory than the player intended,
and the sparse wayfinding/world presentation reduce the immediate replay
pull.

Detailed live-evidence policy and prior runs remain in
[`../tech/verification.md`](../tech/verification.md).

### 2026-07-19 comprehensive review (latest)

**Review date:** 2026-07-19 (Asia/Seoul); independently re-examined and
corrected in place 2026-07-20 (subsection below)

**Reviewed state:** `codex/m3r-acceptance-corrections` at `5bfa637b`

This review supersedes the closeout judgment above without invalidating its
mechanical evidence. It asks whether the current branch is ready to close M3R
as the intended game: a small first-person town in which the player's actual
words and actions drive an inspectable LLM social simulation.

#### Review recovery and evidence boundary

The review began in Claude Code session
`efc1b7ef-f3b1-4bb2-9806-6c8d86cf5beb` and stopped only because that session
hit its usage limit. Its 16 child histories were recovered before work
resumed: thirteen completed normally; the Claude wrapper assigned the
historical digest died on the session limit with no recovered output, so the
prior-audit comparison in this review is review-session work rather than an
independently recovered artifact; one worker completed with an accurate
MCP-routing blocker report; and one fresh composition-capture worker was
genuinely interrupted before producing captures. The finished Godot-client
review, NPC-runtime review, game-craft research, and LLM literature research
were reused rather than repeated. A new native Godot AI worker then reran the
one missing lane: rendered play against the exact current checkout with the
live Qwen profile.

The combined proof checked was:

- exact branch `codex/m3r-acceptance-corrections` at `5bfa637b`;
- Godot 4.7 stable with Godot AI plugin/server 2.9.1 on the canonical project;
- `bun run --cwd backend/npc-runtime check`: 24 files and 258/258 tests passed;
- Godot headless import and the 19-scene fixture smoke passed;
- localization smoke failed with eleven reports, classified below as ten real
  parity failures and one stale test expectation;
- static source review of modal ownership, record inspection, context
  assembly, speaker attribution, hearing presentation, and provider fallback
  boundaries;
- prior complete ordinary, abnormal, hearing, provider-interruption, and
  six-locale rendered runs recorded above; and
- one fresh ordinary Korean Qwen-live traversal and conversation run. Fresh
  native IME, audible sound mixing, full hearing, and provider interruption
  were not rerun and remain prior-run evidence only.

No tracked implementation file was changed by the review. The worktree still
contained the owner's earlier `.codex/config.toml` change, five earlier
untracked transfer documents, and an editor normalization rewrite of
`godot/project.godot`; the latter must be deliberately restored or adopted
before implementation resumes and must not be committed accidentally.

#### 2026-07-20 independent re-examination

A second-model re-examination (Fable 5 lead; Codex artifact forensics; a
full sweep of all 26 recovered child reports) verified this review's
load-bearing claims against primary artifacts and corrected this section in
place:

- **The fresh run and its blocker are real.** The rendered-play worker
  transcript (Codex session rollout, 2026-07-19) preserves the exact
  per-round candidate sets and the full final provider audit for
  `run-75db41fb…`. Every audit number below reconciles exactly (57 calls,
  211,540 tokens, 52 resolutions, repairs at call sequences 13/31/37/44/47,
  zero failures or fallbacks, `allExpectedProfileLiveNoFallback=true`).
- **Blocker quantification.** In both post-honest-answer rounds, all three
  candidates asserted unsupported backstory; no candidate was non-assertive.
  The least-assertive round-two option repeated the summons premise already
  selected in round one rather than adding a new premise, so the precise
  blocker fact is: an unmarked unsupported assertion was unavoidable in every
  remaining selection. The contract licenses this: the envelope instruction
  permits even the safe slot "a modest cover claim", the uncertain/repair
  slot's hedging role is unvalidated guidance, and the grounding self-check
  explicitly exempts suggestions from the unsupported-claim scrub.
- **The localization reclassification is confirmed by commit archaeology.**
  The scaled-dialogue-controls commit deliberately suppressed the detached
  onboarding card, added inline `1–3` prefixes, and added a smoke assertion
  for the replacement — but never updated the older localization expectation.
  Process lesson recorded once: an acceptance claim must cite a check run
  performed after the last change touching the claimed surface; the stale
  "passes" statement above was recorded without rerunning the smoke after the
  Korean contact strings changed.
- **One reclassification softened.** The missed-ambient-subtitle finding is
  *likely fixed*, not proven fixed: the fresh run observed one ambient
  exchange at 9.65 m, but the earlier in-radius non-display anomaly at the
  park north edge (8.06 m, suspected audibility-volume/radius mismatch at the
  `AUD_PUBLIC_CENTER` boundary) was at a different spot and remains
  unrefuted. Re-observe at that boundary before calling it closed.
- **Findings restored from child reports** that the synthesis dropped are now
  in the table and slices below: the log-over-failure-modal draw-order gap,
  the client's silent default of unknown verdicts to `abnormal`, the fact
  that the interrogation subsystem has never fired in live play, the subtitle
  and text-scale numeric floors, and the concrete asset re-instancing list.

#### Verdict and fun gate

**Verdict: `NOT_READY` for M3R closeout. Keep the first-person LLM-town
direction.**

The architecture and world loop are real enough to continue. The milestone
must not close while an ordinary conversation can force the player to claim
events that never happened, because that breaks the central causal promise:
the society should judge what the player actually did and said. The strictest
finding is a core-loop integrity failure, not a request to return to 2D or to
replace the LLM simulation.

The fresh fun-gate answer was **no**. Interest briefly returned when an Office
conversation was overheard naturally, but the deciding moment came earlier:
after selecting the honest answer that the player did not understand the
procedure, every following generated choice asserted unsupported context such
as a booking, summons, evidence, consultation, or testimony. Conversation was
correctly fixed once started, but the remaining mandatory rounds provided no
honest grounded route. The fixed-conversation owner decision remains; the
repair is to guarantee player-voice integrity within those rounds, not to add
an early exit.

#### Fresh rendered run

- Run: `run-75db41fb-754d-41a6-8300-c1bb1bb6f079`
- Locale/provider: `ko-KR`, `modelscope/qwen3.7-plus`, HTTP live transport
- Route: park → Studio → park → Office → park → Station → park
- Runtime: 779 process seconds, 653 unpaused world seconds, 103.74 m travelled
- Provider audit: 57 physical calls, 211,540 charged tokens, 52 resolutions,
  52 runtime-trace entries, and five successful same-model repair calls
- Provider integrity: zero failed calls, fallback resolutions, dropped
  evidence, truncation, or in-flight remainder;
  `allExpectedProfileLiveNoFallback=true`
- Shutdown: game stopped cleanly; editor remained ready and helper not live

The run confirmed the corrections already landed on this branch. Toma moved
across the route and approached for contact; the Office ambient exchange
appeared naturally at a reported 9.65 m with correct speaker, direction, and
live-Qwen metadata; conversation provider-wait state was visible; control and
world time restored after dialogue; the Tab log exposed stance, provenance,
and the open question; and both 100% and 150% UI scales fit without clipping.
The prior audit findings for NPC approach, keyboard ownership during
interruption, and scaled dialogue controls must therefore remain classified
as fixed rather than being repeated as current defects; the missed ambient
subtitle is likely fixed but keeps the park-north-edge watch item recorded in
the re-examination above. The raw candidate sets and the complete provider
audit for this run are durably preserved in the 2026-07-19 Codex session
rollout, so stopping the warm sidecar loses no evidence.

#### Findings, strictest first

| Severity | Finding | Evidence and consequence | Confidence |
|---|---|---|---|
| Blocker | Generated suggestions can take authorship of the player's history. | The fresh Mira route made an unmarked unsupported assertion unavoidable in both post-honest-answer rounds (all three candidates asserted unsupported backstory; zero were non-assertive). This is licensed, not accidental: the envelope instruction allows even the safe slot "a modest cover claim", the uncertain/repair slot's hedging role is unvalidated guidance, and the grounding self-check exempts suggestions from the scrub ([`providers/envelope.ts`](../../backend/npc-runtime/src/providers/envelope.ts) suggestion guide, [`providers/service.ts`](../../backend/npc-runtime/src/providers/service.ts) `CONVERSATION_GROUNDING_SELF_CHECK`). Because only the selected or typed line becomes evidence, candidate generation may stay creative; it must not make unsupported speech unavoidable. | High, reproduced in rendered live play and verified against the raw run transcript |
| High | Player free text can spoof third-party NPC attribution. | [`providers/service.ts`](../../backend/npc-runtime/src/providers/service.ts) reparses strings matching `NPC_X: ...` as third-party speech, while [`runtime/run-service.ts`](../../backend/npc-runtime/src/runtime/run-service.ts) mixes player lines and NPC-prefixed ambient lines in one `heardSpeech` array. A typed player line can therefore corrupt who supposedly said what. | High, direct code path |
| High | Purely recent bounded context can evict pivotal early contact. | Several provider views use newest-first bounded selection. In a busy resident's history, an early player statement that established identity or purpose can be displaced by later ambient activity even though full run memory still exists. This risks an NPC appearing to forget the event the game asks the player to rely on. | High for mechanism, runtime frequency not yet measured |
| High | Provider-failure modal ownership is incomplete outside the already-proven route. | [`main_3d.gd`](../../godot/scripts/main_3d.gd) does not include provider-failure visibility in `_restore_player_control_if_unlocked()`, and presenting a failure does not itself release the mouse and disable world control. The HUD consumes remaining shortcuts, but input capture may still be wrong. | High static confidence; free-roam failure route needs rendered repro |
| Medium | The social climax is data-rich but presented as a summary dump. | [`hud_3d.gd`](../../godot/scripts/ui/hud_3d.gd) concatenates six testimonies, contact bases, evidence counts, and recap entries into one outcome body. The player can inspect the facts, but does not experience residents testifying one by one, so NPC memory and propagation are less legible than the underlying simulation. | High |
| Medium | Record inspection can hold a non-cancellable busy surface for about 27 seconds. | Three eight-second bridge attempts plus one- and two-second backoffs disable log closure while in flight. The operation is bounded but poor recovery for a non-terminal inspection. | High static confidence |
| Medium | Log and outcome surfaces can logically overlap the provider-failure modal. | Modal exclusivity is re-derived as visibility conjunctions at many call sites instead of one owner. Visual stacking is already correct — `ProviderFailurePanel` carries explicit `z_index=90` above `LogShade` (45) and `OutcomeShade` (65) — but `_set_log_visible` performs no provider-failure check, so a programmatic `open_log()` can open logically beneath an active interruption and take focus/input ownership while the failure modal still shows. The gap is state and input ownership, not pixels. | High static confidence, corrected 2026-07-20 |
| Medium | Exact localization acceptance is stale. | Korean contact strings added `{subject_particle}` while the other five locales did not (the underlying motivation is a real josa bug: the contact cue rendered "관리인가" where "관리인이" is correct). Ten placeholder-parity checks fail. The eleventh failure expects the detached dialogue onboarding card to be visible even though the current UI intentionally hides it because the actual choice buttons show `1–3`. | High, smoke rerun plus source inspection |
| Medium | The interrogation subsystem has never fired in live play. | Interrogation requires institutional pressure ≥ 90 while each administrative record moves pressure at most ±25 per distinct evidence root and conversations contribute zero ([`runtime/run-service.ts`](../../backend/npc-runtime/src/runtime/run-service.ts) `INTERROGATION_PRESSURE_THRESHOLD`, [`runtime/world/run-administration.ts`](../../backend/npc-runtime/src/runtime/world/run-administration.ts) `ADMIN_PRESSURE_DELTA_CAP`). At least four separate escalated record roots are needed in one short run. The mechanism is sound and fixture-proven, but a designed pillar — survivable interrogation with the hesitation timer — has no live evidence of ever firing; its acceptance boxes below are fixture-proven only. | High for mechanism; reachability unmeasured |
| Low reach / high impact | Legacy fallback metadata can open a modal with no action. | A compatibility route can set retry and restart false, after which both recovery buttons are hidden. Production fail-closed validation currently makes the path unlikely, but any reachable compatibility payload would trap the modal. | High static confidence, low production reachability |
| Low | Unknown verdict strings silently render as a loss. | `_refresh_outcome()` in [`hud_3d.gd`](../../godot/scripts/ui/hud_3d.gd) defaults any missing or unrecognized verdict value to `abnormal`. Runtime fail-closed validation makes this hard to reach, but on the authority boundary the client must never decide a verdict by defaulting; a malformed envelope should present as a contract interruption. | High static confidence, low reachability |
| Low | Jump succeeds physically but onboarding semantics miss it. | The fresh grounded jump reached `y=1.072` and landed correctly, while the onboarding snapshot still reported `jumpObserved=false`. This does not block movement but leaves tutorial state inaccurate. | High |

#### Player, world, UI, and presentation review

Movement speed and bounded mouse turning felt predictable. The small jump
worked and was not required for traversal. All three open portals were usable
without loading screens or arbitrary invisible walls. Studio exit required
backing out and realigning around the visible jamb, and Toma briefly obstructed
the route; these read as ordinary physical friction rather than broken
navigation. Residents moved, changed position, approached, and formed at least
one naturally audible meeting, so the town no longer felt empty.

The world still reads as a furnished prototype rather than one coherent place:

- the cyan ground and vegetation are harsh and oversaturated;
- repeated bushes and props are evenly scattered instead of forming readable
  anchor-and-supporter clusters;
- Studio is warm and occupied but reads more like a generic lounge than a
  studio;
- Office is legible at close range, but tree canopy partly hides its sign;
- Station has the strongest institutional identity, while oversized furniture,
  a bright ceiling hotspot, and a dead blue-grey wall weaken its interior;
- signs, NPC roles, and local color do more identity work than building
  silhouette; and
- the initial objective, onboarding, and status HUD divide attention across
  three screen regions, while the Tab log repeats enough explanation to become
  text-dense.

Text presentation gets numeric floors, not adjectives, so the composition
slice has acceptance anchors: subtitles at or above ~46 px at 1080p with the
existing user scale on top; one subtitle line capped near 40 Latin characters
or 16 full-width Korean characters with the renderer owning the line budget;
ambient subtitle duration computed from locale reading speed (Korean ~12
characters per second, not the English 17–20); and every HUD surface must
reflow rather than clip at 200% text scale — retrofitting reflow later is a
layout-architecture change, so it lands with the HUD-hierarchy work.

The current asset library is sufficient for the next visual slice: all 64
committed model files are already instanced somewhere, so another asset pack
would add selection and coherence cost without solving the observed problem.
Reuse and reposition the existing models. Concrete single-instance pieces with
headroom for re-instancing: `road_straight`, `road_intersection`, `table_low`,
`table_medium_long`, `couch_pillows`, `lamp_standing`, the KayKit decorated
shelves and cabinets, the prototype pallets and decorated table, and the city
cars/traffic light (currently ×2 each) — against `plant_bush ×55` and
`trash ×42` doing most of the current filling. Establish one lower-saturation
palette and matte material range; compose props as one anchor plus two or three
supporters; preserve paths and meeting space; strengthen Studio, Office, and
Station entrance silhouettes; keep Station visible as the civic landmark; and
make warm occupancy lights follow schedules instead of reading as uniform
always-on illumination.

The hearing should reuse its existing validated data rather than add provider
calls: reveal each resident, that resident's contact basis, one attributed
memory or lack of contact, the testimony and resulting stance, then the final
verdict and recap. This converts the same result from a report into the
player-visible social procedure promised by the milestone.

#### LLM architecture judgment after literature review

The review supports the current large decisions:

- **Keep:** event-driven scheduling, ordered attributed memory, deterministic
  validation and clamping, sight/context separation, utterance-only NPC
  propagation, one merged foreground judgment/reply call, stateless per-call
  context reassembly, and one same-model repair followed by visible
  fail-closed interruption. These choices avoid the cost and provenance
  failures documented by [Generative Agents](https://arxiv.org/abs/2304.03442),
  fit [CoALA](https://arxiv.org/abs/2309.02427) as an audit taxonomy without
  treating every taxonomy box as required infrastructure, and keep arbitration
  stricter than an LLM Game Master such as
  [Concordia](https://arxiv.org/abs/2312.03664).
- **Adapt:** make evidence identifiers precede fact-asserting prose; carry
  structured speaker identity instead of parsing strings; prioritize pivotal
  and unresolved player-contact memories within the bounded context; add
  explicit sequence/supersession metadata; and keep testimony in first-person
  contact terms. Grounding research such as
  [FaithDial](https://arxiv.org/abs/2204.10757) and
  [AIS](https://arxiv.org/abs/2112.12870) supports machine-checkable attribution
  over prompt-only requests to stay faithful.
- **Reject for this scale:** vector retrieval, reflection and summarization
  loops, persistent per-NPC chat sessions, a second LLM Game Master, scale
  machinery for distant agents, additional agent tiers, and a new asset pack.
  The 20–60 minute, six-resident run is far below the scale motivating those
  systems, while [LongMemEval](https://arxiv.org/abs/2410.10813) and
  [LoCoMo](https://arxiv.org/abs/2402.17753) show that temporal and
  mid-context reasoning can fail even before nominal context capacity is the
  problem. Broad tolerant parsing is also rejected: the one repair may include
  the validator error and failed output, but ambiguous content must not be
  coerced into apparently valid social state.

#### Restart order

Plumbing pointers for a fresh session (the linked originals stay
authoritative — do not copy their content here): locale content lives in
`godot/content/localization/m3r_*.json`; the smokes are
`godot/tools/localization_smoke.gd` and `godot/tools/scene_load_smoke.gd`;
backend tests live in `backend/npc-runtime/test/integration/` with the
scripted no-live-call adapter at
`backend/npc-runtime/src/providers/testing/scripted-npc-adapter.ts`; exact
smoke command lines, sidecar launch, and the live-Qwen run recipe are
maintained only in [`../tech/verification.md`](../tech/verification.md).

Before the first playable slice, perform one bounded worktree and localization
cleanup:

1. Restore the editor-only `project.godot` normalization unless its removed
   explicit settings are deliberately adopted after review.
2. Replace the Korean-specific placeholder mismatch with one locale-aware
   semantic value. The current broken state is a ko-only `{subject_particle}`
   token in the two contact-cue strings, absent from the other five locales.
   Rename it to one `{speaker_subject}` placeholder present in all six
   `godot/content/localization/m3r_*.json` files: the Korean template
   resolves it with `이/가` through the existing `korean_particle` helper
   (`godot/scripts/localization/localization.gd`, formatted in
   `godot/scripts/ui/hud_3d.gd`), while other locales receive the unmodified
   speaker name through the exact same placeholder contract.
3. Fix the stale onboarding expectation inside the localization smoke
   (`godot/tools/localization_smoke.gd`): require actionable inline `1–3`
   controls while accepting the intentionally hidden detached conversation
   card. The 150%-scale inline-prefix assertion already lives in
   `godot/tools/scene_load_smoke.gd`; do not confuse the two files.
4. Rerun localization smoke before claiming exact six-locale parity.

The first playable slice is **player voice and provenance integrity**:

1. Add evidence IDs and `introducesNewClaim` to each generated player reply.
2. Define "new claim" against a precise baseline: anything not supported by
   in-run events, visible context, **or the player's own prior selected or
   typed statements**. A selected cover story is part of the player's record;
   a candidate that consistently repeats it is roleplay, not a new claim (the
   fresh run's round-two repeat of the selected summons premise is exactly
   this boundary case). A partial restatement that embellishes the
   established premise with new unsupported detail is a new claim.
3. Hang the constraint on the already-validated intent triple: the envelope
   validator deterministically enforces exactly one safe/local, one
   uncertain/repair, and one risky/weird candidate today, so add per-slot
   constraints there — the uncertain/repair slot must always be non-assertive
   (`introducesNewClaim=false`), the safe/local slot must cite existing
   evidence IDs or be non-assertive, and at most the risky/weird slot may
   carry one explicitly marked new claim.
4. Treat a set violating those constraints as invalid: use the existing single
   same-model repair, then visibly interrupt if it remains invalid. Do not
   author a deterministic replacement line.
5. Amend the licensing wording at both ends so the spec stops inviting the
   bug: the envelope suggestion instruction ("safe/local … may use a modest
   cover claim") and the same sentence in the answer-surface spec of
   [`../game/core-loop.md`](../game/core-loop.md). Cover claims stay legal
   only in the explicitly marked new-claim slot; otherwise a faithful
   reimplementation of the current wording recreates the blocker.
6. Render the optional new-claim choice with a localized `새 주장` label so
   the player knowingly chooses to establish new backstory.
7. Replace reparsed `heardSpeech` strings with typed speaker/source records.
   Player free input remains player-authored regardless of its text.
8. Prioritize first contact, stance-changing contact, cited contact, and
   unresolved questions inside bounded provider memory without adding vector
   retrieval or another model call.

Be honest about the enforcement boundary: `introducesNewClaim` is
self-labeled, so the deterministic layer can verify labels, per-slot counts,
and that cited evidence IDs exist — the semantic match between a candidate's
prose and its label stays model-judged. The label's value is that violations
become visible and attributable instead of silent; do not claim
machine-proof grounding in acceptance evidence.

That slice is accepted only when one deterministic contract test plus a fresh
live-Qwen run prove all of the following:

- (contract test, test adapter, no live calls) the envelope validator rejects
  a candidate set whose every member introduces a new claim, rejects an
  unmarked new claim in the uncertain/repair slot, and accepts a compliant
  set — the Detroit-style check that protects this player-visible consequence;
- a player can complete the fixed three-answer conversation using only honest,
  grounded, uncertainty, or repair choices — a structural property the
  per-slot constraints must guarantee for every conversation, demonstrated in
  this one run, not a lucky route;
- entering `NPC_Park_Caretaker: ...` as free text is still stored and later
  cited only as a player statement;
- an unselected new claim enters no memory, record, stance reason, or hearing
  evidence;
- a selected, visibly marked new claim enters as player-authored evidence;
- the path adds no normal provider call and preserves the one-repair
  fail-closed contract; and
- the honest fun question is specifically: "Did the game offer intentions I
  could choose, or did it put words in my mouth?"

Subsequent slices, in order, are:

1. **one UI-mode owner and failure recovery.** A single modal-mode owner
   replaces the per-site visibility conjunctions, with exclusivity backed by
   construction (draw order or a single mode enum), so `_set_log_visible` and
   every future surface cannot draw over an active interruption; free-roam
   provider failure releases the mouse and restores input ownership; at least
   one recovery action exists on every reachable failure surface (including
   the legacy-metadata route); unknown verdict payloads present as a contract
   interruption instead of defaulting to `abnormal`; and record inspection
   becomes cancellable or far more tightly bounded than ~27 seconds;
2. **the stepwise Station testimony procedure** using existing assessment and
   recap data, with no additional provider call: reveal each resident, their
   contact basis, one attributed memory or the honest lack of contact, the
   testimony and resulting stance, then the verdict and recap;
3. **the existing-asset composition pass** for palette, prop clusters,
   building silhouettes, Station landmark strength, occupancy lighting, and
   HUD hierarchy — judged against the numeric subtitle and 200%-reflow floors
   recorded above, and starting from the re-instancing candidate list rather
   than a new pack; and
4. **measurement and tuning last.** Measure suspicion/pressure trajectories
   across real runs and answer one specific question: can any plausible run
   reach the 90 interrogation threshold under the ±25-per-root record cap
   with conversations contributing zero? If not, tune the threshold or
   accrual until the designed survivable-interrogation pillar can actually
   fire, then Korean character few-shots and role guards, and a concise
   player-visible belief-change cue.

Deferred low-priority backend cleanup, bundled into whichever slice next
touches the files: resolve or expire cross-session open questions that
linger in `socialView`; stop double-counting heard lines that appear in both
`ownActionNotes` and `heardSpeech` within one packet; and note that
`/v1/run/snapshot` exposes full actor memories to any local client (fine for
a local debug surface, worth a comment so it never ships outward
unfiltered).

M3R remains active until the blocker slice, failure-recovery correction,
stepwise hearing presentation, and one existing-asset world-composition pass
land and the resulting build receives a fresh ordinary-route fun answer. This
is a correction of the active milestone's promised experience, not new M4
scope.

### Remaining owner checks

The comprehensive review supersedes the earlier statement that only owner
checks remained. Do not add another tracker, harness, or evidence system;
update this dated section and the checklist in place as each corrective slice
lands.

1. In a native window, use the operating system's Korean, Simplified Chinese,
   and Japanese IMEs in the conversation `LineEdit`. At both 100% and 150%,
   observe preedit, commit one reply, and confirm that the committed text is
   neither clipped nor corrupted and reaches Qwen exactly once. Godot AI
   Unicode injection and already-finalized text do not count.
2. Rerun the player-voice/provenance route, free-roam provider failure, and the
   stepwise hearing presentation after their corrective slices. The ordinary
   route must end with a fresh fun-gate answer; prior runs remain regression
   evidence but cannot close the new blocker.
3. The owner reviews that corrected build and may supersede the **no** fun
   answer recorded in this review. Closing M3R and opening the branch's PR to
   `main` remain owner decisions. Until then, leave M3R active.

## Acceptance

- [x] First playable proof (above) holds in a live run.
- [x] The park-idle test: stand still in the park for two minutes of world
      time — at least one NPC-to-NPC conversation occurs within potential
      earshot, its validated utterances enter the actual listener's attributed
      memory, and schedule/hearing time advances. If stance moves, the player
      can later trace `speaker → listener → source memory → why`; if it does
      not, that no-change judgment is visible in diagnostics. Waiting was not
      free because no vouch can be earned without firsthand conversation and
      a meeting window was spent.
- [x] Walking from park into all three interiors and back crosses no loading
      screen and no invisible wall that reads as arbitrary.
- [x] A full run is completable both ways: hearing passed (classified
      ordinary, with four evidenced vouches) and hearing failed (definitive
      verdict), inside one sitting. No pre-hearing interrogation ends the run.
- [x] Interrogation before the hearing remains survivable by argument, and
      an in-run recovery path visibly lowers a wary NPC's suspicion.
      (Fixture-proven only: no live run has ever accumulated the 90 pressure
      needed to trigger interrogation — see the 2026-07-19 findings table and
      the measurement question in the restart order.)
- [x] During ordinary exploration, no provider call blocks the player except
      the merged judgment+reply call. The already-staged terminal hearing may
      block once on its final model judgment. Ambient calls never pause free
      exploration, stale results cannot mutate a newer world revision, and
      any result completed during the player's modal pause waits to apply
      until resume.
- [x] Provider-call accounting shows event-driven wake-ups only — zero
      per-tick provider calls; a full run stays inside the configured
      call/token budget.
- [x] Each hearing assessment declares the exact memory-derived contact basis:
      meaningful firsthand, limited direct conversation, or never conversed.
      The player sees that validated basis beside the model's testimony, whose
      live wording stays consistent with it; attributed ambient memory may
      still support oppose or uncertain, but never a vouch.
- [x] Every off-screen stance/record change the player encounters arrives with
      its allowed provenance (who spoke or wrote, who heard or read, source
      memory, and why), while the open-questions surface reveals only content
      the player has actually encountered.
- [x] No timer exists outside Station interrogation; interrogation allows at
      least 40 seconds. (Fixture-proven only, same caveat as above.)
- [ ] Provider failure visibly interrupts the exact operation, applies no
      substitute social/world event, preserves exact retry, and allows an
      explicit clean-run restart without pretending the hearing completed.
      The previously rendered conversation and hearing interruption routes
      passed, but the 2026-07-19 static review found unresolved free-roam
      mouse/control ownership and a latent action-less compatibility modal;
      close this only after the reachable surfaces are corrected and rerun.
- [x] Every LLM-backed acceptance and fun-gate run is driven by GPT-5.6 Sol
      ultra through Godot AI with the Qwen profile pinned, and the resulting
      packets show `profileId=modelscope/qwen3.7-plus`, `transport=live`, and
      no provider interruption. Fixture/scripted checks remain valid engineering
      evidence but do not prove the LLM game experience.
- [ ] `ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP` each pass exact
      player-facing key and placeholder parity, show no raw localization key,
      preserve readable glyphs/layout at 100% and 150% UI scale, and accept
      Korean/Chinese/Japanese IME composition where text entry is offered.
      Each locale completes one bounded Qwen-live opening → answer → why-line
      plus provider-interruption language check; six full 20–30 minute runs are not
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

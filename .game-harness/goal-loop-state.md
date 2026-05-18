# Goal Loop State

Last Updated: 2026-05-19
Mode: lightweight Ralph-style persistence
Status: active-local-work; Codex thread goal may report paused, but repo work
continues from this state file until the external blocker is resolved.

## Why This Exists

Prior harness work shows useful long-running-agent habits: keep a prompt, a
task list, a resumable state file, logs/evidence, and clear exit gates. Dream
of One does not need a copied `.ralph/` system. The current `.game-harness/`
already does that job, so this file is the compact resume point for long Codex
passes.

## Read First On Resume

1. `.game-harness/active-goal-prompt.md`
2. `.game-harness/playable-goal-reference.md`
3. `.game-harness/goal-loop-state.md`
4. `.game-harness/continue-here.md`
5. `.game-harness/tasks.md`
6. `.game-harness/verification-ledger.md`
7. `.game-studio/project-state.md`
8. `AGENTS.md`

## Current Objective

Finish the current small proof toward an open-environment, conversation-first
NPC social simulation. The player is examined through speech, hesitation,
repair, and records. `Same Order` in Store/Station is only an ultra-small
sample for proving the pattern; it should not become the product center or the
default backlog.

The priority is game substance first. Each autonomous pass should improve the
actual intended game when a concrete gap is visible: a clearer role action, a
more readable consequence, a stronger environment affordance, or a smaller
playable social reaction. Tests, AI-play probes, session helpers, and evidence
ledgers are support work. They should stay as narrow as needed to protect the
implemented game change and must not become the main product.

The intended game is an open social field, not a Store/Station simulator.
Current Store/Station work should remain deliberately cheap: a small sample
with obvious props, blunt records, and even child-simple economy values is
acceptable if it proves NPCs can use environment affordances and social records
without bespoke reaction branches.

Keep an AI-play QA interface as part of the objective. Codex should be able to
play the current proof cell through stable action/snapshot APIs, inspect the
same HUD/world/ledger/NPC state a player would use, and produce a readable run
artifact before human testers are asked to judge the build. This is development
infrastructure for an AI-built game, not a substitute for external
comprehension notes. Any new player-facing feature should be exposed through the
action catalog, typed-action path, snapshot, and report artifact quickly enough
that Codex can check it by playing rather than by reading private code.
Every playable increment should therefore leave behind a working AI-play path:
callable actions, player-visible snapshot, role/action consequence, and a
readable run artifact. If that path breaks or cannot explain the new slice from
the player point of view, fix it before broadening the design.
This play-based interface is higher leverage than extra test code for most
game-feel and comprehension questions. Keep tests lean and reserve them for
deterministic authority, schema compatibility, provider boundaries, route
evidence, and known regressions; use Codex-run gameplay probes as the fast
default check for whether the game can actually be played, inspected, and
explained.

## Current Blocker

External fresh-player comprehension notes are still missing. Current raw manual
session count is `0 / 3`, so product closure remains blocked even though
backend, Godot, visual, Codex gameplay QA, export, and packaged route proofs
are current.

Latest completion audit:
- objective mapped to artifacts: open-environment social-sim guidance and
  Store/Station-as-sample framing are current in `AGENTS.md`,
  `.game-harness/playable-goal-reference.md`, `.game-harness/active-goal-prompt.md`,
  and `.game-studio/project-state.md`; current environment/tool affordance
  proof is carried by the playable slice Evidence Pack, Codex gameplay probe,
  and packaged-route evidence.
- latest Codex gameplay QA artifact reports `ok=true`,
  `aiPlayerReport.pass=true`, 31 accepted public actions, 5/5 route reports,
  all 36 explainability flags true, `canReadEnvironmentToolCatalog=true`,
  `canReadVisibleNpcRoleTints=true`, `canReadVisibleNpcSourceToken=true`,
  `canReadVisibleSocialInfluenceLink=true`, and no-live provider packet
  readiness for bounded `actorMemory` plus `actorPolicy`. It now also proves
  Codex/player can read the Store Clerk's
  visible environment cues in the live prompt before choosing speech, then
  inspect Store Clerk as the record-making NPC, Store Manager as the
  organizational handoff actor, Park Witness as the public-spread actor,
  Station Officer as the authority actor, and Studio PM as the cross-place
  opportunity actor. Store Manager inspection now names `관리 처리` labels for
  either local service pause or Station-readable report handoff; Studio PM
  inspection names `기회 변화` labels for opening, limiting, delaying, or closing
  the tiny review opportunity from public records; the Witness inspection names
  the Clerk note, Park notice board target, public-spread readers, and spoken
  rumor line; the Officer inspection names the cited Store Manager ledger,
  Station document target, `대상=플레이어`, comparison focus, inquest authority,
  visible environment context, and spoken intake line before downstream NPC
  reactions. Waiting Customer inspection now also shows `오간 말` social
  exchange lines and exports `socialExchangeLines`, so the player/Codex can
  read the Station Officer -> Waiting Customer spoken exchange behind contact
  refusal. The Waiting Customer world marker now also names the social source
  action as `← 스테이션 직원 · 기록 인용`, so the player can read who caused the
  refusal and which role action caused it before opening any detail panel.
  The 3D NPC placeholders now also carry distinct role tints for Store Clerk,
  Store Manager, Waiting Customer, Studio PM, Park Witness, and Station Officer,
  so the player can recognize the small social field by actor role before
  opening inspection panels. Reacting NPCs now also carry a small source token
  colored from the observed actor role; in the inquest path, the Waiting
  Customer refusal carries a Station Officer token tied to `cite_record`.
  The scene now also draws role-colored NPC-to-NPC influence links from the
  observed/source actor to the reacting actor; in the inquest path, Codex/player
  can read `NPC_Station_Officer -> NPC_Waiting_Customer` for
  `cite_record -> refuse_contact` before treating the refusal as social state.
  Latest Codex gameplay artifact SHA-256:
  `389d09d1fcff230e1d3fa2114d1924e7985d42e8d36120d9e16da941e962e6ec`.
  It also explicitly marks itself as not a replacement for external
  comprehension.
- latest packaged-route evidence validates as a Godot Evidence Pack and
  conversation/suspicion proof for the single `inquest_opened` route with
  `packagedRouteSmokeProof=true`, `fallback_only_m1`, and
  `canReadEnvironmentToolCatalog=true`.
- strict raw-note review still returns `PENDING_TESTER_NOTES` with manual
  session count `0`; `.game-harness/scripts/run-same-order-comprehension-session.sh
  --status` now loads the ignored Ubuntu ARM device env and reaches packaged
  app preflight plus Codex QA setup pass.
- Linear SoT check on 2026-05-18 found no open issue for
  `GI-04 external comprehension Same Order fresh-player PENDING_TESTER_NOTES`
  or `fresh-player comprehension Same Order`. A later tool-discovery check did
  expose a Linear issue-create action, but the connected account rejected the
  create request with `Invalid scope: write or issues:create required`.
  `LINEAR_API_TOKEN` is also unset for GraphQL fallback. Create or link the SoT
  issue from a session with Linear create permission before treating GI-04 as
  properly routed.
- A later broader Linear check also found no open issue for `Same Order` or
  `fresh player comprehension tester notes`. Recent ticket lookup confirmed
  the repo's Linear team is `Dream-of-one` with key `DRE`; create the GI-04
  issue there, letting Linear assign the identifier.
- Linear label/state lookup found existing DRE labels `codex-managed` and
  `agent:codex`; `needs:godot-local` was not found and should not be invented.
  Suggested initial state for the future GI-04 issue is `Backlog`.
- A copy-ready Linear draft now lives at
  `.game-harness/linear-issue-drafts/gi-04-external-comprehension-fresh-player.md`.
  It is not the SoT issue; it exists only so a future session with Linear
  create permission can make the issue without redoing the blocker analysis.
- conclusion: do not add another internal helper, route, or proof just to show
  activity. The next required evidence is an observed fresh-player session and
  accepted direct-note review, which is outside Codex-only control.
- refreshed audit record:
  `.game-harness/goal-completion-audit-2026-05-18.md` maps the active goal to
  concrete artifacts after the budgeted two-actor live provider proof and the
  refreshed Codex gameplay probe. Verdict remains NOT COMPLETE because raw
  fresh-player session notes are still `0 / 3`.

Latest Ubuntu ARM environment setup:
- `.game-harness/scripts/run-same-order-comprehension-session.sh` now accepts a
  per-device executable launcher as `DREAM_OF_ONE_APP_PATH`, not only a macOS
  `.app`, and uses portable file mtime checks for macOS/BSD and Linux/GNU
  `stat`.
- The helper auto-loads an ignored repo-local device env file from
  `build/dream-of-one-local-env.sh` when present. Keep machine-specific paths in
  that ignored file or explicit environment variables, not tracked docs.
- On the Ubuntu ARM server, a local ignored PCK, executable launcher, and
  packaged-route evidence were generated under `build/ubuntu-arm/`.
  `.game-harness/scripts/run-same-order-comprehension-session.sh --preflight`
  passes, and `--status` now reaches the expected fresh-player gate summary:
  raw notes `0 / 3`, strict review `PENDING_TESTER_NOTES`, Codex QA setup
  proof pass, and next action `run an observed fresh-player session now`.
- Local display setup on this Ubuntu ARM server now has a managed
  Xvfb/fluxbox/x11vnc/noVNC path through
  `.game-harness/scripts/run-local-display-session.sh start|status|stop`.
  The noVNC listener binds to localhost. Current proof shows
  `Human play display: ready: X display :99 is present`, noVNC serves
  `vnc.html`, and the packaged app reaches the Godot GUI on that display under
  a timeout launch. A local screen proof in
  `build/display-session/same-order-display-proof.png` captured a 1280x720
  nonblank root window with grayscale mean `21349.3`. Observed human play still
  requires a fresh tester and an explicit secure access path to the localhost
  noVNC endpoint, such as an SSH tunnel.

Latest environment/auth awareness note:
- Current work is on a headless Ubuntu ARM/aarch64 server, so future agents must
  check OS, architecture, display availability, `GODOT_BIN`, Node/npm, and
  required runtime env vars before assuming a desktop build or macOS app path.
- `codex-cli 0.130.0` is installed locally and `codex login status` reports
  ChatGPT login. This is useful for agent work and possible future local
  `codex-cli` provider experiments, but it is not an OpenAI API key and must
  not be treated as the existing `openai-api` runtime credential.
- The Codex CLI runtime-auth assessment lives at
  `.game-harness/provider/codex-cli-auth-runtime-assessment-2026-05-18.md`.
  Current product truth remains `fallback_only_m1`; a Codex-auth-backed game
  path would require a separate provider mode, preflight, schema validation,
  timeout/failure handling, deterministic fallback, and fresh proof.

Latest OpenAI Codex provider note:
- Direct `openai-codex` backend live proof now passes through the ignored
  auth-profile store created by `npm run openai-codex:login --prefix
  backend/npc-runtime`.
- Runtime defaults stay fixed to `gpt-5.4-mini`, low reasoning effort, and no
  model fallbacks. API nano models are still not assumed available through the
  Codex provider catalog.
- The one-call live smoke passed with estimated cost `$0.00360825` and returned
  usage 513 input / 230 output / 743 total tokens.
- The two-NPC backend live social probe passed under a `$0.01` total estimated
  cap with summed estimated cost `$0.00732675` and returned usage 1,126 input /
  425 output / 1,551 total tokens.
- Godot live PlayableSession route-context dispatch now also passes through
  `godot/tools/live_provider_dispatch_smoke.gd` against a local backend on
  `127.0.0.1:8787`. It drove `main.tscn` through
  `PlayableSession.debug_codex_gameplay_action`, built live provider packets
  from the running route state for `NPC_Store_Clerk` and
  `NPC_Waiting_Customer`, and now passes the Store Clerk live utterance into
  the Waiting Customer packet as an observed `live_utterance:*` event. It
  selected `gpt-5.4-mini`, used no fallback, capped each request at `$0.01`,
  kept the two-request total estimate under `$0.01`, and returned total usage
  of 2,296 input / 449 output / 2,745 total tokens with total estimated cost
  `$0.00844875`. The artifact includes the concrete Waiting Customer
  `recentEvents` and `proofs.npcToNpcLiveObservationEvent`, so the observed
  Store Clerk live line is auditable from the JSON itself. It avoided route
  mutation and continued the deterministic fallback path to
  `routeOutcome=clean_cover` and `sessionOutcome=cover_held`. It wrote
  `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json`
  with SHA-256
  `035a1ec3044a070001b0afbb5a31d2acdb2c5e734be1dccc68321c71a7c74df0`.
  A prior attempt in this slice timed out on the Waiting Customer call under
  the default 8-second deadline after one successful Store Clerk call; that
  successful call spent estimated `$0.00433725` and returned 1,290 input / 230
  output / 1,520 total tokens.
- ChatGPT Pro remaining quota was not exposed by these Codex Responses, so
  future work must track request count, fixed model, reasoning effort,
  estimated caps, fallback status, and returned token usage instead of claiming
  remaining subscription quota.
- This is backend live text-proposal proof plus two proof-only Godot
  PlayableSession route provider dispatches with fallback parity. Godot
  HUD/Evidence product truth remains `fallback_only_m1` until a later decision
  exposes live wording as a player-visible mode and records that usage in
  playable Evidence.
- Role-voice policy now distinguishes NPC role voice from player choices before
  the live request. The refreshed Waiting Customer live line was bounded,
  role-anchored, and based on an observed Store Clerk live utterance:
  `줄은그대로네요.`
- Same-session NPC memory/thread continuity is now covered for the actual
  `openai-codex` Godot route with local backend-owned workspace memory. The
  default remains `storeResponses=false`; the Codex endpoint rejected
  `storeResponses=true` during live probing, so the safe working route is
  stateless provider calls plus the repo-local workspace summary/memory in the
  next prompt, not provider-stored `previous_response_id`.
- Latest backend check after that contract: `npm run check --prefix
  backend/npc-runtime` passed with 141 tests. The backend tests prove the
  second same-session/same-NPC `openai-codex` call uses `transport=codex-reply`,
  keeps `gpt-5.4-mini`, low reasoning, streaming enabled, `store=false`, and
  carries prior `WorkspaceArtifacts` into the second prompt. They also verify
  the checked-in Godot live dispatch artifact carries both NPC decisions, the
  concrete `npcToNpcLiveObservationEvent`, and the Waiting Customer provider
  packet `recentEvents` containing that observed Store Clerk live utterance.
- Godot live continuity proof now passes through
  `godot/tools/live_provider_thread_continuity_smoke.gd`. It drove
  `main.tscn`, called `NPC_Store_Clerk` twice with the same session id, and
  received `transport=codex` then `transport=codex-reply` without fallback or
  route mutation. Final passing artifact:
  `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_thread_continuity_smoke.json`
  with SHA-256
  `69a2bc0ff0389ffe77ba61ffa922ddc30a1529710fd42a101d15f2472923ec3e`.
  Final run estimated cost `$0.008913`, actual usage 2,975 input / 424 output /
  3,399 total tokens. This slice also spent one earlier successful first-call
  probe before revealing the failed provider-stored reply path: estimated
  `$0.00433575`, actual usage 1,289 input / 263 output / 1,552 total tokens.
  Total live spend observed during this slice: estimated `$0.01324875`, actual
  4,264 input / 687 output / 4,951 total tokens. ChatGPT Pro remaining quota
  remains not exposed by the response.
- `npm run openai-codex:usage --prefix backend/npc-runtime` now reports
  checked-in provider-ledger and Godot live artifact usage without calling the
  provider. Latest pass reports `spendsLiveBudget=false`, model
  `gpt-5.4-mini`, low reasoning, 9 recorded returned-usage calls, total
  estimated cost `$0.03696975`, and actual usage 9,489 input / 2,021 output /
  11,510 total tokens. ChatGPT Pro remaining quota is still not exposed by the
  Codex responses.
- 2026-05-19 OpenClaw refresh: cloned/reviewed `~/git/openclaw` at commit
  `4af590a5` and confirmed the relevant pattern is direct `openai-codex`
  provider/auth/transport, not `codex exec` or OpenClaw's chat runtime. Current
  local auth was checked without starting a login flow: Codex CLI reports
  ChatGPT login, and `build/provider-auth/openai-codex-auth.json` contains an
  unexpired `default` OAuth profile with access and refresh tokens. Live
  `gpt-5.4-mini` smoke passed with no model fallbacks, low reasoning, estimated
  cost `$0.00384675`, actual usage 707 input / 258 output / 965 total tokens,
  and no deterministic fallback. Detailed note:
  `.game-harness/provider/openai-codex-provider-verification-2026-05-19.md`.

Latest status check:
- command: `.game-harness/scripts/run-same-order-comprehension-session.sh --status`
- result in this local shell: pass after loading the ignored Ubuntu ARM local
  env file and checking the local executable launcher plus route evidence.
  Status now reaches the external gate summary instead of stopping on missing
  `DREAM_OF_ONE_APP_PATH`.
- last recorded packaged-preflight result remains pass; strict review remains
  `PENDING_TESTER_NOTES`.
- packaged evidence: tester-ready, `stage=inquest`,
  `providerState.mode=fallback_only_m1`, typed input yes, response hesitation
  yes, live HUD record-chain proof yes, outcome-chain proof yes, civic economy
  proof yes.
- raw session note files: `0 / 3 minimum`.
- session setup now prints Codex route reports for clean cover, repair recovery,
  suspicious cover, soft report, and inquest in the facilitator pack, worksheet,
  and generated session kit README, while still marking that proof as setup-only.
- generated session kits now require the Codex gameplay QA status to pass and
  copy facilitator-only snapshots of the current Codex JSON/Markdown reports
  into the kit as `codex-gameplay-probe.json` and
  `codex-gameplay-report.md`.
- generated session kits now also include `session-kit-manifest.json`, a
  machine-readable setup binding with app/evidence paths, hashes, copied Codex
  QA artifacts, 5/5 Codex route reports, `humanEvidence=false`, and
  `closesGoal=false`.
- session kits can now be checked with
  `.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <dir>`,
  which verifies required files, copied Codex artifact hashes, required Codex
  player action catalog entries, copied-probe schema/API/report flags, manifest
  action/route data against the copied Codex JSON, 5/5 route reports,
  `humanEvidence=false`, `closesGoal=false`, and a no-spoiler tester invite.
- latest local facilitator handoff kit:
  `build/same-order-session-kit-current` was regenerated and verified after
  the refreshed Codex gameplay QA artifact. Its manifest keeps
  `testerFacingFiles=["tester-invite.md"]`, `humanEvidence=false`, and
  `closesGoal=false`; it is setup material only, not comprehension evidence.
- latest Codex gameplay QA hashes:
  - JSON SHA-256: `389d09d1fcff230e1d3fa2114d1924e7985d42e8d36120d9e16da941e962e6ec`
  - Markdown SHA-256: `598eaf4855cc141ff395798cbdca8906ec96527d15e9526b755cf67365229558`
  - playable Evidence Pack SHA-256: `8cbcd341ca72f9a4e4edc8be62db42de9254e3e29b49f89165ea2d0c395987dd`
  - visual capture manifest SHA-256: `00acafaeaad0e466b9a28fcf55e32b18b4641096b2bd1d0f261a43b3ef9033eb`
  - packaged app zip SHA-256: `73eac5d69492f5a01355346ef86ef2acb5a1e07b0e37a104c878580d83d9b1c3`

Latest AI-play interface check:
- command: `$GODOT_BIN --headless --path godot --script res://tools/codex_gameplay_probe.gd`
- result: pass, `aiPlayerReportPass=true`, `stage=inquest`, accepted public
  player actions `31 / 31`, `explainability=36/36`, conversation visible
  context in the live Store Clerk prompt, Store Clerk record-action inspection,
  Store Manager handoff inspection, Park Witness public-spread inspection,
  Station Officer authority-citation inspection, Studio PM cross-place
  opportunity inspection, Waiting Customer social-exchange inspection, live HUD
  `오간 말` social exchange readability, visible NPC reaction source
  readability, visible NPC-to-NPC influence-link readability, actor memory for observed NPC
  decisions, no-live provider packet memory and actor-policy readiness, and
  `routeReportPassCount=5 / 5` with Godot
  `4.7.beta2.official.777579205` from local `GODOT_BIN`.
- latest game increment: visible NPC reaction markers now show which role action
  caused the current social reaction. In the inquest Codex run, the Waiting
  Customer's world marker reads `접촉 거부` plus `← 스테이션 직원 · 기록 인용`,
  while the HUD stance summary still uses the compact base reaction text.
  Codex gameplay QA now requires `canReadVisibleNpcReactionSource=true` with
  both the source role and action.
- latest game increment: the live HUD record line now includes `오간 말`, a
  compact NPC-to-NPC spoken exchange next to the existing ledger and stance
  summary. In the inquest Codex run, the final HUD record line reads
  `스테이션 직원 -> 대기 손님: 스테이션이 인용했으면 저는 말 섞지 않겠습니다.`
  so the player can observe the social refusal without opening the NPC detail
  panel. Codex gameplay QA now requires `canReadLiveHudSocialExchange=true`.
- latest game increment: the live Store Clerk conversation prompt now exposes
  `보는 단서` before the player chooses speech. The prompt names the Clerk's
  relevant visible context: `상점 카운터=응대 중`, `늘 같은 주문=읽힘`,
  `보고 트레이=비어 있음`, and `시민 경제=안정`. Codex gameplay QA now fails if
  the player-facing prompt loses this visible-context line.
- latest local pack-route check: `$GODOT_BIN --headless --path godot
  --export-pack "macOS PCK" build/macos/dream-of-one-same-order.pck` passed,
  then `DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_OUTPUT=data/evidence/godot/packaged-route/dre_171_packaged_route_evidence.json
  $GODOT_BIN --headless --main-pack build/macos/dream-of-one-same-order.pck`
  passed with `stage=inquest`, `sessionOutcome=inquest_opened`,
  `providerMode=fallback_only_m1`, `packagedRouteSmokeProof=true`, and
  `canReadEnvironmentToolCatalog=true`. Evidence SHA-256:
  `8946fb36b55f184c834345f40771b6bde4b60df2859da2d7b9e9a4c68a239bd1`.
  PCK SHA-256:
  `15c549f6e5fb96def19ec1bd0a353a8c3dfb80f09b46148fbb529484fedcf86a`.
  This is current pack-route engineering evidence only; it is not a packaged
  `.app`, not a fresh-player session, and it does not close the comprehension
  gate.
- latest correction: dialogue choices are speech inputs, not hardcoded NPC
  consequence branches. The active Store prompt should expose the Store Clerk's
  current environment tool catalog from object affordances while the choices
  remain diegetic speech lines. Codex gameplay QA now needs
  `canReadEnvironmentToolCatalog=true`, proving the player/agent can see the
  place's available tools without treating a line of dialogue as a fixed
  receipt/correction/report result.
- latest game increment: Studio and Park rule boards are now player-readable
  cross-place social rules before the Store conversation. Codex/player can
  focus `TS_Studio_ApprovalCriteria` and `TS_Park_NoticeBoard`, interact, and
  read each board's place, procedure rule, dialogue pressure, remaining record
  outputs, and the role consequence those rules can later unlock. This moves
  the current proof cell toward the larger game goal: the player reads a wider
  social field before speaking, then NPCs and institutions compare the player's
  text against those visible rules.
- latest game increment: the usual-order cue is now a player-readable
  normal-procedure prop. Inspecting `usual_order_cue` explains that `표식 하나,
  같은 봉투` is the expected local routine and that the clerk and waiting
  customer can compare the player's speech against it before any report chain
  starts. Codex gameplay QA now starts by focusing and interacting with that
  prop, adds `canInspectNormalProcedureCue=true`, and writes it into the
  Markdown QA action path/cause chain. Narrow proof passed with Godot import,
  GDScript syntax check, scene load smoke, playable slice smoke, Codex gameplay
  probe, backend report attach, backend `npm run check`, `git diff --check`,
  and shell syntax checks.
- latest game increment: the live HUD record line now includes `열람`, a
  compact list of roles that can read the current record set after actual
  ledger events exist. Initial empty state stays `열람 -`; the inquest Codex run
  shows `스테이션 직원`, `스튜디오 PM`, `대기 손님`, and `상점 매니저` in the
  running HUD. Codex gameplay QA now requires
  `canReadLiveHudRecordReaders=true`, and playable smoke fails if the inquest
  HUD no longer names the roles that can see the active record chain.
- latest game increment: NPC reaction inspection now exposes the short
  player-readable line the NPC is saying, not only the reaction label. In the
  inquest Codex run, inspecting Studio PM shows `들은 말: "스테이션 인용이
  붙었네요. 리뷰 줄은 오늘 차단하겠습니다."`, and inspecting Waiting Customer
  shows `들은 말: "스테이션이 인용했으면 저는 말 섞지 않겠습니다."`. The
  exported snapshots carry `spokenLine`, and Codex gameplay QA now requires
  `canReadNpcSpokenReaction=true`.
- latest game increment: the live HUD record line now includes a compact
  `주변 태도` summary of visible NPC stances. In the inquest Codex run, the HUD
  shows `대기 손님=접촉 거부`, `스튜디오 PM=리뷰 차단`, and `상점 매니저=보고 전달`
  next to the record/economy/social-reaction line, so the player can read who
  is currently helping, distancing, blocking, or escalating without opening
  each NPC detail panel. Playable smoke now checks route-specific nearby
  stances for clean, repair, suspicious, soft-report, and inquest routes.
- latest game increment: the live HUD `사회 반응` line now names the exact
  ledger record an NPC read before acting. In the inquest Codex run, the final
  HUD record line includes the latest social reaction with `civic-ledger-6`,
  so the player can connect Station citation -> Studio review block / Waiting
  Customer refusal without first opening the civic ledger prop. Codex gameplay
  QA now has `canReadLiveHudSocialCitation=true`, and playable smoke fails if
  HUD social reaction copy no longer cites the observed ledger event.
- latest game increment: the civic ledger is now an inspectable social-chain
  timeline, not only an append-only event count. Codex/player focuses
  `civic_ledger`, presses interact, and reads `사회 연쇄` lines such as
  `스테이션 직원: 상점 매니저/보고 전달(civic-ledger-5) -> 기록 인용`,
  `스튜디오 PM: 스테이션 직원/기록 인용(civic-ledger-6) -> 리뷰 차단`,
  and `대기 손님: 스테이션 직원/기록 인용(civic-ledger-6) -> 접촉 거부`.
  This makes the current proof cell explain the NPC-to-NPC record chain from a
  player-facing prop instead of requiring the player or Codex to infer it from
  separate NPC inspections.
- latest game increment: world-record prop inspection now separates broad
  `행동 가능성` from `현재 열린 행동`. In the inquest Codex run,
  `park_notice_board=rumored` shows currently open actions such as
  `공개 게시` and `수습 게시`, while `studio_review_queue=blocked` still shows
  its role/action map but also says `현재 열린 행동: 없음`. This makes the
  environment read as stateful affordances instead of a static rules list.
- latest game increment: NPC reaction inspection now shows why a visible
  social action was available, not just which ledger event happened. Inspecting
  Studio PM or Waiting Customer shows `가능 조건` such as
  `스튜디오 리뷰 줄=열림`, `대기 표식=줄 흐트러짐`, and `인용 장부 civic-ledger-6`,
  plus `값 변화` such as `신뢰-8, 부담+5`. This makes the current sample more
  like an environment that agents can reason inside: the player can see the
  shared record, the object state, and the tiny economy consequence that made
  an NPC action valid.
- latest game increment: the civic economy panel is now an actual inspectable
  social-pressure record. Codex/player focuses `civic_economy_panel`, presses
  interact, and reads current tiny values for `잔액`, `신뢰`, `부담`, and
  `주목`, plus recent ledger entries with `변화` labels such as trust and burden
  deltas. This keeps the economy intentionally child-simple while making the
  important game point visible: one role action changed one shared value, and
  that value exists only because it can alter the next NPC choice.
- latest game increment: the same civic economy panel is now a role-visible
  environment object, not only a player inspection panel. `OBJECT_VISIBILITY`
  includes `civic_economy_panel`, `visibleEnvironmentObjects` is exported in
  conversation snapshots and `debug_live_provider_packet`, and the Codex
  gameplay probe now fails unless the Waiting Customer provider packet can read
  the attention-state economy panel alongside actor memory and policy.
- latest game increment: visible NPC inspection now shows what the NPC can see
  right now. Inspecting Studio PM or Waiting Customer adds `보는 환경` lines
  such as `공원 게시판=소문 게시`, `스튜디오 리뷰 줄=차단`, and `시민 경제=주목
  상승`, plus exported `visibleEnvironmentObjectLabels`. This makes the
  player-readable NPC panel match the role-visible environment context instead
  of hiding the agent's current perception in private logs.
- latest game increment: Store Clerk is now inspectable as the first
  record-making actor in the chain. Codex/player can focus the Clerk after the
  typed inquest-triggering line and read the Clerk's `메모 배치` ledger basis,
  report-tray target, visible environment context, spoken Station handoff line,
  and `신뢰-20, 부담+35, 주목+30` value change before inspecting downstream
  Studio PM or Waiting Customer reactions.
- latest game increment: Station Officer is now inspectable as the authority
  actor who turns a forwarded Store record into formal questioning.
  Codex/player can focus the Officer after inquest and read `기록 인용`,
  `civic-ledger-6 -> civic-ledger-5`, the Station document target, `심문 초점`
  with `대상=플레이어`, the comparison against the Store handoff and player
  speech, the inquest authority, visible environment context, and the spoken
  intake line before opening downstream Studio PM or Waiting Customer detail.
- latest game increment: Park Witness is now inspectable as the public-spread
  actor who turns a local Store note into a public record. Codex/player can
  focus the Witness after inquest and read `civic-ledger-4 -> civic-ledger-2`,
  the Park notice board target, `공개 전파` labels, the roles that can use that
  public record, visible environment context, and the spoken rumor line before
  opening Studio PM or Waiting Customer detail.
- latest game increment: Studio PM is now inspectable as the cross-place
  opportunity actor. NPC inspection adds `기회 변화` labels, and Codex route
  reports now focus and interact with Studio PM on clean, repair, warning, and
  inquest paths to read how public confirmation opens review, public repair
  keeps review conditional, public warning delays it, and Station citation
  closes it.
- latest game increment: repair recovery now travels one small step beyond the
  Park board. After `public_repair_noted`, Studio PM reads `park_notice_board`
  and `studio_review_queue`, uses `offer_conditional_review`, changes
  `studio_review_queue` to `conditional`, writes
  `studio_review_conditioned`, and becomes visible as `NPC_Studio_PM` with
  `조건부 리뷰`. Codex repair-route QA now inspects both the public repair
  notice and the conditional Studio review queue, proving repair does not erase
  suspicion but can keep another-place opportunity conditionally open.
- latest game increment: the soft-report HUD consequence line now names the
  social chain that already happens before formal inquest: `플레이어 발화 ->
  상점 기록 -> 공원 게시 -> 응대 중단 -> 줄 이탈 -> 보고 접수`. Playable smoke and
  Codex gameplay QA now fail if soft report hides the public rumor, service
  pause, or queue exit behind a generic report-filed line.
- latest game increment: repair recovery now creates a public environment
  record that the player and Codex can read. `post_repair_notice` changes
  `park_notice_board` to `repaired`; the HUD shows `기억 공백 발화 -> 정정표 ->
  대기줄 수습 -> 공개 수습 게시`; Codex repair-route QA focuses and inspects the
  Park notice board and fails if that repaired public notice is hidden.
- latest game increment: Store Manager's intermediary role action is now
  visible as distinct NPC state instead of generic `reported`. In soft report,
  `pause_service` shows `NPC_Store_Manager` as `paused` with `응대 중단`; in
  inquest, `forward_report` shows the same actor as `forwarded` with
  `보고 전달`. Codex/player can now also focus and inspect the manager to read
  `관리 처리`: soft report explains `카운터=응대 중단` and queue exit, while
  inquest explains `보고 트레이=스테이션 전달`, `읽는 역할=스테이션 직원`, and
  `공식 인용 가능`. Codex gameplay QA now fails if the manager's local pause,
  formal handoff, or player-readable handoff explanation collapses back into
  one generic marker.
- latest game increment: Park Witness public rumor is now visible as NPC state
  in the soft-report/inquest paths. When Park Witness uses `post_rumor`, the
  actor keeps a `rumored` reaction with `소문 게시`, and the soft-report outcome
  chain now says `공원 소문 게시` before counter pause, queue exit, and Station
  warning intake. Playable smoke and Codex gameplay QA now fail if this public
  rumor remains only a ledger/prop state.
- latest game increment: NPC reaction inspection now names the ledger actor and
  validated action for both the reaction record and the cited record. In the
  inquest Codex run, inspecting Studio PM reads `근거 행동: civic-ledger-7 /
  스튜디오 PM -> 리뷰 차단` and `읽은 기록: civic-ledger-6 / 스테이션 직원 ->
  기록 인용`; inspecting Waiting Customer reads `근거 행동: civic-ledger-8 /
  대기 손님 -> 접촉 거부` and the same Station citation source. This makes the
  playable NPC reaction explain who used which record without opening JSON.
- latest game increment: the live HUD consequence line now follows the current
  social chain all the way through post-citation consequences. When the inquest
  route reaches `studio_review_queue=blocked` and `store_queue_mark=refused`,
  the HUD reads `플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시
  -> 보고 전달 -> 스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부`. This removes
  a player-facing gap where the running HUD stopped at Station citation even
  though the scene had already produced the Studio block and Waiting Customer
  refusal.
- latest game increment: inspecting a visible world-record prop now shows the
  small role/action map attached to that environment object. In the inquest
  Codex run, inspecting `studio_review_queue` shows `읽는 역할: 스튜디오 PM`,
  `행동 가능성: 리뷰 초대, 리뷰 보류, 리뷰 차단`, and `최근 장부:
  civic-ledger-7 ... 인용 civic-ledger-6`; the same facts are exported as
  `readerRoleLabels`, `possibleAffordanceLabels`, and `recentLedgerEvents`.
  This keeps the player-facing improvement focused on environment affordances:
  a shared record tells the player who can read it, what action it can support,
  and what just happened, without expanding Store/Station scope.
- latest game increment: the formal Station citation now travels to a different
  place and closes a tiny opportunity. After `station_record_cited`, the Studio
  PM reads the citation and `studio_review_queue`, uses `block_review`, changes
  the queue from `open` to `blocked`, writes `studio_review_blocked`, and
  becomes visible as `NPC_Studio_PM` with `리뷰 차단`. Codex/player now inspect
  the blocked Studio review queue and the Studio PM basis before inspecting the
  Waiting Customer refusal. This keeps the proof small: formal record ->
  another place's role sees it -> one opportunity closes.
- latest game increment: NPC inspection now shows the record basis behind the
  visible social stance. In the inquest Codex run, inspecting
  `NPC_Waiting_Customer` opens a HUD notice with `현재 반응: 접촉 거부`,
  `근거 행동: civic-ledger-8 / 대기 손님 -> 접촉 거부`, `읽은 기록:
  civic-ledger-6 / 스테이션 직원 -> 기록 인용`, and `대상 기록물: 대기 표식`; the
  same fields are exported as `basisLedgerEventId`, `basisLedgerEventLabel`,
  `citedLedgerEventId`, `citedLedgerEventLabel`, `basisAffordance`, and
  `basisObjectLabel` in `inspectedNpcState`. This keeps the proof focused on a
  small player-readable social chain: Station citation -> Waiting Customer
  refusal -> player can inspect who used which record.
- latest game increment: player/Codex can now focus a visible NPC and press the
  same interaction key to read that NPC's current social reaction in the HUD
  notice. The inquest Codex run focuses `NPC_Waiting_Customer`, reads
  `접촉 거부`, and records `inspectedNpcState` with the actor's pressure line.
  This makes an NPC's social decision directly inspectable in the running game
  instead of leaving it as a marker plus hidden summary data.
- latest game increment: Waiting Customer final social decisions are now
  visible NPC reactions in every Codex route report, not only ledger or pressure
  text. Clean cover marks `NPC_Waiting_Customer` as `helped` with `도움`, repair
  recovery marks `repair_accepted` with `수습 수락`, suspicious cover marks
  `distanced` with `거리두기`, soft report marks `left` with `줄 이탈`, and
  inquest marks `refused` with `접촉 거부`. Playable smoke and Codex route reports
  now fail if those final social choices remain line-only state.
- latest game increment: Park Witness public-record actions are now visible NPC
  reactions in the running scene. Clean cover marks `NPC_Park_Witness` as
  `vouched` with a `공개 확인` marker, repair recovery marks the same actor as
  `repaired` with a `수습 게시` marker, and suspicious cover marks the actor as
  `warned` with a `공개 경고` marker. Playable smoke and Codex route reports now
  fail if those public notice actions remain ledger-only instead of
  player-readable NPC state.
- latest game increment: Studio PM's clean-route invitation is now visible as
  an NPC reaction, not only a ledger/prop state. When `invite_review` succeeds,
  the Studio PM gets a Korean/English `invited` reaction label, a visible
  marker, and the line "공개 확인이 붙었네요. 리뷰 줄은 열어둘게요." Codex route
  reports now fail if the clean route cannot read that visible Studio PM
  invitation state. `PlayableSession` also scopes grouped NPCs, props, zones,
  and text surfaces to its own scene root, so multi-scene Codex route probes no
  longer write actor lines into a different live scene.
- latest game increment: the clean route now proves the new Studio review
  invitation is actually player/Codex-readable in the running scene. After the
  Store/Park public-trust chain opens `studio_review_queue=invited`, Codex uses
  `focus.world_record_prop` on `studio_review_queue` and
  `player.interact.focused`; the HUD notice opens the review invitation body
  instead of only reporting it in summary data. This keeps Studio as a tiny
  cross-place opportunity example, not a new system.
- latest game increment: the Waiting Customer is now an actual spawned Store
  NPC, not just an id in `agentActionLog`. Godot summaries and Evidence Packs
  include `visibleNpcStates`; playable smoke fails if an acting role lacks a
  spawned NPC state or player-readable pressure text; Codex gameplay QA now
  requires `visibleWaitingCustomerReaction=true` and marks
  `canReadVisibleNpcReaction=true`. The current AI-play report reaches
  `inquest`, accepts `13 / 13` public player actions, passes `routeReports=5/5`,
  and scores `explainability=13/13`.
- latest game increment: public trust now reaches a second place, not only the
  Store queue. On the clean route, the Studio PM sees the Park public routine
  vouch, uses `invite_review`, changes `studio_review_queue` from `open` to
  `invited`, and adds `studio_review_invited` as `civic-ledger-6`. This keeps
  the economy deliberately tiny: `localTrust` moves from 59 to 60, record
  burden stays at 0, and the player can read the result as a small review
  invitation. The point is not a Studio system; it is a reusable open-field
  pattern: public record -> another place's role sees it -> one visible
  opportunity opens.
- latest packaged proof refresh: the PCK, macOS debug app, unpacked app, and
  packaged route evidence were re-exported with Godot 4.7-beta2 after repair
  recovery started writing `park_notice_board=repaired` as a public
  environment record. PCK SHA-256 is
  `35d44fade6ea9a6645c3323fafdbae072dec0a84a09c1fea20304b4567a54294`, zip
  SHA-256 is
  `11bbc6430c4f58258c4ac438f612c82cfa8d6b6a9f6071a4e66be72928a43f01`,
  main-pack smoke evidence SHA-256 is
  `1474022966c7b7020d7cdf4d2e3a1ebe383baf3745b79ff23b9cfe519bae116f`, and app
  route evidence SHA-256 is
  `f86316825bc6c00a89eff13bcf9f4b34dd52ae2c70aa6ecd8c2be714fae3370d`.
  Packaged launch, packaged route smoke, and comprehension preflight all passed
  against `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json`.
- prior game increment: visible world-record props are reachable through a
  focused player interaction path, not only a direct inspect helper. Codex/player
  can use `focus.world_record_prop` on `park_notice_board`, then press
  `player.interact.focused`; the HUD notice reads "공원 게시판" with the current
  "소문 게시" public-record body, and the AI-play report marks
  `canInspectPublicEnvironmentRecord=true`. The normal focus scan also treats
  operation record props as readable targets when no conversation zone is closer.
- prior game increment: clean and warning outcomes now tell the player that
  the Waiting Customer is acting from the Park notice board. The clean route
  says the Park board's public vouch opened the local tip, and the suspicious
  route says the Park board's public warning caused distance. This keeps the
  same tiny Store/Station cell but makes the reusable social-sim chain more
  readable: public record -> another NPC sees it -> toy trust gate changes a
  role action.
- prior packaged proof refresh: the macOS debug app was re-exported with
  Godot 4.7-beta2 after the public-board wording change, then packaged launch,
  packaged route smoke, backend schema validation, and comprehension preflight
  all passed against `/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json`.
- prior game increment: public notices are now actually public to the next
  NPC that acts from them. `park_notice_board` is visible to the Waiting
  Customer in both the backend environment and the Godot proof cell, so the
  clean-route local tip and suspicious-route distance reaction no longer rely
  on an invisible board. The playable smoke and Codex gameplay probe now fail
  if the Waiting Customer shares a local tip or keeps distance without
  perceiving the public notice board first.
- prior game increment: a public warning can change another NPC's
  immediate behavior without Station escalation. After the Clerk marks a
  suspicious receipt, the Waiting Customer notes a wary queue, and the Park
  Witness posts a public warning, local trust is low enough to unlock
  `keep_distance`. The Waiting Customer reads the warning, changes
  `store_queue_mark` to `distanced`, and adds `queue_distance_kept`. This
  proves the reusable open-environment pattern opposite to the clean-route tip:
  a crude social value can open avoidance or help through validated role
  actions.
- prior clean routine increment remains current: clean routine records can
  unlock help through a toy economy gate. After the Clerk creates a normal
  receipt, the Waiting Customer accepts the routine, and the Park Witness
  publicly vouches for it, local trust reaches the threshold for
  `share_local_tip`. The Waiting Customer reads the public vouch, changes
  `store_queue_mark` to `helped`, and adds `local_tip_shared`.
- prior public-warning increment remains current: wary local records can become an informal public
  warning before any formal report. After the Clerk marks a suspicious receipt
  and the Waiting Customer notes a wary queue, the Park Witness reads that
  queue record, uses `post_warning` on `park_notice_board`, changes the board
  to `warned`, and adds `public_warning_posted`. The current follow-up can now
  let a Waiting Customer keep distance from that public warning when local
  trust is low. This keeps the current sample tiny while proving a reusable
  social-sim step: NPCs can warn, slow, and avoid the player in public without
  jumping straight to Station authority.
- prior repair-public increment remains current: repair travels through a
  public social relay. After the Clerk attaches the correction slip and the
  Waiting Customer accepts the repair, the Park Witness reads that correction
  record, uses `post_repair_notice` on `park_notice_board`, changes the board
  to `repaired`, and adds `public_repair_noted`. This proves a reusable pattern for
  the broader game: social recovery can spread through records and witnesses,
  not only through punishment or formal escalation.
- prior inquest increment remains current: inquest sends one formal record back
  into local social space. After the Station Officer cites the forwarded Store
  report, the Waiting Customer reads that Station citation, uses
  `refuse_contact` on `store_queue_mark`, changes the queue state to `refused`,
  and adds `queue_contact_refused`. This proves that formal authority can alter
  ordinary NPC contact without adding bespoke player branches or a larger
  Store/Station system.
- prior soft-report increment remains current: soft report creates one more
  local social consequence before the Station path. When the Clerk note crosses
  the report threshold but stays below inquest, the Store Manager adds a
  follow-up note and pauses counter service; the Waiting Customer then reads
  that pause record, uses `leave_queue` on `store_queue_mark`, changes the
  queue state to `empty`, and adds `queue_left`.
- prior suspicious-cover increment remains current: suspicious cover now leaves
  a small local social residue without becoming a report. When the player says
  a risky line and then returns to the clerk's premise, the Clerk marks the
  receipt; the Waiting Customer reads that marked receipt, uses `note_wary` on
  the queue mark, changes the queue state to `delayed`, adds
  `queue_wary_noted`, lowers local trust by 2, and raises record burden by 5.
  The Park Witness can read that wary queue record and post a public warning;
  the Waiting Customer can then read the warning and change the queue mark to
  `distanced` without formal escalation.
- prior clean increment remains current: clean cover has a visible social
  consequence too. When the player answers inside the local routine, the Clerk
  cites the usual order and creates a normal receipt; the Waiting Customer reads
  that normal receipt, uses `accept_routine` on the queue mark, changes the
  queue state to `settled`, adds `queue_routine_kept` to the civic ledger, and
  raises local trust by 2. This proves that the social field reacts to fitting
  in, not only to risk or repair.
- prior repair increment remains current: repair has a visible social consequence, not only
  a clerk-internal correction. When the player admits uncertainty and then
  returns to the Clerk's premise, the Clerk attaches a correction slip and the
  Waiting Customer reads that correction record, uses `accept_repair` on the
  queue mark, changes the queue state to `settled`, adds
  `queue_repair_accepted` to the civic ledger, increases local trust by 5, and
  reduces record burden by 5. This proves the reusable pattern that repair can
  calm a social situation through another NPC, not just avoid punishment.
- prior small negative-reaction increment remains current: a Waiting Customer
  reads the Clerk's report note, uses `complain_delay`, disrupts the queue, and
  a Park Witness can post public rumor from the same Store note before
  manager/Station actions continue. These are reusable NPC-to-NPC record-use
  patterns, not reasons to deepen Store/Station content.
- artifact:
  `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`
- Markdown report:
  `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.md`
- SHA-256:
  `22263bdd4abde9c20b5d99d1ae084c8b54e74e1c57754e9fd281288d65ce2e6e`
- Markdown SHA-256:
  `a6adf94724769b0bd2008e2f3b4d101cfae18080df36ec8eac92b7e03c5ca2fe`
- new proof: artifact now includes `aiPlayerReport` with action path, final
  player-visible state, player-readable cause chain, role-action explanation,
  NPC-to-NPC observation explanation, and the explicit boundary that this is
  not external comprehension evidence. The same run also writes a Markdown
  sidecar for fast human/Codex review. The probe also now starts fresh scenes
  and drives public Codex/player actions through clean cover, repair recovery,
  suspicious cover, soft report, and inquest outcomes, proving AI-play route
  coverage without replacing human comprehension notes.
- session kit manifests now bind the current Codex action catalog
  (`focus.store_counter`, `conversation.start`,
  `player.wait.hesitation_record`, `dialogue.choice.by_id`,
  `dialogue.choice.by_index`, `player.type.free_input`,
  `focus.world_record_prop`, `focus.npc`, `player.interact.focused`,
  `inspect.world_record_prop`, and `inspect.npc`) so an AI coding
  tool can verify which player actions are callable before a human session.
- session kit verification now requires both dialogue action surfaces:
  `dialogue.choice.by_id` and `dialogue.choice.by_index`, so Codex can drive
  authored choices by stable id or by visible player-facing slot.
- session kit verification now also requires the copied Codex probe to contain
  an accepted `player.type.free_input` step with a non-empty text payload that
  reaches the inquest route. This keeps the "Codex can submit typed text"
  objective tied to actual play, not only to an action catalog entry.
- session kit verification now requires Codex-readable player-visible state
  from the copied probe: HUD record text, investigation trail, civic economy
  panel, world record props, civic ledger citation, and Store Manager/Station
  Officer role actions. This keeps "Codex can inspect HUD/world/ledger/NPC
  state" tied to actual play artifacts.
- session kit verification now fails if manifest action/route summaries drift
  from the copied `codex-gameplay-probe.json`, keeping AI-play setup proof tied
  to the actual Godot probe artifact instead of trusting duplicated metadata.
- generated session kits now run their own verifier at creation time and write
  `session-kit-self-check.txt`, so a facilitator or AI tool can see that the
  bundle passed setup checks before any human play session.
- facilitator pre-play prompts now use the neutral line "Play this short scene
  without prior explanation..." instead of "Station intake path", reducing
  first-run hinting before external comprehension notes are captured.
- session kit verification now also checks facilitator-only pre-play files for
  the neutral line and fails if stale "Station intake path" wording returns,
  keeping blind-player setup honest before raw notes are collected.
- tester-facing invite verification now rejects broader first-run hints such
  as Station/station, 스테이션, inquest, record objects, ledger terms, risk,
  Evidence, provider/fallback, and examined-role wording.
- tester-facing invite spoiler checks are case-insensitive for English terms,
  so capitalized leaks such as Record, REPORT, or Station also fail setup
  verification.
- standalone `--recruitment` output now runs the same broad no-spoiler scan
  before printing, so a direct tester invite cannot bypass the session kit
  verifier.
- `.game-harness/scripts/verify-comprehension-review-guards.sh` now also
  proves the standalone `--recruitment` path fails on broad/case-insensitive
  tester-invite leaks, so the quickest fresh-player invite path is covered by
  a regression guard.
- The same guard now proves session-kit verification fails if
  `dialogue.choice.by_index` is dropped from the Codex action catalog binding.
- It also proves verification fails if the copied Codex probe no longer
  contains an accepted typed free-input step.
- It also proves verification fails if the copied probe loses player-visible
  HUD record state or Station Officer citation state.
- session kit verification now also requires the copied Codex Markdown gameplay
  report to remain readable as a player-perspective artifact: action path,
  player-readable cause chain, final visible state, route outcomes, role
  actions, NPC-to-NPC observations, and the explicit external-comprehension
  boundary. The guard proves a damaged Markdown report fails even when its hash
  is updated in the manifest.
- `.game-studio/project-state.md` has been realigned with current proof:
  typed free input is proven through the Godot/HUD/Codex QA path, fallback-only
  provider mode and export setup are no longer open blockers, and product
  closure remains blocked on external fresh-player comprehension notes plus the
  final product/council decision from those notes.
- `.game-harness/verification-ledger.md` now mirrors that blocker truth: live
  provider integration remains future evidence, not an M1 fallback-only
  blocker; the current product blocker is external fresh-player comprehension
  and the final product/council decision from those notes.
- `.game-harness/continue-here.md` now starts with the same 2026-05-18 resume
  truth: do not reopen typed input, provider/export, or broad role-review work
  unless evidence regresses; use the session kit and tester-safe invite to run
  observed fresh-player sessions.
- `.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md`
  now uses the neutral pre-play line instead of the stale "Station intake path"
  instruction, and the comprehension guard fails if that stale first-run hint
  returns.
- `.game-harness/tasks.md` and `.game-studio/project-state.md` now stop listing
  manual recorded-statement/free-input decision work as open. Current evidence
  proves HUD typed free-input through Godot/HUD/packaged/Codex QA, while the
  legacy recorded-statement fallback remains internal only.
- `.game-studio/project-state.md` now puts fresh-player sessions, strict note
  review, and the M1/M2 decision ahead of any issue splitting or next example
  environment increment.
- `.game-harness/tasks.md` now moves post-comprehension issue creation and
  prototype-plan splitting behind a dedicated external-comprehension blocker
  section, so the active task list points at fresh-player sessions first.
- `.game-harness/scripts/run-same-order-comprehension-session.sh --status` now
  prints the exact `--recruitment`, `--session-kit-output`, `--verify-session-kit`,
  and live helper commands when raw notes are below the required three sessions.
- generated session kit README now repeats the `--verify-session-kit
  <this-session-kit-dir>` command for moved or edited kits, the live
  observed-session helper command, and the rule that the README, manifest,
  Codex QA artifacts, route reports, and facilitator notes stay away from the
  tester before first play.
- session kit verification now fails if README loses the live observed-session
  handoff, the neutral-pre-play reminder, or the tester-facing boundary.
- successful session kit verification now prints `README live-session handoff:
  pass`, so the generated self-check tells facilitators and AI tools that the
  kit still contains the live observed-session bridge.
- Codex gameplay QA status now includes source freshness against the active
  Godot proof-cell files. Session kit generation fails unless the probe JSON
  and Markdown report are newer than the watched Godot scene/runtime/HUD files,
  and the generated self-check prints `Codex source freshness: pass...`.
- `--verify-session-kit <dir>` now also recomputes freshness for the kit's
  copied `codex-gameplay-probe.json` and `codex-gameplay-report.md` against
  the current watched proof-cell files. If a kit was generated before a
  Godot/HUD/probe source change, re-verification fails instead of trusting the
  old manifest text.
- 2026-05-18 playable public-repair increment: added the next smallest repair
  propagation. The repair route now proves `mark_receipt -> offer_correction ->
  attach_correction -> accept_repair -> post_repair_notice`; final repair state
  includes `store_queue_mark=settled`, `correction_slip=attached`,
  `park_notice_board=repaired`, `queue_repair_accepted`,
  `public_repair_noted`, local trust 48, record burden 25, and Station
  attention 5. The Park Witness reads the correction record and posts that the
  mismatch was repaired instead of becoming a rumor. Verified with latest
  Godot playable smoke, Codex gameplay probe, backend playability report
  attachment, full backend check, runtime slice smoke, PCK export/main-pack
  smoke, macOS app export, packaged launch/route smoke, session-kit
  generation, comprehension guards, and raw-note review. External fresh-player
  notes remain `0 / 3`.
- 2026-05-18 resume readiness recheck kept the scope intentionally narrow:
  reran the Godot Codex gameplay probe and generated/verified a temporary
  session kit. The probe still passes with `stage=inquest`, accepted public
  player actions `5 / 5`, `aiPlayerReportPass=true`, and route reports `5 / 5`;
  the temporary kit verifier printed Codex source freshness pass, current kit
  freshness pass, copied probe cross-check pass, route reports pass, and
  `README live-session handoff: pass`. This is still setup proof only; raw
  session notes remain `0 / 3`.
- 2026-05-18 playable Station-citation contact-refusal increment: added the
  next smallest inquest reaction after formal citation. The inquest route now
  proves `place_note -> complain_delay -> post_rumor -> forward_report ->
  cite_record -> block_review -> refuse_contact`; final inquest state includes
  `studio_review_queue=blocked`, `store_queue_mark=refused`,
  `studio_review_blocked`, `queue_contact_refused`, local trust 0, record
  burden 93, and Station attention 70. The terminal copy now says the Studio
  PM blocks review before the Waiting Customer refuses contact after seeing the
  Station citation. Verified with
  latest Godot playable smoke, Codex gameplay probe, backend playability report
  attachment, full backend check, runtime slice smoke, session-kit generation,
  and comprehension guards. This is internal playable proof only; external
  fresh-player notes remain `0 / 3`.
- 2026-05-18 playable paused-service queue-exit increment: added the next
  smallest environment reaction after a soft report. The soft-report route now
  proves `place_note -> complain_delay -> post_rumor -> place_followup_note ->
  pause_service -> leave_queue`; final soft-report state includes
  `store_counter=paused`, `store_queue_mark=empty`, `service_paused`,
  `queue_left`, local trust 2, record burden 100, and Station attention 60.
  The terminal copy now says the Waiting Customer leaves after seeing counter
  service pause. Verified with latest Godot playable smoke, Codex gameplay
  probe, backend playability report attachment, full backend check, runtime
  slice smoke, session-kit generation, and comprehension guards. This is
  internal playable proof only; external fresh-player notes remain `0 / 3`.
- 2026-05-18 playable repair-response increment: added the smallest positive
  NPC-to-NPC social reaction. The repair route now proves
  `mark_receipt -> offer_correction -> attach_correction -> accept_repair`;
  final repair state includes `store_queue_mark=settled`,
  `correction_slip=attached`, `queue_repair_accepted`, local trust 45, record
  burden 30, and Station attention 5. The terminal repair copy now says the
  Waiting Customer accepted the correction and let the line continue. Verified
  with latest Godot playable smoke, Codex gameplay probe, backend playability
  report attachment, full backend check, and GDScript syntax check. This is
  internal playable proof only; external fresh-player notes remain `0 / 3`.
- 2026-05-18 playable routine-response increment: added the smallest safe-route
  NPC-to-NPC and public social reaction. The clean route now proves
  `cite_expected_order -> create_receipt -> accept_routine -> vouch_routine ->
  share_local_tip`; final clean state includes `store_queue_mark=helped`,
  `receipt_tray=normal`, `park_notice_board=vouched`, `queue_routine_kept`,
  `public_routine_vouched`, `local_tip_shared`, local trust 59, record burden
  0, and Station attention 0. This keeps Store/Station thin while making the broader
  social-sim rule clearer: another NPC can read a normal record, keep the
  environment calm, let routine behavior become public social trust, and then
  use that trust to help the player.
  Verified with latest Godot playable smoke, Codex gameplay probe, backend
  playability report attachment, full backend check, GDScript syntax check,
  runtime slice smoke, latest PCK export/main-pack smoke, macOS app export,
  packaged app launch/route smoke, and comprehension gate status. This is
  internal playable proof only; external fresh-player notes remain `0 / 3`.
- 2026-05-18 playable suspicious-cover increment: added the smallest contained
  risk reaction. The suspicious cover guard route now proves
  `mark_receipt -> note_wary -> post_warning -> keep_distance`; final state includes
  `store_queue_mark=distanced`, `receipt_tray=marked`,
  `park_notice_board=warned`, `queue_wary_noted`,
  `public_warning_posted`, `queue_distance_kept`, local trust 41, record burden
  25, and Station attention 0. This keeps the example environment tiny while
  making a non-binary social consequence playable: fitting in can open help,
  repair can settle the room, and unresolved weirdness can make nearby NPCs
  keep distance after a public warning without formal escalation. Verified with
  latest Godot playable smoke, refreshed playability reports, full backend
  check, GDScript syntax check, Codex gameplay probe with
  `routeReportPassCount=5 / 5`, runtime slice smoke, latest PCK
  export/main-pack smoke, macOS app export, packaged app launch/route smoke,
  Codex probe status, and comprehension note review. This is internal playable
  proof only; external fresh-player notes remain `0 / 3`.

## Loop State

| Field | Current value |
|---|---|
| Stage | `M1 Protocol Proof` |
| Product verdict | `technical conditional pass; product gate open` |
| Provider mode | `fallback_only_m1` |
| Latest Godot command | set `GODOT_BIN` per device |
| Packaged proof path | set `DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_PATH` per device |
| Codex gameplay QA | pass with JSON `aiPlayerReport`, Markdown sidecar, and 5/5 route reports; internal proof only |
| Codex action catalog | bound into status output and generated session kit manifests; internal setup proof only |
| External comprehension | `PENDING_TESTER_NOTES` |

## Allowed Next Work

- Default to a small open-environment game improvement when one is available.
  The preferred
  shape is: name the missing player-facing consequence, implement the smallest
  playable version, run the narrowest real game check, then update state. Do not
  choose more test/helper/document work just because it is easier to automate.
- If `--status` passes, raw notes are still `0 / 3`, and no watched
  Godot/HUD/probe/session-helper source changed, do not rerun Codex probe,
  recreate session kits, or add another setup artifact just to make progress.
  The build is already waiting on an observed fresh-player session.
- Complexity check before starting: if the change adds another internal gate,
  helper mode, manifest field, or review artifact, it is probably the wrong
  next move unless an existing live-session path is failing. The current proof
  surface is enough to try the session.
- Test-hardening check before starting: do not add tests for helper output,
  accounting reports, manifests, or process scaffolding unless the behavior
  gates live provider spend, deterministic authority, or a player-visible
  release claim. A command proof plus ledger note is enough for support-only
  surfaces.
- If the current playable build has a clear game-design gap, prefer a tiny
  implementation slice over more comprehension infrastructure. Examples:
  clearer NPC-to-NPC handoff feedback, a prop state that changes after a role
  action, a consequence line that makes authority legible, one validated social
  affordance that creates a new playable reaction, or one child-simple economy
  value that changes an NPC choice. Do not choose the gap merely because it is
  a Store/Station detail.
- Improve tester-readiness, facilitator flow, or comprehension-state tracking if
  it directly helps collect honest fresh-player notes.
- Improve the Codex gameplay QA interface when it helps AI agents play the
  current build like a player: action catalog, snapshot clarity, typed input,
  HUD/world/ledger visibility, route result explanation, or artifact readability.
- If a small game slice adds visible state or consequences, keep the AI-play
  interface current in the same pass so Codex can launch, act, inspect, and
  explain the slice from the player point of view.
- Treat a missing AI-play path as a blocker for new player-facing scope, even
  when ordinary test code still passes.
- Make tiny player-facing readability fixes only when they reduce confusion in
  the existing example proof cell or clarify a reusable social-sim pattern.
- Re-run Godot/package/backend checks after any runtime-facing edit.
- Update evidence and this state file after each real change.

## Do Not Do Next

- Do not let testing, AI-play interface work, evidence formatting, or process
  documentation displace a missing playable game improvement.
- Do not expand the Store into a management game, and do not deepen Station
  bureaucracy. Store/Station work is valid only as the smallest disposable way
  to prove a reusable open-environment social pattern.
- Do not add broad society, economy, route, provider, or lore scope before the
  current proof is externally understood.
- Do not count Codex QA, screenshots, proxy packets, or generated worksheets as
  fresh-player comprehension.
- Do not replace play-based AI QA with mock-heavy tests. Test code is allowed
  only when it protects public behavior, deterministic authority, schema
  compatibility, route evidence, provider boundaries, or a known regression.
- Do not add mock-heavy tests, report-format tests, or coverage padding. This
  is a game project; test work must stay smaller than the playable slice it
  protects.

## Loop Exit Gate

Do not claim the active goal complete until strict external comprehension review
has enough fresh-player notes and the council/product gate accepts them. If the
only remaining work is waiting for human testers, report the blocker plainly and
keep the repo state ready for that session.

## Next Action

If a fresh tester is present, use the minimal path:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh
```

Only use the setup bundle when recruiting or handing off to a facilitator:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --status
.game-harness/scripts/run-same-order-comprehension-session.sh --facilitator-pack
.game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output <dir>
.game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <dir>
```

The verifier checks copied Codex QA artifacts, full action/route binding,
accepted typed-input execution, player-visible HUD/world/ledger/NPC state,
readable Markdown gameplay report content, tester-facing spoiler safety,
broader Station/record/risk/examined-role term leaks with case-insensitive
English matching, and neutral facilitator pre-play wording. A passing kit is
still setup proof only; it cannot close the external comprehension gate.

The Game Studio project-state file now matches this proof state: do not reopen
manual typed input, provider/export decision, or broad role-review blockers
unless new evidence regresses. The active product blocker is still external
fresh-player comprehension.

The verification ledger also matches this: do not treat live provider access as
required for fallback-only M1 closure, but do not claim live provider behavior
until a separate live preflight proves it.

The continuation file also matches this: the next useful action is a real
fresh-player Same Order session, not broader implementation.

The `--status` helper is intentionally concise now. It suppresses the detailed
packaged preflight log on success, prints the live fresh-player session as the
first next action, keeps Codex QA as a setup-readiness summary, and avoids
dumping the full raw-note review table while there are still `0 / 3` notes.
Use `--codex-probe-status` only when the detailed AI-play proof is actually
needed.

The default live helper also suppresses successful packaged-preflight detail
before launch and avoids printing facilitator-only spoiler terms in the
pre-launch reminder. If the packaged app or evidence fails, errors still print;
if it passes, the fresh tester sees only the neutral first-run instruction.
Raw notes written by the default live helper now also bind the session to the
same Codex gameplay QA route summary used by the worksheet and session kit:
clean cover, repair recovery, suspicious cover, soft report, and inquest stay
visible as setup context without counting as human comprehension evidence.
After the packaged app closes, the default live helper now prints a short
after-play reminder before raw-note prompts: ask what happened to the tester,
what changed after speech or typed input, and capture the tester's own wording
for examined/evaluated, statement-to-record, and delay-to-record quotes before
explaining the design.
The same live helper now asks those own-word comprehension and direct-quote
prompts before route labels, safe/risky classification, facilitator
intervention, or pass/fail scoring. This keeps the first explanation closer to
the player's actual read of the scene instead of the facilitator's categories.
The manual-session README now mirrors the same low-friction path: run
`.game-harness/scripts/run-same-order-comprehension-session.sh` for each fresh
tester, use `--status` only as a readiness check, and reserve recruitment,
session-kit, worksheet, debrief, and Codex detail modes for optional setup or
handoff. After writing a raw note, the live helper prints only the progress
note count, minimum remaining sessions, review command, and status command; it
does not add another gate. Once raw note count reaches three, it switches the
post-session prompt to strict review and ledger-draft commands so the next
product-gate action is visible immediately.

The standalone `--recruitment` path also self-checks the invite text before it
prints, and the comprehension guard script proves that a leaked tester invite
fails before it is used. Use `--recruitment` when you only need the tester-safe
invite, and use the session kit when a facilitator needs the full setup bundle.
The external comprehension ledger now also tells facilitators to run
`--verify-session-kit <dir>` after generating a session kit.
Generated session kit README files now also name the live observed-session
helper command and repeat the tester-facing boundary after kit verification.
The verifier now checks those README handoff lines so generated setup material
cannot silently drift away from the actual fresh-player run flow.
Its success output now also names `README live-session handoff: pass`, making
that bridge visible in `session-kit-self-check.txt`.
It also prints `Codex source freshness: pass...` and `Codex kit current source
freshness: pass...`; if a gameplay/HUD/probe file is newer than the copied
Codex probe artifacts, regenerate the probe and recreate the human-session kit.

After observed play, review the raw notes with:

```bash
.game-harness/scripts/review-same-order-comprehension-notes.sh --strict
```

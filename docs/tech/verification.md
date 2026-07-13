# Verification

Verification is deliberately thin. v1 drowned in proof; v2 runs one product
gate and a short list of smokes.

## The fun gate (product)

After any slice that changes played experience: run the game, play the
affected flow for at least five minutes, answer honestly in the PR
description — **"Would I play this again for five minutes?"** with one
sentence of why. That's it. External playtests are welcome input and never a
gate.

For the M3R conversion, the owner's later routing instruction defers all
hands-on game driving until every implementation item and Sol self-review is
complete. Intermediate 3D spatial/UI slices use model-free engineering
evidence: CLI smokes plus Godot AI session/readiness, saved scene
hierarchy/properties, current diagnostics, and non-input captures. Sol sends no
gameplay input and does not claim the fun gate. The final bounded Terra-high run
supplies the first M3R play/fun answer and the itemized live acceptance.

### M3R live-play routing (owner-set, 2026-07-11)

M3R separates the model driving the test from the model living inside the
game:

- GPT-5.6 Sol ultra owns planning, implementation, diagnosis, repair, and
  self-review.
- Once implementation and self-review are complete, Sol writes one bounded
  run-only packet using the `lower-capability-executor-prompt` contract.
  GPT-5.6 Terra high alone drives the actual game through Godot AI and records
  the fun/acceptance observations. Terra does not edit or diagnose on failure;
  it reports, Sol repairs, and a new bounded Terra run is issued.
- Every real NPC/model call in those play runs pins
  `modelscope/qwen3.7-plus`. A live result counts only when the returned
  metadata says that profile, `transport=live`, and no fallback. Missing Qwen
  credentials block live acceptance; OpenAI, a local model, scripted output,
  or fallback may not substitute.
- Bun checks, fixture smokes, scripted Session API parity, headless Godot
  smokes, and explicit fallback-completion checks make no product LLM call.
  Sol may run them, but they are engineering evidence only and never prove the
  LLM game experience.

The currently landed spend-bearing live-provider smoke exercises `ko-KR`.
M3R's final locale acceptance must parameterize this same provider/adapter and
Godot AI route for `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP`; it must
not add a second locale-specific smoke harness or weaken the
Terra/Qwen/zero-fallback requirements.

## Commands (engineering)

```bash
# Runtime (fast, always)
bun run --cwd backend/npc-runtime check

# Godot client (headless)
$GODOT_BIN --version # Expected: 4.7.x stable
$GODOT_BIN --headless --import --path godot
DREAM_SESSION_MODE=fixture $GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
DREAM_SESSION_MODE=fixture $GODOT_BIN --headless --path godot --script res://tools/route_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/npc_movement_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/physical_prop_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/godot_ai_input_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/localization_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/check_assets.gd
$GODOT_BIN --headless --path godot --script res://tools/asset_validation_smoke.gd

# Localhost API parity (starts and stops scripted test adapters; no live model)
GODOT_BIN="$GODOT_BIN" backend/npc-runtime/scripts/live-route-parity.sh
GODOT_BIN="$GODOT_BIN" backend/npc-runtime/scripts/run-api-http-parity.sh

# M3R opt-in live provider smoke (manual/spend-bearing; Qwen only)
: "${MODELSCOPE_API_KEY:?MODELSCOPE_API_KEY is required for live Qwen verification}"
set -o pipefail
env -u OPENAI_API_KEY -u LOCAL_LLM_BASE_URL \
  NPC_PROVIDER_PROFILE=modelscope/qwen3.7-plus \
  MODELSCOPE_BASE_URL=https://api-inference.modelscope.ai/v1 \
  bun --no-env-file backend/npc-runtime/src/tools/provider-smoke.ts \
  --profile modelscope/qwen3.7-plus --locale ko-KR | \
  jq -e '
    .profileId == "modelscope/qwen3.7-plus" and
    .locale == "ko-KR" and
    .acceptancePassed == true
  '
```

The same existing smoke accepts `--locale en-US|it-IT|zh-CN|fr-FR|ja-JP`
for the other supported languages. It uses the M3R Studio receptionist
opening and merged judgment/reply path; it is a provider calibration check,
not a substitute for the final Godot AI play route.

For a live game run, start the sidecar with the same guard and no dotenv
autoload, then point Godot at it:

```bash
env -u OPENAI_API_KEY -u LOCAL_LLM_BASE_URL \
  NPC_PROVIDER_PROFILE=modelscope/qwen3.7-plus \
  MODELSCOPE_BASE_URL=https://api-inference.modelscope.ai/v1 \
  PORT=18787 \
  bun --no-env-file backend/npc-runtime/src/index.ts

DREAM_SESSION_MODE=http \
DREAM_SESSION_URL=http://127.0.0.1:18787 \
"$GODOT_BIN" --path godot
```

`/health/ready` proves only the sidecar is serving. The Terra run must inspect
`providerAudit` on the terminal hearing response before the client reloads,
require `complete=true`, `truncated=false`, `droppedCount=0`,
`inFlightCalls=0`, and a `callsUsed` count greater than zero. Every recorded
call must report `profileId=modelscope/qwen3.7-plus`, `transport=live`,
`usedFallback=false`, and `outcome=success`; every recorded resolution must
use the same profile with `transport=live`, `usedFallback=false`, and no
fallback reason. `callsUsed` must equal completed calls plus in-flight calls,
and `tokensUsed` must equal the sum of `calls[].chargedTokens` plus
`inFlightTokens`. The adjacent `providerRuntimeTrace` must also be complete,
untruncated, non-empty, and contain only that same Qwen/live/no-fallback
metadata; it catches deterministic runtime replacement after a structurally
valid live envelope fails semantic validation. The Godot AI
`providerAuditSummary.allExpectedProfileLiveNoFallback` field combines these
checks and must be `true`. Sampling one response packet or checking only
`lastProposalMeta` is insufficient. The
OpenAI-compatible npm client used by the ModelScope adapter is transport code;
the pinned base URL and returned profile identify the model route.

CI runs the Bun check on backend changes (existing workflow). Godot smokes
run locally per slice; add them to CI only if a real regression escapes
twice.

## Policy

- A slice ships with the narrowest check that would catch its regression —
  usually one existing smoke, occasionally one new fixture.
- Tests protect: deterministic authority, schema compatibility, the provider
  boundary (validation/fallback/budget), player-visible route outcomes. Tests
  do not protect: helper scripts, formatting, internal helper structure.
- No verification ledgers, evidence packs, proof audits, or standing status
  files. State lives in code, tests, and the PR that shipped it.
- Visual-change PRs include the smallest Godot AI capture that proves the
  claim: one affected editor/game frame, with a before/after pair only when the
  comparison matters. Sol captures without gameplay input; exercised-state
  captures belong to final Terra play. No contact-sheet apparatus.
- A failed or unavailable Terra/Qwen live run is an honest blocked result, not
  permission to relax the route or count a deterministic smoke as the fun
  gate.

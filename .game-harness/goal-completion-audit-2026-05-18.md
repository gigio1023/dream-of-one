# Goal Completion Audit

Date: 2026-05-18
Verdict: NOT COMPLETE

## Objective Restated

Resume the active Dream of One goal and verify the whole playable state against
the project guidance: build toward a playable open-environment NPC social
simulation, use the cheapest available `openai-codex` model with strict budget
tracking, check whether live LLM-based NPC agents can participate in social
interaction, preserve deterministic game authority, avoid waterfall scope, and
continue through small playable proofs.

## Checklist

| Requirement | Evidence inspected | Status |
|---|---|---|
| Repo guidance and game goal are active references. | `AGENTS.md`, `.game-harness/active-goal-prompt.md`, `.game-harness/playable-goal-reference.md`, `.game-harness/goal-loop-state.md`, `.game-studio/project-state.md`. | PASS |
| Store/Station is treated as a disposable proof cell, not the product center. | `.game-harness/active-goal-prompt.md`, `.game-harness/playable-goal-reference.md`, `.game-harness/tasks.md`, `.game-harness/verification-ledger.md`. | PASS |
| Current environment has role affordances, visibility, records, economy effects, and validation rules. | `docs/scenario/content/environment-affordance-map.md`, `backend/npc-runtime/test/integration/agentic-environment.integration.test.ts`, `godot/scripts/runtime/playable_session.gd`. | PASS |
| Backend protects deterministic authority and rejects unavailable/hidden/forbidden provider actions. | `npm run check --prefix backend/npc-runtime` passed with 141 tests after adding live evidence verifiers for the checked-in Godot dispatch and thread-continuity artifacts. | PASS |
| Provider path uses the cheapest allowed Codex model by default. | `backend/npc-runtime/src/config.ts`, `.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md`; default remains `openai-codex`, `gpt-5.4-mini`, low reasoning, no fallback models. | PASS |
| Live usage is budgeted and recorded. | `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json`: 2 requests, total estimate `$0.00844875`, actual 2,296 input / 449 output / 2,745 total tokens, ChatGPT Pro remaining quota not exposed. | PASS |
| Same-session NPC memory/thread continuity is protected and live-proven. | `backend/npc-runtime/test/integration/openai-proposal-provider.integration.test.ts` proves local workspace memory is carried into the second same-session/same-NPC `openai-codex` prompt with `store=false`; `godot/tools/live_provider_thread_continuity_smoke.gd` live artifact proves Store Clerk `codex` then `codex-reply`, no fallback, no route mutation, final run estimate `$0.008913`, actual 2,975 input / 424 output / 3,399 total tokens. | PASS |
| Provider prompt treats NPC memory and policy as bounded context. | `npm run check --prefix backend/npc-runtime` passed with 141 tests after prompt coverage for `actorMemory` and `actorPolicy`; tests verify the prompt tells the provider not to infer hidden events, private intent, unobserved ledger facts, new affordances, authority, records, or state mutations. | PASS |
| Live LLM wording can run from the actual Godot `PlayableSession`. | `godot/tools/live_provider_dispatch_smoke.gd` drove `main.tscn`, called Store Clerk and Waiting Customer route-context packets, received `openai-codex` responses, and wrote a passing artifact. | PASS |
| Live provider output does not mutate records, economy, route, inquest, verdict, or session state. | Live provider dispatch artifact reports `providerDecisionMutatedRouteState=false`, `productProviderStateChanged=false`, `routeOutcome=clean_cover`, `sessionOutcome=cover_held`. | PASS |
| Live role voice is bounded enough for proof-only use. | Store Clerk returned `오늘도같은걸로드릴까요?`; Waiting Customer observed that live utterance and returned `줄은그대로네요.`; smoke rejects Waiting Customer player-blame phrases. | PASS |
| Codex gameplay QA is current after provider packet changes. | `$GODOT_BIN --headless --path godot --script res://tools/codex_gameplay_probe.gd` passed; status helper reports Codex source freshness pass; JSON SHA-256 `7116b486d7c8481e6b74de0094fd2de8d234527989b4e632ea7790135ab5af1d`. | PASS |
| Codex can play, inspect, and explain the proof cell through public APIs. | `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`: `ok=true`, `aiPlayerReport.pass=true`, `stage=inquest`, 23/23 accepted actions, 5/5 route reports, 23 explainability checks including actor memory and provider-packet actor policy readiness. | PASS |
| Packaged/tester setup remains ready. | `.game-harness/scripts/run-same-order-comprehension-session.sh --status`: packaged app preflight pass, `Human play display: ready: X display :99 is present`, and Codex gameplay QA pass. | PASS |
| Tester/facilitator helper is portable across current devices. | Status output now prints repo-local guide paths relative to the repo, session-kit examples use ignored `build/session-kits/same-order`, and `.game-harness/scripts/verify-comprehension-review-guards.sh` auto-loads the ignored device-local env and passes on Ubuntu ARM without manual `source`. | PASS |
| Linear SoT route exists for the external comprehension blocker. | Linear searches for `Dream of One comprehension fresh player Same Order GI-04 tester notes PENDING_TESTER_NOTES`, `Same Order`, and `fresh player comprehension tester notes` found no open matching issue. Recent tickets confirm team `Dream-of-one` (`DRE`). Tool discovery exposed a Linear issue-create action, but the connected account rejected creation with `Invalid scope: write or issues:create required`; `LINEAR_API_TOKEN` is unset for fallback. | FAIL |
| Goal work budget is accounted separately from game-provider spend. | Active Codex goal accounting is tracked by the Codex goal runtime. `npm run openai-codex:usage --prefix backend/npc-runtime` now reports checked-in provider-ledger and Godot live artifact usage without calling the provider: 9 recorded returned-usage calls, estimated `$0.03696975`, actual 9,489 input / 2,021 output / 11,510 total tokens. ChatGPT Pro remaining quota is not exposed by the provider payload. | PASS |
| External fresh-player comprehension exists. | Same status command: raw session note files `0 / 3`, strict review `PENDING_TESTER_NOTES`. | FAIL |
| Product/demo readiness can be claimed. | External comprehension gate remains open and product state remains `fallback_only_m1`; live wording is proof-only. | FAIL |

## Residual Gaps

- Player-visible live provider mode is not implemented. The current Godot
  proof calls `openai-codex` from smoke tools only, then proves fallback parity;
  HUD/Evidence truth still reports `fallback_only_m1`.
- Live LLM action selection is not product authority. The provider proposes
  bounded wording, while backend validation still owns action type, records,
  economy effects, Exposure, inquest, verdict, and session termination.
- Long-running live simulation remains unproven. Current live proof covers one
  two-actor dispatch chain and one two-turn same-NPC memory chain, not a
  sustained multi-agent scheduler across many route jobs.
- Action-space/tool definitions are present as deterministic route-context
  packets and public Codex gameplay actions, but exposing those as
  player-visible LLM-driven choices is a future mode decision, not current
  product behavior.
- Budget enforcement is practical but incomplete at the subscription level:
  model, reasoning, request count, estimated caps, fallback status, and
  returned token usage are recorded; ChatGPT Pro remaining quota is unavailable
  from these responses.
- Current local facilitator launch has a display path on this Ubuntu ARM shell:
  `.game-harness/scripts/run-local-display-session.sh` starts a localhost-bound
  Xvfb/fluxbox/x11vnc/noVNC stack, `--status` reports X display `:99` ready,
  noVNC serves `vnc.html`, and a timeout launch reaches the Godot GUI. Local
  screen proof captured `build/display-session/same-order-display-proof.png` as
  a 1280x720 nonblank root-window screenshot with grayscale mean `21349.3`.
  Observed human play still requires a fresh tester and an explicit secure
  access path to that localhost noVNC endpoint.
- Linear SoT routing is prepared but not created: the copy-ready draft targets
  `Dream-of-one` (`DRE`), but the connected Linear app lacks
  `write`/`issues:create` scope and `LINEAR_API_TOKEN` is unset for GraphQL
  fallback.

## Completion Decision

Do not mark the active goal complete.

The Codex-controllable live-provider and AI-play proof surface is current:
budgeted NPC-to-NPC `openai-codex` route-context dispatch works from the running
Godot scene, passes the first NPC's live utterance into the second NPC's
observed context, stays under the configured estimate cap, records actual token
usage, preserves deterministic fallback authority, and now maintains role voice
for the Waiting Customer proof. The same-session NPC continuity contract is now
also locked by backend tests and a Godot live smoke. The working Codex provider
route is `storeResponses=false` plus backend-owned workspace memory in the next
prompt; a provider-stored `previous_response_id` route was not accepted by the
live Codex endpoint during probing and should not be treated as current product
truth.

The remaining blocker is outside Codex-only control: observed fresh-player
comprehension notes. Current status is `0 / 3` raw sessions and
`PENDING_TESTER_NOTES`. No internal smoke, generated kit, screenshot, or Codex
gameplay report can close that gate.

There is also an administrative SoT gap: GI-04 is drafted and routed to the
`DRE` team, but it is not yet a Linear issue because the connected Linear app
rejects issue creation without `write`/`issues:create` scope and
`LINEAR_API_TOKEN` is unset for GraphQL fallback.

## Next Action

When a fresh tester is available, keep or start the local display stack:

```bash
.game-harness/scripts/run-local-display-session.sh start
```

Then confirm:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh --status
```

The `Human play display` line must be ready. Then run:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh
```

Then run the strict note review and copy accepted quote-reviewed findings into
the external comprehension ledger before any product/demo completion claim.

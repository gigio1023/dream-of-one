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
| Backend protects deterministic authority and rejects unavailable/hidden/forbidden provider actions. | `npm run check --prefix backend/npc-runtime` passed with 137 tests after the OpenAI Codex thread-continuity update. | PASS |
| Provider path uses the cheapest allowed Codex model by default. | `backend/npc-runtime/src/config.ts`, `.game-harness/provider/openai-codex-live-social-probe-2026-05-18.md`; default remains `openai-codex`, `gpt-5.4-mini`, low reasoning, no fallback models. | PASS |
| Live usage is budgeted and recorded. | `data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json`: 2 requests, total estimate `$0.0084375`, actual 2,275 input / 405 output / 2,680 total tokens, ChatGPT Pro remaining quota not exposed. | PASS |
| Same-session NPC memory/thread continuity is protected without extra live spend. | `backend/npc-runtime/test/integration/openai-proposal-provider.integration.test.ts`: second same session/NPC `openai-codex` decision sends `previous_response_id=resp-codex-first`, keeps `gpt-5.4-mini`, low reasoning, and streaming enabled; incremental LLM spend `$0`. | PASS |
| Live LLM wording can run from the actual Godot `PlayableSession`. | `godot/tools/live_provider_dispatch_smoke.gd` drove `main.tscn`, called Store Clerk and Waiting Customer route-context packets, received `openai-codex` responses, and wrote a passing artifact. | PASS |
| Live provider output does not mutate records, economy, route, inquest, verdict, or session state. | Live provider dispatch artifact reports `providerDecisionMutatedRouteState=false`, `productProviderStateChanged=false`, `routeOutcome=clean_cover`, `sessionOutcome=cover_held`. | PASS |
| Live role voice is bounded enough for proof-only use. | Store Clerk returned `오늘도같은걸로드릴까요?`; Waiting Customer returned `줄은잠깐멈췄네요.`; smoke rejects Waiting Customer player-blame phrases. | PASS |
| Codex gameplay QA is current after provider packet changes. | `$GODOT_BIN --headless --path godot --script res://tools/codex_gameplay_probe.gd` passed; status helper reports Codex source freshness pass; JSON SHA-256 `5575974bf9080739cf122e016ba8c9dfb6cb0aaf938dfb3247cf2ca416739827`. | PASS |
| Codex can play, inspect, and explain the proof cell through public APIs. | `data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json`: `ok=true`, `aiPlayerReport.pass=true`, `stage=inquest`, 23/23 accepted actions, 5/5 route reports, 22 explainability checks. | PASS |
| Packaged/tester setup remains ready. | `.game-harness/scripts/run-same-order-comprehension-session.sh --status`: packaged app preflight pass and Codex gameplay QA pass. | PASS |
| External fresh-player comprehension exists. | Same status command: raw session note files `0 / 3`, strict review `PENDING_TESTER_NOTES`. | FAIL |
| Product/demo readiness can be claimed. | External comprehension gate remains open and product state remains `fallback_only_m1`; live wording is proof-only. | FAIL |

## Completion Decision

Do not mark the active goal complete.

The Codex-controllable live-provider and AI-play proof surface is current:
budgeted two-actor `openai-codex` route-context dispatch works from the running
Godot scene, stays under the configured estimate cap, records actual token
usage, preserves deterministic fallback authority, and now maintains role voice
for the Waiting Customer proof. The same-session NPC thread-continuity contract
is now also locked by a no-live-spend integration test that proves the actual
`openai-codex` gateway resumes with `previous_response_id` on the second
decision for the same NPC.

The remaining blocker is outside Codex-only control: observed fresh-player
comprehension notes. Current status is `0 / 3` raw sessions and
`PENDING_TESTER_NOTES`. No internal smoke, generated kit, screenshot, or Codex
gameplay report can close that gate.

## Next Action

When a fresh tester is available, run:

```bash
.game-harness/scripts/run-same-order-comprehension-session.sh
```

Then run the strict note review and copy accepted quote-reviewed findings into
the external comprehension ledger before any product/demo completion claim.

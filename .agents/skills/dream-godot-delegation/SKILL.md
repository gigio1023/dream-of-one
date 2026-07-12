---
name: dream-godot-delegation
description: >
  Use when Dream of One work would require a long or high-volume Godot AI MCP
  session, repeated runtime inspection or captures, or any hands-on game
  playtest. Spawns one native in-session subagent under a Sol-high or Terra-high
  parent and returns compact evidence. NOT for code-only Godot edits, a bounded
  session preflight, backend-only work, or generic parallelization.
---

# Dream of One — Godot Delegation

Keep high-volume Godot AI traffic and live-run context in a native in-session
subagent. The lead owns scope, integration, and the final claim; the worker owns
one bounded editor/game run from preflight through stop.

Read `docs/tech/verification.md`, `docs/tech/godot-ai-playtest.md`, and the
repository `dream-godot-playtest` skill before delegating. Use
`references/worker-packet.md` to specify the job and
`references/native-subagent-routing.md` before spawning it.

## Decide Whether To Delegate

Keep work in the lead session when it needs only a bounded preflight such as
listing sessions, checking readiness, or reading one diagnostic result. Code,
bulk data, imports, and deterministic smokes remain file/CLI work unless live
state genuinely changes the next decision.

Delegate when any of these is true:

- the task requires a run lifecycle plus repeated scene-tree, property, log, or
  capture calls;
- reproducing a runtime issue needs an iterative observe/act/observe loop;
- a visual or player-facing claim needs several state transitions;
- any player input or hands-on gameplay is required.

Do not run two Godot workers against the same editor. While a worker owns the
run, the lead and other workers make no Godot AI calls and do not stop, restart,
or mutate that run.

Use the current harness's native subagent/thread/task capability. In Codex,
follow the in-session collaboration adapter in
`references/native-subagent-routing.md`; the worker remains a child of the
current conversation. Do not shell out to another agent process, CLI, or
harness as an automatic fallback. A different process is allowed only when the
user explicitly asks for that execution surface.

## Route The Worker

- Use a **GPT-5.6 Sol, high-effort parent session** for cross-layer diagnosis,
  unfamiliar scene or runtime reasoning, implementation decisions based on live
  evidence, and non-play inspection where each result may change the next call.
- Use a **GPT-5.6 Terra, high-effort parent session** for a bounded, already
  specified execution run. Every hands-on game playtest, player-input sequence,
  visual acceptance pass, and gameplay capture belongs here, even when the
  actions look simple.
- When a change needs both, finish and mechanically verify the implementation
  first with the lead/Sol lane, stop that run, then give a fresh Terra worker a
  closed play packet. Do not switch models midway through one run.
- When native spawn exposes a model/effort selector, pin it there. When it does
  not, native workers inherit the user-selected parent lane; record that the
  worker identity is inherited and not independently verifiable. If the current
  parent is not the required lane, stop and hand the packet to a correctly
  configured parent session rather than launching an external CLI.

Model and effort are runtime settings, not prose requests. Naming a model in a
worker prompt does not change it and must never be reported as proof.

## Worker Authority And Ownership

The packet declares exactly one authority mode:

- `inspect`: read files and native Godot AI state; no player input or edits;
- `play`: send bounded player input through the normal game path; no source
  edits or direct backend/world mutation;
- `implement`: edit only the listed files, then perform non-play inspection;
  actual play remains a separate Terra run.

Delegation never broadens user authority. Workers must preserve user changes,
never stage the untracked transfer documents, never expose secrets, and never
use curl or a hand-rolled HTTP client in place of native Godot AI MCP.

The worker selects the editor by canonical repository path and verifies the
pinned Godot/plugin/server versions. It may stop only the game run it started.
It may not quit or restart a user-owned editor, reinstall the integration,
change MCP client configuration, or use runtime mutation to manufacture a
state the test is meant to reach.

## Evidence Returned To The Lead

Return a compact packet containing:

- requested parent lane, whether worker identity was pinned or inherited,
  authority mode, selected project/session, and version preflight;
- the observed state transitions relevant to the objective, with semantic
  values and capture paths when required;
- new editor/game errors, fixture or live-provider provenance, and any fallback;
- files changed and checks run, when the packet allowed implementation;
- whether the worker-owned run stopped cleanly;
- a direct result: pass, fail, inconclusive, or blocked, plus the smallest next
  action.

Fixture inspection is engineering evidence only. It never proves live model
behavior, gameplay quality, or the fun gate. The lead inspects the worker
artifact or diff before integrating the claim.

## Stop And Recovery

Use one bounded recovery pass for session/helper connection failures, following
`dream-godot-playtest`. Stop rather than switching to curl, Computer Use, a
different model, or a restarted editor. If the worker edits outside its owned
scope, loses exact session identity, observes another process taking run
ownership, or cannot establish the packet's declared binding provenance,
terminate the lane and report the conflict.

## Gotchas

- A high number of calls alone does not justify parallel workers; one isolated
  Godot worker is the safe topology because editor/run state is shared.
- Current native Codex subagents inherit Godot AI MCP but expose no model/effort
  selector or identity. Route exact Sol/Terra work by the parent session until
  the native spawn surface proves otherwise.
- Native Godot AI calls can perturb timing. Prefer semantic checks at meaningful
  transitions over frame-by-frame polling, but do not reduce required evidence.
- A child session may discover the repo skills but not inherit the lead's loaded
  context. The packet must repeat its objective, authority, evidence, and stop
  rules.
- Worker output belongs in an ignored `build/` path or the harness result, not a
  tracked ledger or standing report.

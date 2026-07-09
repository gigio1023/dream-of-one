# M5 — Prologue Demo

**Status: queued.**

## Goal

Ship the honest public thing v1 never reached: a 15–30 minute prologue demo
on itch.io, Korean and English, desktop exports, with public copy that
matches the build exactly.

## Deliverables

**Game arc:** the prologue from
`scenario/bible/12-conversation-suspicion-prologue.md` — arrival, first
ordinary questioning, a middle where propagation tightens across the block,
and a finale reaching one of the four routes with an ending panel that
reconstructs the player's record trail. Three deterministic outcomes minimum
across the arc; replay produces a different trail.

**Localization:** EN parity for all player-facing text; localization smoke
covers both locales; KO voice review per the content guide.

**Release engineering:** Windows/macOS/Linux exports with the runtime
packaged (resolve the sidecar-vs-embedded decision from
[`../tech/architecture.md`](../tech/architecture.md) with real export
testing); first-run provider setup UX (works with zero keys → deterministic
mode; optional key entry for live texture); crash-safe session handling;
export smoke on a clean machine.

**Public page:** itch page with real screenshots/GIF from the shipped build,
AI disclosure (which providers may be used, what the LLM does and does not
control, deterministic mode guarantee), limitations list, credits
(art/licenses per `docs/art/CREDITS.md`), and a lightweight feedback funnel
(form link — input, never a gate).

**Polish pass:** art/UI consistency sweep, audio pass (ambient + interaction
+ conversation blips), performance sanity on low-end hardware (integrated
GPU, 60fps at 640×360 scale).

## Acceptance

- [ ] A stranger can download, launch, and finish the prologue on all three
      OSes without instructions.
- [ ] Zero-key first run reaches the same routes as live-profile runs.
- [ ] Every public claim on the itch page is true of the uploaded build.
- [ ] KO and EN full-run parity.
- [ ] Fun gate, plus the release question: "would I send this to a friend
      without apologizing?" Ship only on yes.

## Non-goals

Steam, pricing, campaign content beyond the prologue, marketing beyond the
itch page, live-ops/telemetry beyond local session logs.

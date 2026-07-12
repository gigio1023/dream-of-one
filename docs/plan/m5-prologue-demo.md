# M5 — Prologue Demo

**Status: queued — reconcile with the first-person direction at activation
(2026-07-11).** The public target (15–30 min honest demo, six locales, exports)
stands; the arc below predates the M3R conversion and the hearing-based run
frame ([`roadmap.md`](roadmap.md)), so rewrite the arc against shipped M3R/M4
reality before activating.

## Goal

Ship the honest public thing v1 never reached: a 15–30 minute prologue demo
on itch.io in Korean, English, Italian, Simplified Chinese, French, and
Japanese, with desktop exports and public copy that matches the build exactly.

## Deliverables

**Game arc:** the prologue from
`scenario/bible/12-conversation-suspicion-prologue.md` — arrival, first
ordinary questioning, a middle where propagation tightens across the block,
and a finale reaching one of the four routes with an ending panel that
reconstructs the player's record trail. Three deterministic outcomes minimum
across the arc; replay produces a different trail.

**Localization target:** KO-first parity for `ko-KR`, `en-US`, `it-IT`, `zh-CN`,
`fr-FR`, and `ja-JP` across authored and generated/fallback text. The M3R
localization smoke covers exact key and placeholder parity for all six; KO
voice review follows the content guide, and each translation receives a
language review before release.

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
- [ ] All six target locales have complete authored content and one full-run
      parity pass; generated/fallback text uses the selected run locale.
- [ ] Fun gate, plus the release question: "would I send this to a friend
      without apologizing?" Ship only on yes.

## Non-goals

Steam, pricing, campaign content beyond the prologue, marketing beyond the
itch page, live-ops/telemetry beyond local session logs.

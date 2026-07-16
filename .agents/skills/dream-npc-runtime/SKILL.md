---
name: dream-npc-runtime
description: Use when changing, reviewing, or diagnosing backend/npc-runtime in dream-of-one — run/session lifecycle, NPC scheduler and memory, stance/hearing judgment, records and civic ledger, provider ports/adapters/profiles, locale-aware envelopes, fail-visible provider interruption, or runtime tests. Triggers include "RunService", "provider profile", "adapter", "envelope", "provider failure", "stance", "hearing", "ledger", "tool validation", and "run/session API". NOT for Godot scene/HUD work (dream-godot-client) or authoring player-facing content (dream-content-authoring).
---

# Dream of One — NPC Runtime

Change `backend/npc-runtime` (TypeScript on Bun) without moving judgment
authority or breaking the provider boundary. Paths below are from the
repository root. The docs cited here are the source of truth; this skill is
the task-time contract, not a replacement for them.

## The One Law: Judgment vs Validity

The model owns *meaning*; deterministic code owns *validity*.

- Model-owned (never hardcode): NPC wording, reply suggestions, suspicion
  judgment with why-lines, next tool proposals, and — once the active
  milestone reaches them — Station verdicts.
- Runtime-owned (never delegate): per-NPC sight/context separation, tool
  validation of every world mutation, delta and score clamps, civic-ledger
  append, run revision and scheduling validity, evidenced-vouch quorum, and
  conversation/run lifecycle validity. Provider failure is an explicit
  interruption, never a synthetic ending.

Decision rule from `docs/vision/design-pillars.md`: if a rule decides the
*content* of a judgment, move that decision into the model's context; if it
protects the *validity* of the world, keep it deterministic.

If any doc or comment conflicts with this split, the owner-direction block
in `docs/vision/design-pillars.md` wins; fix the stale text, don't follow
it.

## Provider Boundary

- Game logic depends only on `NpcProposalPort`. Vendor SDK imports live
  only in adapters under `src/providers/adapters/`, and no vendor base URL
  is hardcoded outside them — config and registry code may resolve and pass
  endpoint values from profiles and env vars.
- Profiles are config (`backend/npc-runtime/providers.config.json`); model
  ids are opaque profile data; availability is proven by an opt-in live
  smoke, never assumed.
- Production provider failure is fail-closed and player-visible. No rule,
  line bank, or scripted adapter may replace NPC speech, social judgment,
  action choice, memory, testimony, or verdict. Preserve the exact request for
  retry and apply no world or social mutation until a validated live result
  succeeds.
- Scripted proposal sequences live only in `src/providers/testing/`; the
  scripted adapter is injected by tests and is never selectable from
  production config.
- Production storylets carry scene facts, actor goals, ending thresholds,
  and outcome presentation only — no choice arrays, reply sequences,
  classification rules, or ordered social consequences.
- Never leak a projected route or ending into model context; NPC goals carry
  the NPC's own perceived state, not a route hint.
- Secrets are env vars (`OPENAI_API_KEY`, `MODELSCOPE_API_KEY`, ...) —
  never in config, logs, fixtures, or commits.

## Runtime Invariants (do not renegotiate per slice)

1. Every packet crossing a process boundary validates against schema on both
   sides.
2. Conversation turns stay ordered per `conversation.turnId` — no
   latest-wins coalescing.
3. NPC context assembly enforces visibility: nothing the NPC couldn't have
   seen, heard, or read enters its packet.
4. World mutations happen only through validated tools, and each emits
   exactly one civic ledger event.
5. A session reaches its authored ending only through a valid model result.
   Failure preserves the exact request; the player may retry it or abandon
   the interrupted run, but the runtime never manufactures an ending.
6. Outcome presentation cites only ledger events that actually exist.
7. A `runId` owns all six actor memories and stances, records, ledger,
   institutional pressure, unpaused clock, hearing state, provider budget,
   and monotonic world revision. Conversation sessions are children and may
   not reset run state.
8. Background proposals carry their observed run revision and are revalidated
   on arrival. Ambient provider waits never pause the world; effects that
   finish during a player-modal conversation queue until it closes.
9. Personal stance changes only from remembered validated speech. Record
   reads may update facts or institutional pressure; a vouch also requires
   meaningful first-hand player conversation.

Player-visible text is Korean-first but resolves in the run's immutable
supported locale. Every nonempty Korean player-visible field must contain at
least one Hangul code point at the envelope boundary (ids and tool names are
exempt). Natural Korean may include Latin-script names, established acronyms,
numerals, and occasional Hanja; pure English, pure Chinese/Hanja, digits-only,
or punctuation-only fields are invalid. This is a lightweight presence guard,
not a style classifier: wording remains provider-owned and content review owns
language quality. Every locale independently rejects canonical internal
stable-ID shapes from player-visible fields; tool arguments and internal
rationale remain exempt. Non-Korean locales additionally require at least one
code point from the locale's permitted writing systems. This catches obvious
source-language leakage but does not pretend a script regex can distinguish
English, Italian, and French or Chinese from all-kanji Japanese. Fallback
lines must stay in-fiction and use the same run locale — no goal strings, meta
text, or cross-locale leakage into dialogue.

## Verification

Default check for any backend slice (kept fast by policy — see
`docs/tech/npc-runtime.md`):

```bash
bun run --cwd backend/npc-runtime check
```

Full ladder, run/session API parity, owner-set Sol/Terra execution routing,
and the Qwen-only opt-in live-provider rule:
`docs/tech/verification.md`. Live provider smokes are manual and never CI.
Add a test only when it protects deterministic authority, schema
compatibility, the provider boundary, or a player-visible consequence.

## Read Before Editing

| Doc | When |
|---|---|
| `docs/tech/ai-provider-ports.md` | ports, adapters, envelope, failure, budgets |
| `docs/tech/npc-runtime.md` | module map, invariants, sidecar API |
| `docs/game/npc-agent-loop.md` | loop shape, tool catalog, memory bounds |
| `docs/vision/design-pillars.md` | authority questions, unacceptable failures |

## Gotchas

- A blocked or busy tool result must change the NPC's next step; an
  identical retry against the same blocked state is a bug.
- Conversation history sent to the model includes both sides of the
  exchange; an NPC that forgets or contradicts its own words is an
  owner-set unacceptable failure, not flavor.
- Timeouts and token budgets are sized for judgment-grade calls; do not
  reintroduce bark-sized budgets from M1.
- `/health/ready` is process readiness, not live-provider proof. Only response
  metadata showing the pinned profile, live transport, and no provider interruption
  satisfies model-backed acceptance.
- Do not build standing trackers, evidence ledgers, or proof reports around
  this work — see `docs/history/v1-postmortem.md`.

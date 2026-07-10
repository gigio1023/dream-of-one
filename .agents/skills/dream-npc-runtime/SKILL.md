---
name: dream-npc-runtime
description: Use when changing backend/npc-runtime in dream-of-one — session engine, agent loop, suspicion judgment, records and civic ledger, provider ports/adapters/profiles, envelope schemas, fallback, or runtime tests. Triggers include "provider profile", "adapter", "envelope", "fallback", "suspicion judgment", "ledger", "tool validation", and "Session API". NOT for Godot scene/HUD work (dream-godot-client) or authoring Korean player-facing content (dream-content-authoring).
---

# Dream of One — NPC Runtime

Change `backend/npc-runtime` (TypeScript on Bun) without moving judgment
authority or breaking the provider boundary. Paths below are from the
repository root. The docs cited here are the source of truth; this skill is
the task-time contract, not a replacement for them.

## The One Law: Judgment vs Validity

The model owns *meaning*; deterministic code owns *validity*.

- Model-owned (never hardcode): NPC wording, reply suggestions, suspicion
  judgment with why-lines, next tool proposals, and (from M3) Station
  verdicts.
- Runtime-owned (never delegate): per-NPC sight/context separation, tool
  validation of every world mutation, delta and score clamps, civic-ledger
  append, guaranteed session ending.

Decision rule from `docs/vision/design-pillars.md`: if a rule decides the
*content* of a judgment, move that decision into the model's context; if it
protects the *validity* of the world, keep it deterministic.

## Provider Boundary

- Game logic depends only on `NpcProposalPort`. Vendor SDK imports and base
  URLs exist only in adapters under `src/providers/adapters/`.
- Profiles are config (`backend/npc-runtime/providers.config.json`); model
  ids are opaque profile data; availability is proven by an opt-in live
  smoke, never assumed.
- Deterministic fallback must always work and is visibly marked in
  `ProposalMeta`. It is resilience, never the product experience.
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

From `docs/tech/npc-runtime.md`:

1. Every packet crossing a process boundary validates against schema on both
   sides.
2. Conversation turns stay ordered per `conversation.turnId` — no
   latest-wins coalescing.
3. NPC context assembly enforces visibility: nothing the NPC couldn't have
   seen, heard, or read enters its packet.
4. World mutations happen only through validated tools, and each emits
   exactly one civic ledger event.
5. Every session reaches an ending; the runtime owns that guarantee even
   when the judgment inside it is the model's.
6. Outcome presentation cites only ledger events that actually exist.

Player-visible text is Korean-first and passes the modern-Korean script
check at the envelope boundary (ids and tool names exempt). Fallback lines
must stay in-fiction — no goal strings, meta text, or English leaking into
dialogue.

## Verification

Default check for any backend slice (keep it under ~60s):

```bash
bun run --cwd backend/npc-runtime check
```

Full ladder, Session API parity script, and opt-in spend-bearing provider
smokes: `docs/tech/verification.md`. Live provider smokes are manual and
never CI. Add a test only when it protects deterministic authority, schema
compatibility, the provider boundary, or a player-visible consequence.

## Read Before Editing

| Doc | When |
|---|---|
| `docs/tech/ai-provider-ports.md` | ports, adapters, envelope, fallback, budgets |
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
- Do not build standing trackers, evidence ledgers, or proof reports around
  this work — see `docs/history/v1-postmortem.md`.

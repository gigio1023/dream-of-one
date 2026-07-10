# M2 — LLM-Native Agent Loop

**Status: active.**

## Goal

Replace the scripted production policy with one provider-backed proposal
boundary. NPC dialogue, player reply suggestions, and the next world tool call
are generated from bounded context. The runtime still owns validation,
suspicion, records, authority, and terminal outcomes.

`Same Order` remains a regression scenario, not a dialogue tree. Fixed lines,
tool sequences, and failures may exist only in the scripted test adapter and
generated fixtures.

## Player-visible deliverables

- The Clerk's question and three reply suggestions are generated for the live
  context; typed input remains available.
- An NPC performs a three-to-six-step observe → propose → validate → result
  loop. A blocked tool result is sent back to the provider and visibly changes
  the next proposal.
- The HUD identifies the active provider/fallback state and exposes the short
  transcript used to explain the NPC's action.
- Network failure or budget exhaustion continues play through bounded fallback
  without pretending that fallback is live AI.

## Technical deliverables

- `NpcProposalPort` is the only domain dependency. It exposes generated turns
  and next-step proposals.
- `TextGenPort` adapters implement Chat Completions, Responses, and scripted
  test transport. Vendor URLs, keys, and model identifiers stay in profiles.
- Production selection defaults to a real provider profile. `scripted/test` is
  injectable from tests and fixture generation only.
- Provider envelopes validate with zod before reaching game logic. Tool calls
  then pass through the same deterministic world validators as any fallback.
- Storylet data contains scene facts, actor goals, deterministic thresholds,
  and outcome presentation. It does not contain authored player choices, NPC
  replies, or ordered route consequences.

## Acceptance

- [x] No production storylet contains pre-authored choice arrays, NPC response
      lines, or ordered consequence chains.
- [x] A provider proposal chooses both utterance/reply suggestions and the next
      tool call through ports; no vendor import appears outside adapters.
- [x] A scripted adapter drives deterministic scenarios without a test branch
      in the agent loop or `SessionService`.
- [x] A blocked result changes the next provider proposal and appears in the
      Session API transcript.
- [x] Provider timeout, invalid output, missing credentials, and budget
      exhaustion produce explicit fallback metadata while play continues.
- [x] `bun run --cwd backend/npc-runtime check`, Session API parity, and Godot
      route smoke pass.
- [ ] One opt-in live provider smoke succeeds when credentials are available.

## Non-goals

Multiple locations, long-horizon memory, provider-owned suspicion or verdicts,
and broad concurrent society scheduling. Those scale in M3/M4 after this loop
is playable.

# M2 — LLM-Native Agent Loop

**Status: active.** Rewritten 2026-07-10 after the owner interview moved
judgment authority to the model (see
[`../vision/design-pillars.md`](../vision/design-pillars.md)).

## Goal

The model becomes the NPCs' actual mind in the live build: it writes the
dialogue, judges how suspicious each answer is (and says why), decides the
next world action, and its record-writing visibly changes how another NPC
behaves. Deterministic code keeps validity only — sight/context separation,
tool validation, bounded deltas, and a session that always ends.

`Same Order` remains a regression scenario, not a dialogue tree. Fixed lines,
tool sequences, and route outcomes exist only in the scripted test adapter
and generated fixtures.

## Player-visible deliverables

1. **A clerk that judges.** The player answers with a generated suggestion or
   a short typed phrase; the live model reads the content, moves suspicion,
   and the reason it gives appears on the HUD as the why-line. Rules only
   clamp the per-turn delta, keep context visibility honest, and guarantee
   the session ends. Provider failure shows the fallback label and switches
   to the deterministic classifier.
2. **A record that another NPC reads.** A model-proposed `write_record`
   actually lands in the ledger, and a second NPC (manager or waiting
   customer) reads it during the ambient loop and visibly changes behavior
   (speech bubble, reaction marker). The game client calls the ambient
   decision endpoint during real play — not only in tests.
3. **An NPC that remembers its own words.** The conversation history sent to
   the model contains both sides of the exchange, so an NPC cannot
   contradict what it just said (owner-set unacceptable failure #3).
4. **Honest endings.** The outcome panel cites only ledger events that exist
   and never narrates a consequence that did not happen.

## Technical deliverables

- `NpcProposalPort` gains `judgeConversationTurn`; the deterministic signal
  classifier becomes its fallback implementation and stops being the product
  default.
- Session state keeps a two-sided dialogue history and feeds it to
  conversation, judgment, and agent-step requests.
- The runtime never leaks a projected ending to the model; NPC goals carry
  the NPC's own perceived state (its suspicion, its pressure), not a route
  hint.
- The ambient decision path covers the ambient NPCs (waiting customer,
  manager) and is wired into the Godot client's play loop.
- Provider runtime budgets fit judgment-grade calls (timeout and token
  ceilings raised from the M1 values).
- Storylets carry scene facts, actor goals, ending thresholds, and outcome
  presentation only. Classification rules do not live in storylet data.

## Acceptance

- [ ] One opt-in live provider smoke succeeds (conversation + judgment) with
      the checked-in default profile. **Run before everything else once
      credentials exist on a dev machine; this is the milestone's declared
      risk.**
- [ ] Playing in a real window: a typed improvised answer moves suspicion
      with a model-authored why-line on the HUD (fallback label when the
      provider is down).
- [ ] Playing in a real window: a model-proposed record write appears in the
      ledger and a second NPC visibly reacts to it in the same session.
- [ ] A conversation running three or more turns shows no self-contradiction
      of the NPC's own prior lines in the transcript.
- [ ] The outcome panel's cited ledger ids exactly match the session ledger;
      a no-record session shows the no-record ending text.
- [ ] `bun run --cwd backend/npc-runtime check`, Session API parity, and
      Godot route smoke (fixture + scripted modes) pass.

## Non-goals

Multiple locations, cross-session memory, local model support, save/load, and
broad concurrent society scheduling. Station verdict reversal through
argument (the model judging intake → inquest → verdict end-to-end) is the
next milestone's centerpiece; M2 only moves conversation suspicion judgment
to the model.

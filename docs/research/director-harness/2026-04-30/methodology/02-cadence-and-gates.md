# Director Cadence and Gates

## Cadence

Use three loops with different scope.

| Loop | Frequency | Purpose | Output |
|---|---|---|---|
| Director Tick | Every major design/implementation request | Decide whether the request belongs to the game | decision record |
| Milestone Review | End of prototype/slice/demo phase | Decide whether the project advances | milestone verdict |
| Strategy Retro | After playtest/demo/public feedback | Decide what to keep, cut, or reposition | roadmap update |

## Director Tick

Inputs:
- current thesis
- creative pillars
- current milestone
- latest evidence
- requested change

Process:
1. Identify which pillar the request supports.
2. Identify anti-pillar risk.
3. Dispatch council only if the decision is ambiguous or high impact.
4. Record decision, rejected alternatives, required evidence.
5. Convert approved decision into execution handoff.

Pass:
- request strengthens at least one pillar.
- scope fits current milestone.
- evidence requirement is concrete.

Block:
- request makes a different game.
- request is cosmetic proof without playable consequence.
- request creates AI authority drift.

## Milestone Review

Inputs:
- milestone brief
- playable proof
- Godot/backend evidence
- council reviews
- playtest notes
- drift log

Questions:
- Did this milestone prove the intended product risk?
- Is the next stage cheaper because this evidence exists?
- What can be cut because it is no longer needed?
- What must not be promised publicly yet?

Verdicts:
- `ADVANCE`: move to next milestone.
- `CONDITIONAL`: advance only with listed corrections.
- `REPEAT`: rerun milestone with narrowed scope.
- `CUT`: remove or replace the strategy.

## Strategy Retro

Use when:
- playtest reveals misunderstanding.
- public demo or pitch feedback arrives.
- Codex-generated content changes perceived identity.
- 2D/3D or AI contract needs reconsideration.

Retro sections:
- What the player understood.
- What the player misunderstood.
- Which pillar survived.
- Which pillar failed to appear.
- What evidence is missing.
- What to cut before next work.

## Evidence Gates

| Gate | Evidence |
|---|---|
| Direction | thesis and pillar alignment |
| Playability | playable path, screenshot/video, player action timeline |
| Determinism | backend schema/check, evidence JSON, why-lines |
| 3D Value | contact sheet showing spatial pressure and Station authority |
| AI Contract | Codex proposal/fallback record, no verdict ownership |
| Release Truth | store/demo/pitch copy matches build |

## Council Dispatch Rule

Use council lanes when:
- direction is ambiguous,
- public promise may change,
- AI behavior can affect product authority,
- the team is about to commit to a vertical slice,
- visual polish may hide weak gameplay.

Do not use council lanes for:
- typo-only edits,
- already-approved implementation tasks,
- purely mechanical refactors with no player-facing impact.

# M1 Protocol Proof

Status: technical conditional pass; product closure pending
Owner: Director reducer plus Systems/Godot/Narrative lanes

## Product Risk

The game may have a strong premise but no proven playable protocol where text becomes Evidence, Evidence changes Exposure, and the player sees consequence.

## Player Experience Target

Within five minutes, the player should understand:
- their answer can be used against them.
- Station systems are evaluating their text.
- consequence is rule-owned, not arbitrary prose.

## Scope In

- one Station intake text surface.
- one safe response.
- one risky response.
- one Exposure delta.
- one visible consequence.
- one Evidence why-line.
- deterministic fallback if the API provider, configured model, or proposal validation is unavailable.

## Scope Out

- full inquest.
- final verdict as a release-complete loop.
- multi-location route.
- open NPC chat.
- final art/audio pass.
- public demo packaging.

## Required Evidence

| Gate | Artifact |
|---|---|
| Direction | council reviews show no pillar block |
| Determinism | backend check and fixture for safe/risky responses |
| Runtime | Evidence JSON with why-line and Exposure delta |
| Godot | scene smoke plus screenshot showing consequence |
| AI Contract | Provider proposal is wording-only and cannot alter action, risk, Evidence, threshold, or verdict |
| Localization | Korean source text and English equivalent preserve consequence |

## Required Council Lanes

- Dream Law Counsel
- Text Danger Reviewer
- Station Pressure Reviewer
- Godot Evidence Reviewer
- Systems Producer

## Exit Verdict

Allowed verdicts:
- `ADVANCE`: proceed to M2 Social Pressure Prototype.
- `CONDITIONAL`: fix listed evidence gaps before M2.
- `REPEAT`: narrow M1 and rerun.
- `CUT`: abandon this protocol shape.

Current verdict:
- `M1_CONDITIONAL`: local backend/Godot/Evidence proof exists, but council/product review and external player comprehension evidence are not complete.

## Implementation Handoff Requirement

Completed handoff names:
- exact backend files.
- exact Godot files.
- fixture paths.
- screenshot/evidence paths.
- verification commands.
- owner for each path.

## Current Evidence

- Backend check passes with OpenAI/API proposal-provider fallback and trajectory diversity tests.
- Godot shell/runtime/playable Evidence Packs validate through backend Schema.
- Playable forced path reaches a visible verdict state as proof evidence, not as a release-complete loop.
- Godot bridge smoke proves readiness fallback semantics without requiring a live API key.
- Live backend/provider integration and exported build provider UX remain follow-up blockers before public/demo claims.

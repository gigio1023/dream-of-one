# Cover Tests

Cover Tests determine whether the player's social cover holds under NPC and Station pressure.

The detailed scenario source for detector triggers, speech-act outcomes, artifacts, escalation, defuse options, and why-lines is `docs/scenario/bible/06-cover-tests-and-evidence.md`.

| ID | Trigger | Expected Defuse |
|---|---|---|
| CT_STORE_QUEUE_LANGUAGE | Player violates Store queue language or skips procedure. | Restate item count and confirm label. |
| CT_STUDIO_APPROVAL_GATE_SPEECH | Player asks for approval without source, owner, and reason. | Provide all required procedural fields. |
| CT_PARK_OBSERVATION_PRESSURE | Player narrates the dream state or breaks public flow. | Return to public-flow observation language. |
| CT_STATION_SOFT_INQUEST | Station intake sees inconsistent or non-procedural speech. | Answer only procedural questions consistently. |

Every Cover Test needs detector trigger, escalation ladder, generated artifact, defuse option, and why-line Evidence.

## Scenario Expansion Requirement

Before a Cover Test is implemented in Godot or the backend, it must have:

- a readable rule-before-risk text surface;
- an examiner NPC;
- a bounded speech-act matrix for `SA_COMPLY`, `SA_INQUIRE`, `SA_FRAME`, and `SA_BREAK`;
- an artifact output;
- a deterministic Exposure delta;
- a Station transition rule when thresholds are crossed;
- Korean source why-line and English localization intent.

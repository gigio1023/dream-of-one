# Cover Tests

Cover Tests determine whether the player's social cover holds under NPC and Station pressure.

Status: internal harness and legacy design support.

The player-facing redesign is conversation-first. See `docs/direction/08-conversation-suspicion-redesign.md`.

Cover Tests may still exist as backend/internal proof concepts, but they should not be the primary player-facing interaction model. The player should see NPC prompts, three dialogue choices, and optional free input, not abstract Cover Test buttons or `SA_*` labels.

The legacy scenario source for detector triggers, speech-act outcomes, artifacts, escalation, defuse options, and why-lines is `docs/scenario/bible/06-cover-tests-and-evidence.md`. It needs a conversation-first rewrite before it is used as public/player-facing canon.

| ID | Trigger | Expected Defuse |
|---|---|---|
| CT_STORE_QUEUE_LANGUAGE | Player violates Store queue language or skips procedure. | Restate item count and confirm label. |
| CT_STUDIO_APPROVAL_GATE_SPEECH | Player asks for approval without source, owner, and reason. | Provide all required procedural fields. |
| CT_PARK_OBSERVATION_PRESSURE | Player narrates the dream state or breaks public flow. | Return to public-flow observation language. |
| CT_STATION_SOFT_INQUEST | Station intake sees inconsistent or non-procedural speech. | Answer only procedural questions consistently. |

Every player-facing pressure test now needs a conversation prompt, choice set, optional free-input policy, deterministic suspicion signal rules, escalation ladder, generated artifact, defuse or repair option, and why-line Evidence.

## Scenario Expansion Requirement

Before a pressure test is implemented in Godot or the backend, it must have:

- an examiner NPC;
- a three-choice dialogue set with safe/local, uncertain/repair, and risky/weird intent;
- optional free-input classification rules if free input is exposed;
- deterministic suspicion signals;
- an artifact output;
- a deterministic suspicion/report/Exposure delta;
- a Station transition rule when thresholds are crossed;
- Korean source why-line and English localization intent.

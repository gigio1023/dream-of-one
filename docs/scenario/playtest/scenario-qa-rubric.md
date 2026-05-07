# Scenario QA Rubric

A Dream of One scenario is game-ready only when it proves the playable loop, not just the lore.

## Acceptance Criteria

| Gate | Requirement |
|---|---|
| Canon | Player is not investigator; NPCs/Station investigate; dialogue is danger surface. |
| Critical path | NPC prompt, three dialogue choices, optional recorded free input if enabled, deterministic suspicion signal, NPC reaction, social report or repair, Station consequence. |
| Runtime mapping | Every beat maps to a conversation id, prompt id, choice/free-input record, suspicion signal, suspicion/report delta, Evidence event, or verdict/defuse result. |
| No lore-only pass | Any beat that cannot be observed, triggered, logged, or validated fails review. |
| Fresh-player comprehension | Testers can explain who they are, what pressure they are under, next action, and why Exposure changed. |
| Narrative QA | No canon drift, proper-noun drift, unexplained logic jump, missing line, inconsistent Station authority, or meta Dream Law exposition. |
| Vertical slice | Godot presentation, HUD, controls, readable text, bounded choices, backend/schema authority, Evidence, and visual capture work together. |
| Regression | Backend and Godot import/smoke/runtime/playable/localization/visual gates pass. |

## Required Artifacts

- Scenario brief.
- Beat-to-runtime matrix.
- Canon trace.
- Playtest script.
- Narrative QA sheet.
- Evidence Packs: shell, runtime slice, playable slice.
- Screenshots or video: opening state and verdict/defuse state with readable HUD and why-line.
- Bug/decision log split into blocking, polish, docs, and deferred follow-up.

## Review Checklist

- Can the player infer the objective from the game, not docs?
- Is danger delivered through NPC dialogue, conversation memory, and NPC/Station pressure?
- Does each conversation pressure beat have prompt, choice set, optional free-input policy, suspicion signal, escalation ladder, repair option, generated artifact, and why-line?
- Do player-facing inputs read as speech instead of abstract speech-act buttons?
- Does suspicion/Exposure/report pressure change for a concrete reason visible in Evidence?
- Are Station intake, Inquest, verdict, and termination deterministic?
- Does the scenario produce testable artifacts, not just story notes?
- Do screenshots prove legibility and end-state feedback?
- Do docs and implementation name the same IDs for Dream Laws, Cover Tests, zones, and artifacts?

## Playtest Script

| Step | Facilitator Instruction | Observe |
|---|---|---|
| Launch | Do not explain premise beyond controls. | Does player identify who is talking to them and what response is available? |
| First prompt | Let player pick any dialogue choice. | Can they tell which answer sounded locally normal or strange? |
| Optional input | If enabled, let player type one statement. | Do they understand it becomes a recorded statement, not safe chat? |
| Social reaction | Let the NPC probe or share suspicion. | Does the player notice NPC unease before Station pressure? |
| Return Station | Do not explain artifacts. | Does player understand intake/Inquest pressure references prior conversation? |
| End state | Ask what caused the outcome. | Can player name witness, artifact, or rule? |

## External References

- [MDA Framework](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)
- [Game Developer: The Challenge of Finding Enough Playtesters](https://www.gamedeveloper.com/design/the-challenge-of-finding-enough-playtesters)
- [SFWA: QA and Storytelling in Video Games](https://www.sfwa.org/2024/10/01/qa-and-storytelling-in-video-games/)
- [Game Developer: What You Should Take Out of Pre-Production](https://www.gamedeveloper.com/game-platforms/what-you-should-take-out-of-pre-production)
- [Unity testing and QA tips](https://unity.com/how-to/testing-and-quality-assurance-tips-unity-projects)

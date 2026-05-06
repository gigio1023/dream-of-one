# Scenario Authoring Method

## Purpose

This method converts story intent into playable audit events. A line, prop, NPC pressure beat, or location detail should not enter the small release unless it can be read, triggered, logged, repaired, localized, and verified.

## Research Basis

The method combines:

- MDA: connect mechanics, runtime dynamics, and intended player emotion.
- Failbetter-style storylets: design state requirements and results before prose.
- social-stealth level language: teach permissible behavior before punishment.
- environmental narrative: space and props carry procedure, not only lore.
- human-AI interaction guidance: make AI behavior bounded, inspectable, and recoverable.

See `07-research-source-map.md` for sources.

## Authoring Order

1. Name the pressure question.
2. Name the public rule the player can learn before risk.
3. Define the Cover Test and deterministic outcomes.
4. Define the NPC examiner and allowed Codex pressure.
5. Define the player speech acts.
6. Define Evidence, Exposure delta, Station effect, and why-line.
7. Place the rule, examiner, and artifact in the 3D hub.
8. Write Korean source lines.
9. Add English localization intent.
10. Add QA proof.

Do not write flavor first. If the state structure fails, polished prose becomes throwaway work.

## Beat Contract

Every playable beat must fill this contract.

| Field | Required | Rule |
|---|---:|---|
| `beatId` | Yes | Stable ID, e.g. `B02_STORE_QUEUE_NORMALIZATION`. |
| `minuteRange` | Yes | Target first-run time range. |
| `locationId` | Yes | One of Station, Store, Studio, Park. |
| `playerFacingQuestion` | Yes | What the player is trying to do now. |
| `criticalInfo` | Yes | The one fact/rule the player must understand. |
| `textSurfaceId` | Yes | Sign, notice, receipt, board, or HUD text that teaches rule before risk. |
| `dreamLawId` | Yes | Canonical rule ID from scenario bible or runtime data. |
| `coverTestId` | Yes | Canonical test ID. |
| `triggerCondition` | Yes | Observable runtime condition, not prose implication. |
| `examinerId` | Yes | NPC or Station subsystem that examines the player. |
| `speechActs` | Yes | Bounded choices: comply, inquire, frame, break. |
| `codexRoleCard` | If NPC | Role card allowed to produce pressure line only. |
| `defuseVector` | Yes | How the player can repair or reduce future risk before verdict. |
| `failForwardConsequence` | Yes | Record, artifact, or narrowed Station question. |
| `exposureDelta` | Yes | Deterministic delta or range owned by backend. |
| `evidenceArtifact` | Yes | Artifact ID emitted or updated. |
| `whyLineTemplate` | Yes | Player-facing cause/effect explanation. |
| `barkTriggers` | Yes | Hint, warning, escalation, recovery, or state echo. |
| `stationStateEffect` | Yes | None, intake flag, Inquest flag, verdict-ready edge. |
| `qaProof` | Yes | Smoke, scripted run, screenshot, or playtest question. |

## Storylet Shape

Use one storylet per Cover Test.

| Phase | Dream of One Form |
|---|---|
| Setup | Public text surface explains procedure. |
| Choice | Player enters zone and chooses a bounded speech act. |
| Result | NPC/Station pressure, Evidence, Exposure, why-line, next objective. |
| Repair | A later rule, document, or Station answer can narrow or defuse the record. |

## Banned Beat Types

| Bad Beat | Why It Fails |
|---|---|
| Lore-only sign | Does not teach a procedure or create risk. |
| Generic AI chat | Cannot be QAed against deterministic outcomes. |
| Hidden rule punishment | Feels arbitrary because rule was not visible before risk. |
| NPC whim verdict | Breaks backend authority and player trust. |
| Dead-end failure | Stops the social-stealth loop instead of creating records. |
| Pure ambience bark | Competes with critical procedural text. |

## Line-Level Rules

- One line has one job: rule, pressure, hint, warning, evidence, repair, or verdict.
- A suspicious NPC line must name an observed mismatch.
- A why-line must name trigger, witness/system, record, and consequence.
- Korean source copy is authoritative; English preserves function and pressure.
- No shipped line may introduce a new law, witness, artifact, or verdict unless that ID already exists in runtime state.

## QA Checklist

A beat is ready only when:

- the player can read the rule before risk;
- the trigger is observable in runtime;
- each speech act has deterministic consequence;
- Codex output can vary phrasing without changing facts;
- failure produces a record, not a stop;
- at least one repair vector exists before verdict-ready;
- Evidence can reconstruct the state change;
- Korean and English strings fit the same UI surfaces;
- a blind tester can explain why Exposure changed.

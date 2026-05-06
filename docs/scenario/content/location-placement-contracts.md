# Location Placement Contracts

Scenario docs must be placement contracts, not prose-only art briefs. Every placed thing must answer:

- what procedure it teaches;
- which Cover Test it pressures;
- which route exposes it;
- which NPC or Station system can observe it;
- which Evidence can result.

## Scenario Schema

```yaml
scenario_id: StationSoftInquest
world_revision: rev-social-stealth-v1
opening:
  spawn_anchor: Station.front_door
  first_read_target: Station.intake_board
  initial_stage: ambient
locations:
  - id: Store
    procedure_theme: queue speech only
    primary_text_surface: TS_Store_QueueRules
    primary_cover_zone: StoreCounterZone
    public_route_ids: [CivicLoop, StoreQueue]
    required_sightlines:
      - from: Store.front_door
        to: Store.label_board
        purpose: rule-before-risk
    spaces:
      approach: Store.front_door
      threshold: Store.queue_start
      pressure_zone: Store.counter
      evidence_surface: Store.label_board
    props:
      procedural: [queue markers, label board, counter bell]
      witness: [clerk marker, customer position]
      route: [path stripe, door cue]
    lighting:
      public_pool_anchor: Store.front_door
      rule_light_anchor: Store.label_board
      escalation_light_anchor: Store.counter
    audio_motifs:
      - id: AM_Store_LabelTick
        anchor: Store.label_board
        radius_m: 6
        stage: ambient
    evidence_outputs: [QueueMismatchEvent, WitnessStatement]
```

## Placement Table

| Layer | Required Instruction | Quality Bar |
|---|---|---|
| Text surface | `id`, `anchor`, `law_id`, `cover_test_id`, body, evidence outputs, readable approach angle. | Visible before the player enters the related Cover Test zone. One Dream Law, one procedure, no meta exposition. |
| Route | Ordered anchor list, purpose, intended first and second read, NPC route overlap. | Route teaches procedure through movement. No important rule is off-route. |
| Landmark | Silhouette, front door, work anchor, evidence anchor, color/material cue. | Player can identify Store, Studio, Park, and Station from spawn or first loop without docs. |
| Sightline | `from`, `to`, expected distance, obstruction rule, narrative purpose. | At least one rule-before-risk line, one witness-to-player line, one Station-pull line. |
| Space | Approach, threshold, work/pressure zone, observation pocket, exit/return. | Player feels socially watched, not physically trapped. |
| Props | Semantic category, anchor, free asset path or primitive, non-authority note. | Props clarify procedure but never own gameplay truth. IDs remain in layout/schema. |
| Lighting | Public route pool, rule focus, pressure focus, Station escalation cue. | Light guides attention without making text unreadable. |
| Audio motif | `id`, anchor, radius, stage, loop/one-shot, evidence-neutral purpose. | Positional cue reinforces location/procedure but never replaces text or Evidence. |

## Location Matrix

| Location | Text Surface | Route And Space | Props | Lighting | Audio Motif |
|---|---|---|---|---|---|
| Store | `TS_Store_QueueRules` at `Store.label_board`; teaches wait, item count, label confirmation. | `StoreQueue`: queue start -> counter -> board. Board visible from queue start before counter pressure. | counter, label board, printer/bell, queue markers. | warm public pool at door, brighter board strip, small counter pressure pool. | label tick, receipt print, counter bell. |
| Studio | `TS_Studio_ApprovalCriteria` at `Studio.criteria_wall`; teaches source, owner, reason. | `CivicLoop` entry plus review queue to approval desk. Criteria wall visible from approval desk side angle. | kanban, approval desk, terminal/server slot, RC insert marker. | cooler work light, focused approval desk light. | keyboard loop, projector hum, approval stamp. |
| Park | `TS_Park_NoticeBoard` at `Park.notice_board`; teaches public-flow observation. | gate -> bench/photo spot -> notice board. Photo spot exposes witness sightline, not hidden-corner play. | notice board, bench, photo spot marker, low fence/path stones. | soft public pool at gate, notice board highlight, open space. | wind/leaf ambience, distant civic murmur, camera shutter. |
| Station | `TS_Station_IntakeRules` at `Station.intake_board`; teaches procedural speech only. | `StationIntake`: waiting line -> report desk -> intake board. Spawn pulls eye toward Station first. | report desk, intake board, evidence board, printer, barriers/cones. | strongest rule light at intake board, hard desk light, verdict accent. | fluorescent hum, printer strip, radio tick. |

## Capture Views

Each scenario implementation must define:

| View | Purpose |
|---|---|
| Spawn overview | Player sees Station pull, public route, and first rule direction. |
| Rule-before-risk | Text surface readable before Cover Test trigger. |
| Witness line | Examiner NPC can plausibly observe the player. |
| Verdict state | HUD, final why-line, and Station surface remain readable. |


# Lane 02: Implementation And Assets

Status: source-backed research lane
Date: 2026-05-15

## Implementation Caveat

This lane does not claim exact code or exact asset packs for the reference
games. The games are not open source. The implementation map below is a
confidence-labeled reconstruction from public feature sets, engine docs, common
sim architecture, and the current Dream of One codebase.

## Typical Low-Budget Sim Architecture

| System | Likely implementation | Confidence | Why it matters |
|---|---|---|---|
| First-person controller | Unity/Godot controller, camera, collision, input map | strong inference | lets the player inhabit a workplace cheaply. |
| Interaction focus | raycast/area detection, highlighted object, prompt, use/hold action | strong inference | keeps UI simple and object-driven. |
| Data definitions | ScriptableObjects/resources/JSON rows for products, rooms, staff, prices | strong inference | lets small teams add content without hard-coding every item. |
| NPC customers | state machine plus navigation agent to queue/service/exit points | strong inference | creates visible demand. |
| Object placement | grid/snap, validation, placed-object save data | strong inference | makes expansion feel physical. |
| Inventory/stock | product counts, storage, shelf slots, deliveries | strong inference | makes business operation repeatable. |
| Economy/reputation | calculators for money, rating, review, demand | strong inference | converts work into progress. |
| Staff delegation | task assignment, skill/level, wage, task timer | strong inference | lets complexity grow without forcing all manual labor. |
| Save/load | serialized world objects, money, stock, day, tasks | strong inference | required for multi-session operation sims. |
| Achievements/tasks | counters and thresholds | observed in Steam pages/achievements | makes repeated low-cost content feel goalful. |

Unity docs support common ingredients:

- ScriptableObjects are data containers that can separate content data from
  logic.
- NavMeshAgent supports navigation/pathfinding and avoidance for moving
  characters.

Godot equivalents:

- Resources can store reusable data.
- NavigationAgent3D can pathfind and avoid obstacles when navigation data is
  available.

## Current Dream of One Mapping

Observed repo state:

| Existing piece | File | What it already gives |
|---|---|---|
| World layout | `godot/data/world_layout.json` | Store, Studio, Park, Station, anchors, routes, interaction zones, notice records, actors. |
| Playable session | `godot/scripts/runtime/playable_session.gd` | Same Order prompts, choices, suspicion/report weights, recorded statement, evidence events. |
| HUD | `godot/scripts/ui/social_stealth_hud.gd` | pressure, recent records, choice panel, why-line, route outcome. |
| Backend conversation evaluator | `backend/npc-runtime/src/runtime/conversation-suspicion.ts` | deterministic signal detection, suspicion/report deltas, consequence stages, why-lines. |
| Runtime schema | `backend/npc-runtime/src/godot/runtime-schema.ts` | validates Godot observation/action payloads and evidence semantics. |
| Storylet packet | `docs/scenario/content/same-order-storylet-packet.md` | procedure cues, records, repair windows, Station citation requirements. |

Dream of One is already strong in deterministic consequence. It is weaker in
operation-sim tactility:

- Store objects are mostly semantic, not enough stateful props.
- The record chain is more visible in logs/HUD than in the world.
- NPC customer/witness pathing is minimal.
- The player does not yet perform a repeated workplace action beyond choosing
  lines.
- Save/load is not the design proof target yet.

## Dream Object-State Model

Same Order should get a tiny object-state table before adding new story:

| Object | States | Player action | System action | Evidence event |
|---|---|---|---|---|
| Queue mark | unread/read/active | stand near, interact/read | enables clerk prompt | `store_queue_cue_read` |
| Usual-order board | unread/read/cited | inspect | exposes expected order phrase | `store_usual_order_read` |
| Receipt tray | empty/normal/correction/marked | receive/read receipt | stores line summary | `store_receipt_created` |
| Correction slip | absent/offered/attached/rejected | accept or reject correction | changes repair state | `store_correction_recorded` |
| Report tray | idle/pending/filed | watch/read handoff | opens Station reference | `store_report_handoff` |
| Station dossier | absent/open/cited/closed | inspect/respond | compares Store record | `station_record_cited` |

The target is not more UI. The target is a player who can point at the world and
say, "That record is why the Station asked me."

## Minimal Godot Work Packages

| Work package | Scope | Cut rule |
|---|---|---|
| `GS-OPS-01` Store record props | Add simple meshes/labels for board, tray, slip, report tray, dossier anchors. | No asset shopping beyond small props. |
| `GS-OPS-02` Object state registry | Store object states in session summary and evidence events. | No general inventory system. |
| `GS-OPS-03` Handoff animation/cue | Clerk glance, tray state, or sound cue when report is created. | No complex cutscene. |
| `GS-OPS-04` Station citation panel | Show exact Store line and record ID before Station answer. | No case-board detective UI. |
| `GS-OPS-05` Watcher path | One waiting customer or manager route if needed for public pressure. | No crowd simulation. |
| `GS-OPS-06` Comprehension capture | Screenshot/contact sheet plus tester explanation. | No M2 content until this passes. |

## Asset Bill Of Materials

Use this BOM before purchasing or importing assets.

| Asset category | Minimum need | Candidate source type | License/proof requirement |
|---|---|---|---|
| Store counter props | tray, receipt, label board, paper slips, bag | CC0/free pack, Kenney-style props, custom low-poly | source URL, license note, screenshot in context. |
| Station office props | desk, dossier, folders, stamp, lamp | CC0/free office pack or custom meshes | source URL, license note, screenshot in context. |
| UI icons | record, correction, report, warning, citation | icon pack with clear license or handmade | source URL/license, size/readability capture. |
| NPC placeholder | clerk/witness/officer bodies | existing placeholder or licensed low-poly pack | source URL/license, no uncited marketplace rip. |
| Audio cues | receipt print, stamp, drawer, report ding | CC0/freesound/handmade | source URL/license, volume check. |
| Typography | readable Korean/English font | existing project font or open license | license note, Korean glyph coverage. |

Do not import a full supermarket/motel simulator template. Dream of One's core
rules live in the backend and Godot session logic, and template logic would
create more migration risk than value.

## Asset-Fit Checklist

Every imported asset must pass:

- Does it help Store procedure -> player line -> record -> Station citation?
- Is the license clear for redistribution?
- Can it be replaced later without changing deterministic rules?
- Does it read at gameplay distance?
- Does it support Korean labels or avoid text entirely?
- Does it avoid shifting the game into motel/shop economy fantasy?

## Implementation Standard

For each operation-sim feature:

1. Define the object state table.
2. Add deterministic backend/session event fields.
3. Add the Godot prop or UI panel.
4. Capture screenshot/contact sheet.
5. Run route evidence.
6. Ask a fresh player/proxy what happened.

No feature counts as complete because it exists in code. It counts only when
the player can read the state change and the evidence explains the same chain.

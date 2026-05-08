# Schema And Action Specification

This file is the project-scoped Godot migration Schema guide. The authoritative implementation is `backend/npc-runtime/src/godot/runtime-schema.ts`; Godot may run a parity validator, but it must not loosen backend semantics.

## Common Semantics

| Item | Required meaning |
|---|---|
| `schemaVersion` | required string; current value `godot-runtime-v1` |
| `sessionId` | required stable string for one playable run |
| `worldId` | required stable string for the loaded Godot world instance |
| `worldRevision` | required string; changes when topology, landmark, text-surface, or domain rule data changes |
| time fields | integer milliseconds; `timestampMs` and `issuedAtMs` use Unix epoch milliseconds |
| coordinates | Godot global 3D coordinates, 1 unit = 1 meter, `x` right, `y` up, `z` forward/back |
| enum source | `backend/npc-runtime/src/contracts/types.ts` and `backend/npc-runtime/src/godot/runtime-schema.ts` |
| Reason Codes | `GODOT_REASON_CODES` in `runtime-schema.ts` |

## ObservationFrame

Required fields:

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | string | must equal `godot-runtime-v1` |
| `sessionId` | string | active session |
| `worldId` | string | active Godot world |
| `worldRevision` | string | active topology/rule revision |
| `frameId` | string | stable frame Evidence join id |
| `timestampMs` | integer | Unix epoch milliseconds |
| `deltaMs` | integer | frame delta in milliseconds |
| `npcId` | string | observing NPC |
| `playerId` | string | player id, currently `player` |
| `landmarkId` | string | current semantic landmark |
| `position` | `Vector3` | NPC global position |
| `nearbyActors` | string[] | known nearby actor ids |
| `visibleLandmarks` | string[] | semantic landmark ids |
| `visibleTextSurfaces` | object[] | text surface observations with Dream Law and Cover Test ids |
| `recentEvents` | string[] | bounded recent runtime events |
| `organizationContext` | object | NPC role/org context |
| `playerSignals` | object | bounded player speech/input signals |
| `socialLoopStage` | enum | `ambient`, `report`, `intake`, or `verdict` |
| `exposure` | object | Exposure score and thresholds |
| `station` | object | Station intake/Inquest/verdict/session termination flags |
| `evidence` | object[] | generated Evidence artifacts |

Optional fields:

- `zoneId`
- `velocity`
- optional keys inside `playerSignals`

## NpcCommandEnvelope

Required fields:

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | string | must equal `godot-runtime-v1` |
| `commandId` | string | idempotency key; must not replay completed commands |
| `sessionId` | string | must match active session |
| `worldId` | string | must match active world |
| `worldRevision` | string | must match active topology/rule revision |
| `npcId` | string | known actor id |
| `issuedAtMs` | integer | non-negative Unix epoch milliseconds |
| `timeoutMs` | integer | positive milliseconds |
| `actionType` | enum | `Move`, `Talk`, `Ask`, `Observe`, `Work`, `Report`, `Escort`, `Idle` |
| `target` | object | action-specific target |
| `reasonCodes` | string[] | non-empty deterministic Reason Code list |
| `expectedStage` | enum | expected social loop stage |
| `source` | enum | `codex`, `fallback`, or `test-fixture` |

Optional fields:

- `utterance`, required for `Talk` and `Ask`.
- `target.actorId`
- `target.landmarkId`
- `target.zoneId`
- `target.textSurfaceId`
- `target.position`

## Validation Rules

- Reject wrong `schemaVersion`, session, world, or world revision.
- Reject unknown `npcId`.
- Reject commands for actors in `inFlightActorIds`.
- Reject `commandId` values already present in `completedCommandIds`.
- Reject unknown `target.actorId`, `target.landmarkId`, `target.zoneId`, or `target.textSurfaceId`.
- Reject missing action-specific targets.
- Reject empty `reasonCodes`.
- Reject invalid social loop stage.
- Reject before world mutation; rejected commands must select deterministic fallback or explicit blocked outcome.

## Valid Command Example

```json
{
  "schemaVersion": "godot-runtime-v1",
  "commandId": "cmd-godot-move-1",
  "sessionId": "dre-171-runtime-slice-session",
  "worldId": "dre_171_godot_shell",
  "worldRevision": "rev-social-stealth-v1",
  "npcId": "NPC_Station_Officer",
  "issuedAtMs": 1777286120462,
  "timeoutMs": 1000,
  "actionType": "Move",
  "target": { "position": { "x": 8.4, "y": 0.0, "z": -13.0 } },
  "reasonCodes": ["godot_runtime_slice_move"],
  "expectedStage": "intake",
  "source": "test-fixture"
}
```

## Invalid Command Example

```json
{
  "schemaVersion": "godot-runtime-v1",
  "commandId": "cmd-godot-unknown-zone-1",
  "sessionId": "dre-171-runtime-slice-session",
  "worldId": "dre_171_godot_shell",
  "worldRevision": "rev-social-stealth-v1",
  "npcId": "NPC_Station_Officer",
  "issuedAtMs": 1777286120462,
  "timeoutMs": 1000,
  "actionType": "Move",
  "target": { "zoneId": "MissingZone" },
  "reasonCodes": ["godot_runtime_slice_move"],
  "expectedStage": "intake",
  "source": "test-fixture"
}
```

Expected result: reject with `schema_unknown_zone` before world mutation and select deterministic Idle fallback.

## Source Runtime Compatibility

Mineflayer compatibility is semantic only. Godot must preserve bounded action semantics, Reason Codes, Evidence joins, and deterministic domain outcomes; it does not preserve Mineflayer package names, plugin hooks, or block-coordinate implementation details.

Compatibility mapping:

| Source concept | Godot migration equivalent |
|---|---|
| bot/entity id | `npcId` / `ActorId` |
| block or position target | semantic landmark/zone/text-surface id or Godot `Vector3` |
| tick/event time | millisecond timestamp |
| chat/report event | bounded player signal, command event, or Evidence artifact |
| invalid plugin/action call | Schema rejection plus fallback |
| movement result | observed bounded Godot movement outcome |

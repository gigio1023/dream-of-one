# Dream of One — Execution Plan (Roads + Text Communication)

Revision date: 2026-01-23
Scope: Map readability + text-first social simulation

## 0) Constraints (must stay true)
- Scene authority: `Assets/Scenes/Prototype.unity`
- Determinism: core simulation remains rule-based
- Diagnostics gate: `Tools/DreamOfOne/Run Diagnostics` must be clean after Unity changes

## 1) Goals (problem framing)
- Roads must be readable and navigable (clear silhouettes, minimal clutter)
- Text-based communication is primary (dialogue feed, readable logs, clear evidence reasoning)
- NPC routines feel like a living society loop (roles + routines + incidents)

## 2) Plan of record (checklist)

### A. Map readability pass (roads visible)
- [x] Reduce non-essential props in `CITY_Package` (trees, hedges, lamps, bus stop, traffic lights, benches)
- [x] Keep core landmarks (Store, Studio, Park, Station, Cafe) and primary roads/sidewalks
- [x] Ensure NavMesh respects obstacles after prop cleanup
- [ ] Rebuild world if needed and verify player/NPC navigation on roads

### B. Text-first communication pass
- [x] NPC dialogue must appear without LLM (deterministic fallback)
- [x] Persistent dialogue feed on HUD (not only transient toast)
- [x] Event log remains readable with NPC utterances distinguished
- [x] Case summary shows rules + witnesses for verdict reasoning

### C. Social simulation clarity
- [x] Role-based NPC routines target relevant landmarks
- [x] Rumor trust weighted by speaker role
- [x] Objective guidance for landmark visits

### D. QA gates
- [ ] `Tools/DreamOfOne/Run Diagnostics` clean
- [ ] Play session validates: roads visible, dialogue feed updates, NPCs move on roads

## 3) Implementation notes
- Map pass focuses on deactivating clutter under `CITY_Package` rather than deleting assets.
- Text-first pass prioritizes UI visibility and deterministic fallbacks.
- All changes must keep MCSS loop intact (events → gossip → evidence → verdict).

## 4) Next run focus
- Verify road visibility and NPC walking lanes in a 10–12 min session.
- If clutter remains, remove additional CITY_Package props or replace with a simplified road prefab set.

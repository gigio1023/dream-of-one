# Terminology

Use these canonical terms in docs, issue bodies, PR text, and user-facing runtime strings.

| Term | Meaning |
|---|---|
| Runtime Path | The active executable game/runtime stack. Current value: Godot 4.x + TypeScript NPC backend. |
| Godot world | The loaded 3D scene and scene-local runtime state. |
| ObservationFrame | Godot-to-backend perception payload for one NPC decision point. |
| NpcCommandEnvelope | Backend-to-Godot bounded action payload. |
| Evidence Pack | Release-review artifact containing runtime events, summaries, and pass/fail context. |
| Fallback Path | Deterministic non-LLM response selected when validation, timeout, parsing, or policy fails. |
| Dream Law | Diegetic rule surfaced through text-pressure design. |
| Cover Test | Social-stealth test that evaluates whether the player's cover work holds. |
| Exposure | Deterministic suspicion pressure score with thresholds. |
| Station intake | Station-side procedural intake stage. |
| Inquest | Escalated Station investigation stage. |
| Verdict | Deterministic end-state decision after enough Evidence exists. |
| Session termination | Rule-owned end of the current run. |

Avoid legacy engine terms in new work. Use `Schema` or `Specification` for API/data semantics, not informal contract wording.

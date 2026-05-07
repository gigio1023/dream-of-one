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
| Dialogue choice | Player-facing line option shown as plausible speech. Default prompts should usually offer three choices: safe/local, uncertain/repair, and risky/weird. |
| Optional free input | Player-entered recorded statement. It is not open chatbot play and must be classified by deterministic rules before it can affect state. |
| Suspicion signal | Deterministic classification of conversational weirdness, such as local routine mismatch, dream-language leak, memory gap, contradiction, evasion, or over-explanation. |
| Social report | NPC or system handoff that turns local suspicion into Station-visible pressure. |
| Cover Test | Legacy/internal social-stealth test that evaluates whether the player's cover work holds. It is not the primary player-facing interaction model after the conversation redesign. |
| Exposure | Deterministic suspicion pressure score with thresholds. |
| Station intake | Station-side procedural intake stage. |
| Inquest | Escalated Station investigation stage. |
| Verdict | Deterministic end-state decision after enough Evidence exists. |
| Session termination | Rule-owned end of the current run. |
| Scenario Bible | Scenario source under `docs/scenario/`; useful for NPC, location, Dream Law, and voice material, but it needs conversation-first rewrite where it still centers abstract speech acts or Cover Test buttons. |
| why-line | Short state-change reason line that explains trigger, witness, record, Exposure delta, and Station transition when applicable. |

Avoid legacy engine terms in new work. Use `Schema` or `Specification` for API/data semantics, not informal contract wording.

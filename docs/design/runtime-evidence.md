# Runtime Evidence

Runtime Evidence is generated from Godot and backend checks.

## Required Evidence

- Shell Evidence Pack: `data/evidence/godot/shell/dre_171_shell_evidence.json`
- Runtime slice Evidence Pack: `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- Backend Schema validation via `backend/npc-runtime/src/godot/runtime-schema.ts`

## Evidence Families

- `session`
- `observation`
- `ai`
- `command`
- `fallback`
- `domain`
- `evidence_export`

## Pass Criteria

Evidence must include stable `sessionId`, `worldId`, `worldRevision`, actor identity when applicable, command identity when applicable, social loop stage, reason fields for rejection/fallback, and verdict/end-state trace summaries.

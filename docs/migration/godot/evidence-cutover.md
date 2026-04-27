# Godot Evidence Cutover

Godot Evidence is now the active migration Evidence namespace.

## Required Artifacts

- `data/evidence/godot/shell/dre_171_shell_evidence.json`
- `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- `data/evidence/godot/screenshots/main-shell.png`

## Validation

Evidence Packs must validate through `backend/npc-runtime/src/godot/runtime-schema.ts` and include stable `runId`, `sessionId`, `worldId`, `worldRevision`, event family, and summary fields.

Runtime smoke must fail if a valid command rejects, if a rejected command lacks
Reason Codes, or if generated world layout failures are present. Visual evidence
must show the active Godot shell rather than relying only on text inspection.

## Next Cutover Work

- Add live Godot-to-backend bridge Evidence.
- Add full domain-loop Evidence.
- Add three-run trajectory diversity Evidence.

# Runtime Evidence

Runtime Evidence is generated from Godot and backend checks.

## Required Evidence

- Shell Evidence Pack: `data/evidence/godot/shell/dre_171_shell_evidence.json`
- Runtime slice Evidence Pack: `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json`
- Playable slice Evidence Pack: `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json`
- Opening screenshot: `data/evidence/godot/screenshots/main-shell.png`
- Verdict screenshot: `data/evidence/godot/screenshots/playable-verdict.png`
- Backend Schema validation via `backend/npc-runtime/src/godot/runtime-schema.ts`
- Three-run trajectory diversity validation via `backend/npc-runtime/test/integration/trajectory-diversity.integration.test.ts`

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

Three-run trajectory diversity validation must compare Godot Evidence Packs through backend Schema validation and identity-free behavior signatures. It must fail when three packs only differ by run/session/timestamp identity, and pass only when the three runs show distinct safe, risky, and verdict/social end-state trajectories.

Playable scenario Evidence must also reconstruct:

- trigger;
- witness;
- record;
- stage transition;
- outcome;
- Korean-facing why-line intent;
- Station authority transition when intake, Inquest, verdict, or session termination changes.

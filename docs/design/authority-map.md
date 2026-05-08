# Authority Map

| Area | Authority | Files |
|---|---|---|
| Product rails | Design Specification | `project.md`, `docs/design/game-design.md` |
| Dream Law and Cover Test content | Design Specification | `docs/design/dream-laws.md`, `docs/design/cover-tests.md` |
| Runtime Schema | TypeScript backend | `backend/npc-runtime/src/godot/runtime-schema.ts` |
| Backend validation and scheduling | TypeScript backend | `backend/npc-runtime/src/runtime/**` |
| 3D world presentation | Godot | `godot/**` |
| Evidence validation | Backend plus generated Evidence | `docs/design/runtime-evidence.md`, `data/evidence/godot/**` |

Release pass/fail decisions must use Godot Runtime Path Evidence.

## AI Proposal Boundary

| Provider May Propose | Provider Must Not Decide |
|---|---|
| NPC line candidates, Station pressure wording, localized variants, fallback text variants. | Suspicion signals, risk tags, Evidence type, why-line authority, Exposure, reports, Station intake, Inquest, verdict, or session termination. |

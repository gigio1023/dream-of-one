# Dream of One

Dream of One is a Godot 4.x 3D social-stealth game prototype.
NPC social pressure is proposed by AI-facing systems, validated by a TypeScript backend, and expressed through a bounded Godot world runtime.

## Current Runtime Path

- Engine: Godot 4.x 3D project under `godot/`
- Backend: TypeScript NPC runtime under `backend/npc-runtime/`
- Evidence: Godot Evidence Packs under `data/evidence/godot/`
- Migration source of truth: `docs/migration/godot/`
- Canonical design docs: `project.md`, `docs/design/game-design.md`, `docs/design/dream-laws.md`, `docs/design/cover-tests.md`

Previous Unity and Mineflayer runtime trees have been removed from this branch.
New implementation work should target the Godot project and TypeScript backend only.

## Authority Boundary

Godot owns visible 3D scene state, player and NPC bodies, collision observations, text-surface visibility, routes, zones, and bounded command execution results.

Godot does not own deterministic end-state adjudication. The TypeScript backend and deterministic product-rule controller own Schema validation, command admission/rejection, Exposure threshold crossing, Station intake/Inquest transitions, verdict readiness, session termination, fallback selection, and Evidence Pack validation.

## Run Checks

Install backend dependencies once:

```bash
npm install --prefix backend/npc-runtime
```

Run the backend Schema and integration checks:

```bash
npm run check --prefix backend/npc-runtime
```

Run the Godot import, syntax, scene, runtime, Evidence, and visual gates:

```bash
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

Validate the checked-in Godot Evidence Packs against the backend Schema:

```bash
cd backend/npc-runtime
node --import tsx -e 'import { readFileSync } from "node:fs"; import { validateGodotEvidencePack } from "./src/godot/runtime-schema.ts"; for (const path of ["../../data/evidence/godot/shell/dre_171_shell_evidence.json", "../../data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json"]) { const result = validateGodotEvidencePack(JSON.parse(readFileSync(path, "utf8"))); if (!result.ok) { console.error(path, JSON.stringify(result.failures, null, 2)); process.exit(1); } console.log(JSON.stringify({ ok: true, path, events: result.value.events.length })); }'
```

## Runtime Evidence

The current migration slice validates:

- Godot 3D scene shell loads with player, landmarks, NPC placeholders, routes, zones, and text surfaces.
- Godot runtime Schema validates ObservationFrame, NpcCommandEnvelope, EvidenceEvent, and EvidencePack fixtures.
- Runtime slice emits Station intake, command validation/rejection, fallback selection, bounded `CharacterBody3D` movement, and text-pressure Evidence.
- Missing semantic anchors fail shell inspection through `generation_failures`.
- Visual evidence is captured at `data/evidence/godot/screenshots/main-shell.png`.

## Migration Docs

- `docs/migration/godot/target-godot-architecture.md`: runtime boundary, determinism boundary, and Godot component ownership.
- `docs/migration/godot/schema-and-action-specification.md`: ObservationFrame and NpcCommandEnvelope Schema semantics, units, enums, examples, and compatibility notes.
- `docs/migration/godot/validation-gates.md`: required commands, artifacts, owners, and pass/fail criteria.
- `docs/migration/godot/linear-issue-breakdown.md`: executor-ready Linear issue shape and acceptance criteria.
- `docs/migration/godot/evidence-cutover.md`: active Evidence namespace and remaining cutover gates.

## Pending Gates

- Live Godot-to-backend bridge.
- Full report-intake-Inquest-verdict domain loop.
- Multi-run trajectory diversity Evidence.
- Exported build smoke after export presets exist.

# Dream of One

Dream of One is a Godot 4.x 3D conversation social-stealth game prototype.
NPC social pressure is expressed through dialogue choices, a bounded typed-free-input path that can record statements as Evidence, deterministic suspicion signals, and Station reports. An API-based proposal provider may propose wording when available, but a TypeScript backend validates and owns consequence.
The current checked-in build proves the Godot/backend runtime slice, playable Evidence export, trajectory diversity verification, and bridge fallback smoke. It does not yet prove a shipped live API proposal-provider loop.

## Current Runtime Path

- Engine: Godot 4.x 3D project under `godot/`
- Backend: TypeScript NPC runtime under `backend/npc-runtime/`
- Evidence: Godot Evidence Packs under `data/evidence/godot/`
- Migration source of truth: `docs/migration/godot/`
- Canonical design docs: `project.md`, `docs/direction/08-conversation-suspicion-redesign.md`, `docs/design/game-design.md`, `docs/design/dream-laws.md`, `docs/design/social-causality-verification.md`

Previous Unity and Mineflayer runtime trees have been removed from this branch.
New implementation work should target the Godot project and TypeScript backend only.

## Authority Boundary

Godot owns visible 3D scene state, player and NPC bodies, collision observations, text-surface visibility, routes, zones, and bounded command execution results.

Godot does not own deterministic end-state adjudication. The TypeScript backend and deterministic product-rule controller own Schema validation, command admission/rejection, Exposure threshold crossing, Station intake/Inquest transitions, verdict readiness, session termination, fallback selection, and Evidence Pack validation.

## AI Proposal Provider

- AI output is a proposal source, not product authority.
- The intended release path is an API-based proposal provider behind backend/runtime validation, not a player-installed Codex CLI prerequisite.
- Provider and GPT model availability must be checked at runtime before enabling live AI text.
- `gpt-5.4-nano` is not assumed. No fixed GPT model name is release truth unless the configured provider verifies it at runtime.
- If the provider is unavailable, deterministic fallback owns line selection, consequence, and Evidence.
- The target player-facing loop is three dialogue choices plus optional typed free input. Recorded statements are Evidence artifacts, not open-ended NPC chat. The provider may vary wording, but deterministic rules own suspicion signals, report thresholds, Exposure, Evidence, verdict, and session end.

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
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/live_backend_bridge_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

Validate the checked-in Godot Evidence Packs against the backend Schema:

```bash
cd backend/npc-runtime
node --import tsx -e 'import { readFileSync } from "node:fs"; import { validateGodotEvidencePack } from "./src/godot/runtime-schema.ts"; for (const path of ["../../data/evidence/godot/shell/dre_171_shell_evidence.json", "../../data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json", "../../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"]) { const result = validateGodotEvidencePack(JSON.parse(readFileSync(path, "utf8"))); if (!result.ok) { console.error(path, JSON.stringify(result.failures, null, 2)); process.exit(1); } console.log(JSON.stringify({ ok: true, path, events: result.value.events.length })); }'
```

## Runtime Evidence

The current migration slice validates:

- Godot 3D scene shell loads with player, landmarks, NPC placeholders, routes, zones, and text surfaces.
- Godot runtime Schema validates ObservationFrame, NpcCommandEnvelope, EvidenceEvent, and EvidencePack fixtures.
- Runtime slice emits Station intake, command validation/rejection, fallback selection, bounded `CharacterBody3D` movement, and text-pressure Evidence.
- Playable slice exports backend-valid Evidence Pack for a forced `Same Order` conversation path: risky dialogue choice, preset recorded statement carried through the free-input Evidence contract, suspicion/report, and Station inquest.
- The old forced Station intake/verdict proof path is internal harness evidence, not the target conversation-first player-facing loop.
- Three-run trajectory diversity verification fails identity-only replay and passes safe/risky/verdict Evidence Pack variation.
- Godot bridge smoke proves provider-readiness fallback semantics without requiring a live API key.
- Missing semantic anchors fail shell inspection through `generation_failures`.
- Renderer-backed visual capture now produces Store conversation screenshots and a contact sheet; human readability review is still pending.

## Migration Docs

- `docs/migration/godot/target-godot-architecture.md`: runtime boundary, determinism boundary, and Godot component ownership.
- `docs/migration/godot/schema-and-action-specification.md`: ObservationFrame and NpcCommandEnvelope Schema semantics, units, enums, examples, and compatibility notes.
- `docs/migration/godot/validation-gates.md`: required commands, artifacts, owners, and pass/fail criteria.
- `docs/migration/godot/linear-issue-breakdown.md`: executor-ready Linear issue shape and acceptance criteria.
- `docs/migration/godot/evidence-cutover.md`: active Evidence namespace and remaining cutover gates.

## Pending Gates

- Live API proposal-provider preflight, model availability check, validation, fallback, and Evidence from a configured provider.
- Live Godot-to-backend provider integration beyond fixture/fallback bridge smoke.
- Live provider-backed conversation wording in Godot; current playable proof is deterministic fallback/local runtime.
- Manual typed free-input UI if free input stays in the demo promise.
- Repair/replay contrast for safe, uncertain, and risky conversation routes beyond the forced risky plus preset-free-input smoke path.
- External player comprehension evidence for the M1 product gate.
- Exported build smoke after export presets exist.

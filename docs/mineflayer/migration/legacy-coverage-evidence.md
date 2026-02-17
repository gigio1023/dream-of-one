# Migration Evidence: Legacy Coverage

## Intent
- Provide detailed, auditable evidence that all legacy Mineflayer documentation topics are preserved in the canonical hierarchy.
- Confirm canonical ownership before legacy file removal.

## Scope
- Legacy source set (removed after migration):
  - `docs/spec/mineflayer/mineflayer-research-analysis.md`
  - `docs/spec/mineflayer/mineflayer-typescript-runtime-spec.md`
  - `docs/spec/mineflayer/mineflayer-ai-assistant-action-api-spec.md`
  - `docs/spec/mineflayer/mineflayer-typescript-api-reference.md`
  - `docs/spec/mineflayer/mineflayer-typescript-implementation-guide.md`
  - `docs/spec/mineflayer/mineflayer-typescript-tutorial-deep-dive.md`
  - `docs/spec/mineflayer/mineflayer-typescript-index.md`
  - `docs/spec/mineflayer/mineflayer-documentation-hierarchy.md`
- Canonical target set:
  - `docs/mineflayer/**`

## File-Level Coverage Matrix
| Legacy document | Primary canonical owner(s) | Coverage status |
|---|---|---|
| `mineflayer-research-analysis.md` | `foundation/context.md`, `foundation/constraint-trace.md` | complete |
| `mineflayer-typescript-runtime-spec.md` | `spec/runtime.md`, `spec/event-lifecycle.md` | complete |
| `mineflayer-ai-assistant-action-api-spec.md` | `spec/action-api.md` | complete |
| `mineflayer-typescript-api-reference.md` | `reference/api-catalog.md` | complete |
| `mineflayer-typescript-implementation-guide.md` | `guides/implementation.md`, `guides/events.md` | complete |
| `mineflayer-typescript-tutorial-deep-dive.md` | `guides/tutorial.md`, `guides/implementation.md` | complete |
| `mineflayer-typescript-index.md` | `index.md` | complete |
| `mineflayer-documentation-hierarchy.md` | `index.md`, `migration/crosswalk.md` | complete |

## Section-Level Preservation Map

### `mineflayer-research-analysis.md`
- Status Snapshot / Intent / role boundary:
  - preserved in `foundation/context.md` (`Status Snapshot`, `Intent`, `Scope`).
- Evidence baseline / repository profile / architecture analysis:
  - preserved in `foundation/context.md` (`Evidence Baseline`, `Repository Profile`, `Architecture Summary`).
- Public API and event surface / conformance gaps / operations posture:
  - preserved in `foundation/context.md` (`Capability Domains`, `Conformance Context`).
- AI-native NPC constraints and adaptation guidance:
  - preserved in `foundation/context.md` (`Why this matters for AI-native NPC world`).
- Recommended workstream sequence:
  - preserved in `foundation/context.md` (`Transition Roadmap`).
- Immediate technical recommendations:
  - preserved in `foundation/context.md` (`Immediate Technical Recommendations`).
- Constraint-trace framing:
  - preserved in `foundation/constraint-trace.md` (`Constraint Matrix`, `Validation-Oriented Traceability`).

### `mineflayer-typescript-runtime-spec.md`
- Toolchain specification and Node/TypeScript baseline:
  - preserved in `spec/runtime.md` (`Runtime Baseline Specification`).
- Bot creation defaults and option semantics:
  - preserved in `spec/runtime.md` (`Bot Creation Specification`);
  - signatures and options cataloged in `reference/api-catalog.md`.
- Plugin system specification:
  - preserved in `spec/runtime.md` (`Plugin Composition Specification`).
- Event model and lifecycle rules:
  - preserved in `spec/event-lifecycle.md` (`Lifecycle Phase Model`, `Normative Rules`).
- Action model preconditions/failure model:
  - preserved in `spec/runtime.md` (`Safety and Concurrency Specification`);
  - high-risk action specifics in `spec/action-api.md`.
- Runtime safety, deterministic fallback, concurrency, and multi-bot policy:
  - preserved in `spec/runtime.md` (`Safety and Concurrency Specification`);
  - lifecycle recovery gates in `spec/event-lifecycle.md` (`Recovery/Fallback Specification`, `Multi-Bot Lifecycle Coordination`).
- Conformance gaps, Acceptance Criteria, Validation Criteria:
  - preserved in `spec/runtime.md` (`Drift Management Specification`, `Acceptance Criteria`, `Validation Criteria`).

### `mineflayer-ai-assistant-action-api-spec.md`
- Runtime assumptions, single-flight policy, action envelope schema:
  - preserved in `spec/action-api.md` (`Action Envelope Schema`, `Required Action Orchestration Rules`).
- Reason Code baseline:
  - preserved in `spec/action-api.md` (`Reason Code Baseline`).
- API-level semantics for dig/place/interact/sign:
  - preserved in `spec/action-api.md` (`API Semantics` for each method).
- Preconditions, postconditions, events, fallback paths:
  - preserved in `spec/action-api.md` (`API Semantics`, `Evidence Requirements per Action`).
- Drift register and integration pattern:
  - preserved in `spec/action-api.md` (`Known Drift Notes`);
  - runtime orchestration context in `spec/runtime.md`.
- Acceptance Criteria / Validation Criteria:
  - preserved in `spec/action-api.md`.

### `mineflayer-typescript-api-reference.md`
- Core imports and types:
  - preserved in `reference/api-catalog.md` (`Core Imports`).
- `createBot` and `BotOptions` detail:
  - preserved in `reference/api-catalog.md` (`createBot and BotOptions`).
- Lifecycle events, chat APIs, movement/world/entity/inventory APIs:
  - preserved in `reference/api-catalog.md` (`Lifecycle Events`, `Chat APIs`, `Movement and Orientation APIs`, `World and Block APIs`, `Inventory and Container APIs`).
- High-risk action lookup:
  - preserved in `reference/api-catalog.md` (`High-Risk Action APIs`);
  - normative behavior delegated to `spec/action-api.md`.
- Drift notes and source anchors:
  - preserved in `reference/api-catalog.md` (`Drift Pointers`, `Source Anchors`).

### `mineflayer-typescript-implementation-guide.md`
- Bootstrap, `tsconfig`, package scripts:
  - preserved in `guides/implementation.md` (`Step 1`, `Step 2`).
- Minimal typed bot and runtime config schema:
  - preserved in `guides/implementation.md` (`Step 3`, `Step 4`).
- Event normalization schema and intake:
  - preserved in `guides/events.md` (`Suggested Perception Schema`, `Event Intake Pattern`);
  - integration flow in `guides/implementation.md` (`Step 8`).
- Deterministic fallback execution and decision envelope:
  - preserved in `guides/implementation.md` (`Step 6`);
  - normative policy delegated to `spec/action-api.md`.
- Plugin type augmentation and multi-bot manager:
  - preserved in `guides/implementation.md` (`Step 7`, `Step 9`).
- Chat pattern usage:
  - preserved in `guides/tutorial.md` (`Stage 6`) and `guides/events.md` (`Chat Normalization Pattern`).
- Validation checklist and recommended structure:
  - preserved in `guides/implementation.md` (`Step 10`, `Step 11`).

### `mineflayer-typescript-tutorial-deep-dive.md`
- Official tutorial adaptation baseline:
  - preserved in `guides/tutorial.md` (`Tutorial Progression`, `Official Tutorial to TypeScript Mapping`).
- Toolchain and minimal typed bot:
  - preserved in `guides/tutorial.md` (`Stage 1`, `Stage 2`);
  - implementation depth in `guides/implementation.md`.
- Config schema, event model, chat patterns, async sequencing:
  - preserved in `guides/tutorial.md` (`Stage 3` to `Stage 7`).
- Reconnect and multi-bot patterns:
  - preserved in `guides/tutorial.md` (`Stage 8`).
- FAQ-driven operations:
  - preserved in `guides/tutorial.md` (`Operational FAQs (TypeScript)`).
- Conformance gaps and drift register:
  - preserved in `guides/tutorial.md` (`Conformance and Drift Register`).
- Runtime blueprint and failure envelope schema:
  - preserved in `guides/implementation.md` (`Step 11`);
  - quick path context in `guides/tutorial.md` (`Next Documents by Learning Need`).
- Acceptance Criteria / Validation Criteria:
  - preserved in `guides/tutorial.md` with stage-level validation ownership.

### `mineflayer-typescript-index.md`
- Document map and ownership quick map:
  - preserved in `index.md` (`Hierarchy`, `Ownership Matrix`, `Usage by Reader Goal`).
- Scope note and entrypoint role:
  - preserved in `index.md` (`Intent`, `Scope`).

### `mineflayer-documentation-hierarchy.md`
- Layer hierarchy and ownership matrix:
  - preserved in `index.md` (`Hierarchy`, `Ownership Matrix`).
- Non-duplication rules and authoring workflow:
  - preserved in `index.md` (`Non-Duplication Rules`);
  - migration governance in `migration/crosswalk.md`.
- Review checklist and change management:
  - preserved in `migration/crosswalk.md` (`Validation Checklist`);
  - owner boundaries represented across reconstructed docs with `Owns` / `Does not own` sections.

## Coverage Decision
- Result: every legacy topic domain and required section family is represented in reconstructed docs with a canonical owner.
- Legacy files are safe to remove after this evidence document and `migration/crosswalk.md` are retained.

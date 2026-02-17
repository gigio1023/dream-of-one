# Specification: Runtime

## Intent
- Define the normative runtime behavior for Mineflayer-based TypeScript systems.
- Provide authoritative rules for bootstrapping, plugin composition, lifecycle handling, and safety execution.

## Scope
- Owns:
  - runtime baseline requirements
  - lifecycle and plugin normative rules
  - safety/concurrency requirements
  - runtime Acceptance Criteria and Validation Criteria
- Does not own:
  - deep per-method action semantics (see `action-api.md`)
  - complete signature catalog (see `../reference/api-catalog.md`)
  - procedural implementation walkthrough (see `../guides/implementation.md`)

## Runtime Baseline Specification
- Node runtime:
  - MUST run on Node `>=22`.
- TypeScript mode:
  - SHOULD use strict mode and explicit type ownership for wrappers/adapters.
- Module strategy:
  - MUST use one module profile consistently per service/runtime.

## Bot Creation Specification

### Required principles
1. `createBot` option handling MUST be explicit in configuration layer.
2. Default behaviors from runtime loader MUST be understood before overrides.
3. Auth/session concerns MUST be externalized from source code.

### Minimum startup policy
- Attach error/end handlers before gameplay logic.
- Bind spawn/login lifecycle handlers before issuing actions.
- Treat `inject_allowed` as plugin-safe initialization boundary.

## Plugin Composition Specification

### Injection rules
- Plugins MUST be loaded through runtime-supported APIs (`options.plugins`, `loadPlugin`, `loadPlugins`).
- External plugin injection MUST respect function identity dedupe.
- Runtime-specific plugin dependencies MUST be declared explicitly in wrapper setup.

### Ownership rules
- Internal plugin behavior is implementation authority unless explicitly overridden.
- Override logic MUST document changed behavior surface and validation impact.

## Lifecycle Specification

### Runtime Path
1. Configuration resolved.
2. Bot created.
3. Loader and plugin injection gate initialized.
4. Protocol connect path enters login/game/spawn sequence.
5. Action loop starts only after required lifecycle gates.

### Fallback Path
- If lifecycle gate fails:
  - emit deterministic failure envelope
  - stop action dispatch for dependent workflows
  - retry only when gate-specific criteria are satisfied

## Event Consumption Specification
- Event handlers MUST be idempotent where repeat delivery is possible.
- High-impact handlers SHOULD be named and detachable.
- Dynamic event names MUST be wrapped with typed adapters in TypeScript projects.

## Safety and Concurrency Specification

### Single-flight
- Critical action classes (dig/place/interact) MUST run single-flight per bot instance.

### Global Cap
- Multi-bot systems MUST enforce a bounded number of concurrent critical actions.

### Deterministic fallback
- Failure handling MUST emit explicit Reason Code and Reason Category.
- Retry policies MUST be bounded and evidence-driven.

## Drift Management Specification
- Each known drift item (docs/types/runtime mismatch) MUST be recorded with:
  - source location
  - impact summary
  - mitigation rule

## Acceptance Criteria
- Runtime bootstraps successfully with lifecycle gate correctness.
- Plugin composition is deterministic and documented.
- Single-flight and fallback rules are enforced in action execution layer.
- Drift-sensitive wrappers are identified and covered by validation.

## Validation Criteria
- Verify Node baseline and build profile.
- Verify lifecycle event ordering via runtime logs/evidence.
- Verify critical action serialization under load.
- Verify fallback emits stable Reason Code/Reason Category values.
- Verify documented drift mitigations remain active.

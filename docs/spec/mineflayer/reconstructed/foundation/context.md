# Foundation: Mineflayer Context

## Status Snapshot
- Date: 2026-02-17
- Upstream source: `/Users/user/git/gigio1023/mineflayer`
- Package baseline: `mineflayer@4.35.0`
- Node baseline for conformance: `>=22`

## Intent
- Capture why Mineflayer is the runtime substrate for the AI-native NPC world.
- Provide shared context and evidence boundaries for all downstream specifications and guides.

## Scope
- Owns:
  - upstream repository profile
  - runtime architecture overview
  - capability/constraint framing
  - conformance gap context
- Does not own:
  - normative runtime rules (see `spec/runtime.md`)
  - detailed method semantics (see `spec/action-api.md`)
  - API signature catalog (see `reference/api-catalog.md`)
  - implementation procedures (see `guides/*`)

## Evidence Baseline
- Runtime entry and loader path:
  - `index.js`, `lib/loader.js`, `lib/plugin_loader.js`
- Core plugin behavior anchors:
  - `lib/plugins/chat.js`, `lib/plugins/physics.js`, `lib/plugins/digging.js`, `lib/plugins/inventory.js`, `lib/plugins/place_block.js`, `lib/plugins/place_entity.js`, `lib/plugins/blocks.js`
- Public API and type surface:
  - `docs/api.md`, `index.d.ts`, `docs/tutorial.md`, `docs/FAQ.md`, `docs/unstable_api.md`
- Practical behavior evidence:
  - `examples/*`, `test/externalTests/*`

## Repository Profile
- Library type: high-level Minecraft bot runtime API over `minecraft-protocol`.
- Plugin model: internal plugin map + external plugin injection.
- Event model: large async event surface with lifecycle, world, entity, and action events.
- Version posture:
  - broad tested Minecraft range in `lib/version.js`
  - runtime feature-gating through `bot.supportFeature(...)`

## Architecture Summary

### Boot sequence
1. `createBot(options)` applies runtime defaults.
2. plugin loader binds `loadPlugin/loadPlugins/hasPlugin`.
3. internal and external plugins are assembled.
4. protocol client is created or injected.
5. protocol connect/error/end events are bridged to bot.
6. registry and version gate checks execute.
7. `inject_allowed` emitted; plugins run with resolved runtime context.

### Plugin model characteristics
- Internal plugins are explicit, named modules.
- External plugins are function injections from `options.plugins`.
- Function identity dedupe prevents duplicate plugin injection.
- Late `loadPlugin` usage supports modular runtime composition.

### Event surface characteristics
- Bot runtime is event-first with async methods layered on top.
- Lifecycle path is not only `spawn`; real flow includes `connect`, `login`, `game`, `respawn`, `end`, and state-specific events.
- Many actions resolve on observed world/entity changes, not immediate packet send completion.

## Capability Domains
- Session and identity management.
- Chat ingest and pattern extraction.
- World/block perception and mutation.
- Entity perception and interaction.
- Inventory/container operations.
- Physics/movement/orientation.
- High-level actions (dig/place/activate/craft/etc).

## Conformance Context

### Typical drift categories
- docs vs implementation detail drift (for example option wording vs runtime behavior).
- type declarations vs runtime emitted events.
- version-conditional behavior under feature flags.

### Operational implication
- New runtime decisions should treat implementation code as behavior authority.
- Documentation should keep explicit evidence anchors and note known drift.

## Why this matters for AI-native NPC world
- NPC society requires reliable event-to-action translation with bounded failure handling.
- Deterministic fallback requires precise understanding of when promises resolve/reject.
- Multi-bot orchestration depends on predictable lifecycle and single-flight behavior for critical actions.

## Transition Roadmap (Migration Execution Sequence)
### Phase 1: Core Runtime Authority
- Build Mineflayer adapter skeleton and lifecycle controls.
- Implement event normalization and Decision API bridge.
- Stand up deterministic fallback execution path.

### Phase 2: Behavior Conformance
- Port bounded speech/action mappings.
- Validate social-stealth loop semantics against existing Acceptance Criteria.
- Freeze migration scope to prevent gameplay expansion during platform transition.

### Phase 3: Multi-Bot Hardening
- Add scheduler and concurrency controls.
- Add per-bot telemetry and aggregate incident tracing.
- Stress under realistic bot counts with failure injection.

### Phase 4: Release Readiness
- Rebuild Validation Criteria and release gates on Mineflayer runtime.
- Produce Mineflayer-native Evidence Pack for release decisions.
- Complete Unity deprecation gates after stability thresholds are met.

## Immediate Technical Recommendations
- Standardize Node runtime to `22.x` in development, CI, and deployment.
- Treat runtime source implementation as behavior authority where docs/types drift exists.
- Keep unstable `_client` interactions behind a thin compatibility layer.
- Keep third-party plugin usage minimal until Runtime Path conformance is stable.
- Add adapter-level Specification conformance tests before scaling multi-bot workloads.

## Links to Canonical Owners
- Runtime rules and safety gates:
  - `docs/spec/mineflayer/reconstructed/spec/runtime.md`
- High-risk action semantics:
  - `docs/spec/mineflayer/reconstructed/spec/action-api.md`
- Event lifecycle rules:
  - `docs/spec/mineflayer/reconstructed/spec/event-lifecycle.md`
- Signature and options catalog:
  - `docs/spec/mineflayer/reconstructed/reference/api-catalog.md`

# Foundation: Constraint Trace

## Intent
- Consolidate all key runtime and delivery constraints in one place.
- Trace each constraint to source evidence and implementation consequences.

## Scope
- Owns:
  - constraint inventory
  - evidence traceability
  - impact on design and validation
- Does not own:
  - full normative rules (see `spec/*`)
  - tutorial/how-to steps (see `guides/*`)

## Constraint Matrix

| Constraint | Evidence | Impact | Required Response |
|---|---|---|---|
| Node/toolchain baseline must be modern | `package.json` (`engines.node >=22`), runtime notes in previous docs | Old runtime causes inconsistent behavior | Standardize Node `>=22` in all environments |
| Lifecycle is event-driven and async | `lib/loader.js`, `lib/plugins/*`, `index.d.ts` | Naive sequential assumptions cause race bugs | Use explicit event gates and awaited actions |
| Feature flags change packet shapes across versions | `bot.supportFeature(...)` usage in runtime plugins | One static packet strategy fails across versions | Keep version-adaptive execution paths |
| Dig/place/activate are stateful operations | `digging.js`, `place_block.js`, `inventory.js` | Concurrent commands can conflict | Enforce single-flight for critical actions |
| Chat formats vary across servers | `chat.js`, `docs/FAQ.md`, `examples/chat_parsing.js` | Message parse failures break NPC intent parsing | Use configurable pattern sets and fallback parsing |
| Some runtime events exist in code but not fully typed/docs | runtime emission vs docs/types drift | Lost observability or incorrect wrappers | Maintain drift register and local wrapper types |
| World data may unload while awaiting updates | world/block update behavior in `blocks.js` and place logic | false negatives for action completion | Handle null-world paths and retry policy |
| Multi-bot scale increases contention risk | multi-bot examples and runtime model | overload and nondeterministic behavior | Apply Global Cap and per-bot single-flight |

## Constraint Categories

### Toolchain constraints
- Runtime and build tool versions must align with upstream compatibility.
- TypeScript strict mode should be treated as baseline, not optional.

### Protocol/version constraints
- Do not hardcode one packet structure for all versions.
- Always prefer feature-gated branches from runtime implementation evidence.

### State and concurrency constraints
- Critical world actions must not overlap on the same bot.
- Cancellation and fallback behavior must be explicit and deterministic.

### Observability constraints
- Event evidence is required to confirm action outcomes.
- Promise resolution alone is not always sufficient; some actions need state re-check.

### Documentation constraints
- One canonical owner per topic is mandatory.
- Non-owner docs must link to owner instead of restating deep detail.

## Validation-Oriented Traceability
- Every high-risk requirement in `spec/runtime.md` and `spec/action-api.md` should map back to this constraint trace.
- Release-facing checks should include:
  - toolchain baseline verification
  - event lifecycle conformance
  - action fallback determinism
  - drift-aware wrapper behavior

## Links
- Runtime normative rules:
  - `docs/spec/mineflayer/reconstructed/spec/runtime.md`
- Action normative rules:
  - `docs/spec/mineflayer/reconstructed/spec/action-api.md`
- Event lifecycle normative rules:
  - `docs/spec/mineflayer/reconstructed/spec/event-lifecycle.md`

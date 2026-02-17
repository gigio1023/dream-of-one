# Migration Crosswalk: Previous Docs -> Canonical Docs

## Intent
- Prove content preservation while switching to a newly structured hierarchy.
- Make ownership transition explicit so future edits avoid duplication.

## Scope
- Maps previous Mineflayer documents under `docs/spec/mineflayer/*.md` to canonical documents under `docs/mineflayer/**`.
- Legacy documents are deprecated and removed after coverage migration is validated.

## Previous -> New Ownership Mapping
| Previous file | Primary new owner(s) | Content preservation notes |
|---|---|---|
| `mineflayer-research-analysis.md` | `foundation/context.md`, `foundation/constraint-trace.md` | architecture context, conformance/risk framing, adaptation constraints preserved in Foundation layer |
| `mineflayer-typescript-runtime-spec.md` | `spec/runtime.md`, `spec/event-lifecycle.md` | runtime/toolchain policy and lifecycle rules preserved in Specification layer |
| `mineflayer-ai-assistant-action-api-spec.md` | `spec/action-api.md` | deep dig/place/interact semantics, Reason Code mapping, action fallback preserved as single owner |
| `mineflayer-typescript-api-reference.md` | `reference/api-catalog.md` | signature/options/event catalog preserved in Reference layer |
| `mineflayer-typescript-implementation-guide.md` | `guides/implementation.md`, `guides/events.md` | procedural integration and normalization patterns preserved in Guide layer |
| `mineflayer-typescript-tutorial-deep-dive.md` | `guides/tutorial.md` | tutorial narrative and staged onboarding preserved in Guide layer |
| `mineflayer-typescript-index.md` | `index.md` | navigation and entrypoint intent preserved with layered map |
| `mineflayer-documentation-hierarchy.md` | `index.md` + this crosswalk | hierarchy governance preserved and merged into new navigation + migration governance |

## Topic-Level Preservation Map
| Topic domain | New canonical owner |
|---|---|
| Upstream context and evidence framing | `foundation/context.md` |
| Constraint inventory and traceability | `foundation/constraint-trace.md` |
| Runtime/toolchain normative rules | `spec/runtime.md` |
| Lifecycle/event normative rules | `spec/event-lifecycle.md` |
| Dig/place/interact/sign normative semantics | `spec/action-api.md` |
| API signatures/options/event catalog | `reference/api-catalog.md` |
| Implementation workflow | `guides/implementation.md` |
| Tutorial onboarding sequence | `guides/tutorial.md` |
| Event normalization procedures | `guides/events.md` |
| Entrypoint navigation | `index.md` |
| Section-level legacy coverage evidence | `migration/legacy-coverage-evidence.md` |

## Duplication Removal Outcomes
- Normative policy moved fully to `spec/*`.
- Signatures/options moved fully to `reference/api-catalog.md`.
- Procedures/tutorials moved fully to `guides/*`.
- Foundation now owns only context/constraints.

## Validation Checklist
- [x] Every previous document has mapped new owner(s)
- [x] Every major topic domain has one canonical owner
- [x] Non-owner documents link instead of deep restatement
- [x] Reconstructed index points to all canonical owners
- [x] Section-level legacy coverage evidence is published

## Reader Transition Path
1. Start at:
   - `docs/mineflayer/index.md`
2. Choose layer by need:
   - context -> foundation
   - rules -> spec
   - lookup -> reference
   - execution -> guides

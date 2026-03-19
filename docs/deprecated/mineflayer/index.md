# Mineflayer Documentation Set

## Status Snapshot
- Date: 2026-02-17
- Scope root: `docs/mineflayer`
- Source baseline: latest original `/Users/user/git/gigio1023/mineflayer`
- Intent: provide a newly structured, detailed, non-duplicative Mineflayer documentation hierarchy

## Intent
- Replace the previous flat document organization with a strict layered hierarchy.
- Keep technical depth while ensuring one canonical owner per topic.
- Preserve content coverage from earlier documents through explicit mapping.

## Scope
- In Scope:
  - New hierarchy, ownership boundaries, and navigation.
  - Reconstructed documents for foundation, specification, reference, and guides.
  - Migration crosswalk from previous document set to this one.
- Out of Scope:
  - Upstream Mineflayer code changes.
  - Runtime behavior changes in Dream of One.

## Hierarchy
```text
mineflayer/
  index.md
  foundation/
    context.md
    constraint-trace.md
  spec/
    runtime.md
    action-api.md
    event-lifecycle.md
  reference/
    api-catalog.md
  guides/
    implementation.md
    tutorial.md
    events.md
  migration/
    crosswalk.md
    legacy-coverage-evidence.md
```

## Ownership Matrix
| Layer | Canonical Owner Docs | Owns |
|---|---|---|
| Foundation | `foundation/context.md`, `foundation/constraint-trace.md` | context, constraints, evidence framing |
| Specification | `spec/runtime.md`, `spec/action-api.md`, `spec/event-lifecycle.md` | normative runtime rules, action semantics, lifecycle rules |
| Reference | `reference/api-catalog.md` | API signatures/options/event catalog |
| Guides | `guides/implementation.md`, `guides/tutorial.md`, `guides/events.md` | procedural usage patterns and onboarding |
| Migration | `migration/crosswalk.md` | old-to-new mapping and coverage Evidence |

## Usage by Reader Goal
- Need architecture context and boundaries:
  - Start at `foundation/context.md`
- Need normative behavior or policy gates:
  - Start at `spec/runtime.md`
- Need precise dig/place/interact behavior:
  - Start at `spec/action-api.md`
- Need event ordering and responsibilities:
  - Start at `spec/event-lifecycle.md`
- Need signatures/options quickly:
  - Use `reference/api-catalog.md`
- Need to implement now:
  - Use `guides/implementation.md`
- Need tutorial-style ramp-up:
  - Use `guides/tutorial.md`
- Need event normalization patterns:
  - Use `guides/events.md`

## Recommended Reading Order
- First-time runtime contributor:
  - `foundation/context.md` -> `spec/runtime.md` -> `guides/implementation.md`
- Action semantics implementation:
  - `spec/action-api.md` -> `reference/api-catalog.md` -> `guides/events.md`
- Lifecycle/reconnect troubleshooting:
  - `spec/event-lifecycle.md` -> `guides/events.md` -> `foundation/constraint-trace.md`

## Non-Duplication Rules (Enforced)
1. One topic has one canonical owner.
2. Non-owner docs summarize in up to 3 bullets and link to owner.
3. Normative rules appear only in `spec/*`.
4. Full signature catalogs appear only in `reference/api-catalog.md`.
5. Step-by-step procedures appear only in `guides/*`.

## Related Project-Level Artifacts
- Migration execution plan:
  - `plan.md`
- Architecture visualization:
  - `README.md` (Mermaid sections: `Unified Runtime and Social Escalation Loop`, `Runtime Path Sequence`)
- Project overview and documentation map:
  - `docs/overview.md`

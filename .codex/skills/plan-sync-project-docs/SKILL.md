---
name: plan-sync-project-docs
description: Sync project.md and plan.md: ensure definition changes update plan, add missing tasks, update status.
---

# Plan Sync (project.md -> plan.md)

## When to use
- Game definition changes or scope shifts.
- Plan no longer reflects project definition.

## Workflow
1. Read project.md and extract new constraints.
2. Map changes into plan sections (scope, world, systems, QA).
3. Add missing tasks and mark status correctly.
4. Update progress log and next-run focus.

## Guardrails
- Keep plan as the single source of execution steps.
- Avoid removing tasks unless project.md explicitly drops them.

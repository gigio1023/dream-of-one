---
name: npc-navmesh-safety
description: Ensure NPCs do not pass through geometry: NavMeshAgent setup, collider checks, and fallback rules.
---

# NPC NavMesh Safety

## When to use
- NPCs clip through buildings/props.
- Movement ignores colliders or obstacles.

## Workflow
1. Ensure NPC has NavMeshAgent with reasonable radius/height.
2. Confirm NavMesh is baked and agent is on mesh.
3. Use SetDestination instead of manual transform moves.
4. If NavMesh missing, disable movement or use safe fallback.

## Guardrails
- Do not move NPCs via transform when NavMeshAgent is active.
- Validate colliders on level geometry.

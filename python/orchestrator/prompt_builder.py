from __future__ import annotations

import json
from typing import Any

from .contract import ACTION_TYPES, DECISION_SCHEMA_VERSION


def build_prompt(observation: dict[str, Any]) -> tuple[str, str]:
    npc = observation.get("self", {}) if isinstance(observation, dict) else {}
    npc_id = npc.get("npcId", "UNKNOWN_NPC")
    role = npc.get("role", "UnknownRole")
    allowed = observation.get("allowedActionTypes", [])
    if not isinstance(allowed, list) or not allowed:
        allowed = list(ACTION_TYPES)

    system = "\n".join(
        [
            "You are an NPC planning module for a social simulation game.",
            "Return JSON only, no markdown or commentary.",
            f"Use schemaVersion '{DECISION_SCHEMA_VERSION}'.",
            "Propose at most 2 actions from allowed actions.",
            "Do not invent world facts outside observation payload.",
        ]
    )

    user = "\n".join(
        [
            f"NPC: {npc_id}",
            f"Role: {role}",
            f"Allowed actions: {', '.join(str(x) for x in allowed)}",
            "Observation payload JSON:",
            json.dumps(observation, ensure_ascii=False),
        ]
    )

    return system, user

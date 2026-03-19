from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Iterable

from .contract import ACTION_TYPES, DecisionAction, DecisionPayload, is_known_action_type, normalize_action_type
from .model_adapter import LocalModelAdapter, ModelAdapterError
from .prompt_builder import build_prompt


def _extract_first_json_object(raw: str) -> str:
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object found in model output")
    return raw[start : end + 1]


def _normalize_allowed_actions(observation: dict[str, Any]) -> list[str]:
    allowed = observation.get("allowedActionTypes", [])
    if not isinstance(allowed, list):
        allowed = []

    normalized: list[str] = []
    for candidate in allowed:
        if not isinstance(candidate, str):
            continue
        action = normalize_action_type(candidate)
        if action in ACTION_TYPES and action not in normalized:
            normalized.append(action)

    if "Observe" not in normalized:
        normalized.append("Observe")
    if "Idle" not in normalized:
        normalized.append("Idle")
    if not normalized:
        normalized = list(ACTION_TYPES)

    return normalized


def _normalize_actions(raw_actions: Iterable[dict[str, Any]]) -> list[DecisionAction]:
    actions: list[DecisionAction] = []
    for item in raw_actions:
        if not isinstance(item, dict):
            continue
        action = DecisionAction.from_dict(item)
        if not action.action_type:
            continue
        actions.append(action)
    return actions


@dataclass(slots=True)
class DecisionEngine:
    adapter: LocalModelAdapter = field(default_factory=LocalModelAdapter)

    def decide(self, observation: dict[str, Any]) -> DecisionPayload:
        try:
            return self._decide_inner(observation)
        except (ModelAdapterError, ValueError, KeyError, TypeError) as exc:
            return DecisionPayload.fallback(str(exc))

    def _decide_inner(self, observation: dict[str, Any]) -> DecisionPayload:
        if not isinstance(observation, dict):
            raise ValueError("observation payload must be an object")

        system, user = build_prompt(observation)
        raw = self.adapter.complete(system, user)
        extracted = _extract_first_json_object(raw)
        parsed = json.loads(extracted)
        if not isinstance(parsed, dict):
            raise ValueError("decision must be a JSON object")

        allowed_actions = _normalize_allowed_actions(observation)
        raw_actions = parsed.get("actions", [])
        if not isinstance(raw_actions, list):
            raise ValueError("actions must be a list")
        if len(raw_actions) > 2:
            raise ValueError("actions length exceeds 2")

        actions = _normalize_actions(raw_actions)
        for action in actions:
            if not is_known_action_type(action.action_type):
                raise ValueError(f"unknown action type: {action.action_type}")
            if action.action_type not in allowed_actions:
                raise ValueError(f"action not allowed: {action.action_type}")
            if action.action_type in ("Talk", "Ask") and not action.text.strip():
                raise ValueError(f"{action.action_type} requires text")

        utterance = str(parsed.get("utterance") or parsed.get("speak") or "")
        if len(actions) == 0 and not utterance.strip():
            return DecisionPayload.fallback("empty decision")

        return DecisionPayload(
            intent=str(parsed.get("intent", "")),
            utterance=utterance,
            actions=actions,
            memory_write=str(parsed.get("memoryWrite", "")),
        )

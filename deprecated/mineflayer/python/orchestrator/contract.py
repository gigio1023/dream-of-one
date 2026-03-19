from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

OBSERVATION_SCHEMA_VERSION = "society.observe.v1"
DECISION_SCHEMA_VERSION = "society.decision.v1"

ACTION_TYPES = (
    "Move",
    "Talk",
    "Ask",
    "Observe",
    "Work",
    "Report",
    "Escort",
    "Idle",
)

_LEGACY_ACTION_ALIASES = {
    "Speak": "Talk",
    "MoveToAnchor": "Move",
    "FileReport": "Report",
}


def normalize_action_type(value: str) -> str:
    if not isinstance(value, str):
        return ""

    trimmed = value.strip()
    if not trimmed:
        return ""

    canonical = _LEGACY_ACTION_ALIASES.get(trimmed, _LEGACY_ACTION_ALIASES.get(trimmed.title(), trimmed))
    for known in ACTION_TYPES:
        if known.lower() == canonical.lower():
            return known
    return canonical


def is_known_action_type(value: str) -> bool:
    return normalize_action_type(value) in ACTION_TYPES


@dataclass(slots=True)
class DecisionAction:
    action_type: str
    target_id: str = ""
    location_id: str = ""
    place_id: str = ""
    zone_id: str = ""
    rule_id: str = ""
    text: str = ""
    anchor_name: str = ""
    confidence: float = -1.0

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "DecisionAction":
        raw_action = data.get("actionType") or data.get("type") or ""
        action_type = normalize_action_type(raw_action)
        confidence = data.get("confidence", -1.0)
        if not isinstance(confidence, (int, float)):
            confidence = -1.0
        elif confidence > 1.0:
            confidence = 1.0
        elif confidence < 0.0:
            confidence = -1.0

        return cls(
            action_type=action_type,
            target_id=str(data.get("targetId", "")),
            location_id=str(data.get("locationId") or data.get("anchorName") or ""),
            place_id=str(data.get("placeId", "")),
            zone_id=str(data.get("zoneId", "")),
            rule_id=str(data.get("ruleId", "")),
            text=str(data.get("text", "")),
            anchor_name=str(data.get("anchorName", "")),
            confidence=float(confidence),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "actionType": self.action_type,
            "targetId": self.target_id,
            "locationId": self.location_id,
            "placeId": self.place_id,
            "zoneId": self.zone_id,
            "ruleId": self.rule_id,
            "text": self.text,
            "anchorName": self.anchor_name,
            "confidence": self.confidence,
        }


@dataclass(slots=True)
class DecisionPayload:
    intent: str = ""
    utterance: str = ""
    actions: list[DecisionAction] = field(default_factory=list)
    memory_write: str = ""
    schema_version: str = DECISION_SCHEMA_VERSION

    def to_dict(self) -> dict[str, Any]:
        return {
            "schemaVersion": self.schema_version,
            "intent": self.intent,
            "utterance": self.utterance,
            "actions": [action.to_dict() for action in self.actions],
            "memoryWrite": self.memory_write,
        }

    @classmethod
    def fallback(cls, reason: str) -> "DecisionPayload":
        return cls(
            intent="fallback",
            utterance="상황을 더 관찰하겠습니다.",
            actions=[DecisionAction(action_type="Observe", text="fallback-observe")],
            memory_write=f"fallback:{reason}",
        )

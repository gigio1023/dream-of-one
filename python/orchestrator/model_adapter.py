from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class ModelAdapterError(RuntimeError):
    pass


@dataclass(slots=True)
class LocalModelAdapter:
    endpoint: str = "http://localhost:11434/v1/chat/completions"
    model: str = "qwen3:4b-instruct"
    timeout_seconds: float = 8.0
    temperature: float = 0.3
    max_tokens: int = 220

    def complete(self, system: str, user: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            self.endpoint,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                text = response.read().decode("utf-8")
        except (HTTPError, URLError, TimeoutError) as exc:
            raise ModelAdapterError(str(exc)) from exc

        try:
            parsed: dict[str, Any] = json.loads(text)
            choices = parsed.get("choices", [])
            if not choices:
                raise ModelAdapterError("choices is empty")
            message = choices[0].get("message", {})
            content = message.get("content", "")
            if not isinstance(content, str) or not content.strip():
                raise ModelAdapterError("message.content is empty")
            return content
        except (TypeError, ValueError) as exc:
            raise ModelAdapterError(f"invalid model response: {exc}") from exc

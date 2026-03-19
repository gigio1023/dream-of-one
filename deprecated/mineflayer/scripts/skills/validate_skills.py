#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml


NAME_RE = re.compile(r"^[a-z0-9-]{1,64}$")
RESERVED_NAMES = {"anthropic", "claude"}


def extract_frontmatter(text: str) -> str | None:
    stripped = text.lstrip()
    if not stripped.startswith("---"):
        return None
    parts = stripped.split("---", 2)
    if len(parts) < 3:
        return None
    return parts[1]


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    skills_dir = root / ".codex" / "skills"

    failures: list[str] = []

    for skill_md in sorted(skills_dir.glob("*/SKILL.md")):
        text = skill_md.read_text(encoding="utf-8")
        fm_raw = extract_frontmatter(text)
        if fm_raw is None:
            failures.append(f"{skill_md}: missing or incomplete YAML frontmatter")
            continue

        try:
            fm = yaml.safe_load(fm_raw) or {}
        except Exception as e:  # noqa: BLE001
            failures.append(f"{skill_md}: invalid YAML: {e}")
            continue

        if not isinstance(fm, dict):
            failures.append(f"{skill_md}: frontmatter must be a mapping")
            continue

        keys = set(fm.keys())
        if keys != {"name", "description"}:
            extra = sorted(keys - {"name", "description"})
            missing = sorted({"name", "description"} - keys)
            failures.append(
                f"{skill_md}: frontmatter keys must be {{name, description}}; "
                f"extra={extra} missing={missing}"
            )

        name = fm.get("name", "")
        if (
            not isinstance(name, str)
            or not NAME_RE.match(name)
            or name in RESERVED_NAMES
        ):
            failures.append(f"{skill_md}: invalid name {name!r}")

        desc = fm.get("description", "")
        if not isinstance(desc, str) or not desc.strip():
            failures.append(f"{skill_md}: description must be a non-empty string")
        elif len(desc) > 1024:
            failures.append(
                f"{skill_md}: description too long ({len(desc)} > 1024 chars)"
            )

        # Simple XML-tag check (avoid false positives like "<id>")
        if isinstance(desc, str) and re.search(r"<[^>]+>", desc):
            failures.append(f"{skill_md}: description contains XML-like tags")

    if failures:
        for line in failures:
            print(f"FAIL {line}", file=sys.stderr)
        return 1

    print("OK: all skill frontmatter valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

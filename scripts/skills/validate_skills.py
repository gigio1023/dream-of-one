#!/usr/bin/env python3
"""Validate YAML frontmatter in repo-local Codex skills."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import sys
from typing import Iterable

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = REPO_ROOT / ".codex" / "skills"


@dataclass
class SkillValidationError:
    path: Path
    message: str


def iter_skill_files(skills_dir: Path) -> Iterable[Path]:
    return sorted(skills_dir.glob("*/SKILL.md"))


def split_frontmatter(text: str) -> tuple[str | None, str]:
    if not text.startswith("---"):
        return None, text

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, text

    for idx, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            frontmatter = "\n".join(lines[1:idx])
            body = "\n".join(lines[idx + 1 :])
            return frontmatter, body

    return None, text


def validate_skill(path: Path) -> list[SkillValidationError]:
    errors: list[SkillValidationError] = []
    text = path.read_text(encoding="utf-8")
    frontmatter, _ = split_frontmatter(text)

    if frontmatter is None:
        errors.append(SkillValidationError(path, "missing YAML frontmatter block"))
        return errors

    try:
        parsed = yaml.safe_load(frontmatter) or {}
    except yaml.YAMLError as exc:  # pragma: no cover - exercised in CI
        errors.append(SkillValidationError(path, f"invalid YAML: {exc}"))
        return errors

    if not isinstance(parsed, dict):
        errors.append(SkillValidationError(path, "frontmatter must be a YAML mapping"))
        return errors

    name = parsed.get("name")
    description = parsed.get("description")

    if not isinstance(name, str) or not name.strip():
        errors.append(SkillValidationError(path, "frontmatter.name must be a non-empty string"))

    if not isinstance(description, str) or not description.strip():
        errors.append(
            SkillValidationError(path, "frontmatter.description must be a non-empty string")
        )

    return errors


def main() -> int:
    if not SKILLS_DIR.exists():
        print(f"skills directory not found: {SKILLS_DIR}", file=sys.stderr)
        return 1

    skill_files = list(iter_skill_files(SKILLS_DIR))
    all_errors: list[SkillValidationError] = []
    for skill_path in skill_files:
        all_errors.extend(validate_skill(skill_path))

    if all_errors:
        print("Skill frontmatter validation failed:\n", file=sys.stderr)
        for error in all_errors:
            rel_path = error.path.relative_to(REPO_ROOT)
            print(f"- {rel_path}: {error.message}", file=sys.stderr)
        return 1

    print(f"Validated {len(skill_files)} skill(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

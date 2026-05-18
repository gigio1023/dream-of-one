# OpenAI Codex Model Policy

Date: 2026-05-18
Status: active target policy, live Codex-provider access not yet proven

## Decision

The live NPC wording provider target is direct `openai-codex`, not `codex exec`
and not the generic OpenAI API path.

Configured model policy:

- provider: `openai-codex`
- model: `gpt-5.4-mini`
- reasoning effort: `low`
- default model fallbacks: none
- failure behavior: deterministic runtime fallback, not an automatic upgrade to
  a larger or more expensive model

## Nano Check

OpenAI API docs list `gpt-5.4-nano` and `gpt-5-nano` as cheaper API models.
OpenClaw also lists nano models under its general `openai` catalog.

The reviewed OpenClaw `openai-codex` provider path exposes `gpt-5.4-mini`,
`gpt-5.4`, `gpt-5.5`, and pro variants, but does not expose nano models in the
Codex provider catalog or dynamic resolver. Therefore nano models are not
eligible for Dream of One's `openai-codex` route until a live Codex-provider
model discovery check proves otherwise.

Sources checked:

- OpenAI API model docs for `gpt-5.4-mini` and `gpt-5.4-nano`.
- OpenAI Codex authentication docs.
- OpenClaw `extensions/openai/openclaw.plugin.json`.
- OpenClaw `extensions/openai/openai-codex-provider.ts`.
- OpenClaw `extensions/openai/openai-codex-provider.test.ts`.

## Do Not

- Do not use `gpt-5.5`, pro models, or `gpt-5.4` by default for runtime NPC
  wording.
- Do not configure API nano models through `openai-codex` based only on generic
  OpenAI API availability.
- Do not hide fallback cost behind a model list. If `gpt-5.4-mini` is missing,
  unavailable, rate-limited, or over budget, fall back deterministically.
- Do not let provider output create records, Exposure, Evidence, inquest,
  verdict, or session end.

## Implementation Implication

The current `openai-api` smoke remains a legacy guardrail. The next provider
implementation should add `openai-codex` auth/profile smoke and prove
`gpt-5.4-mini` availability before any Godot HUD, Evidence, or release note
claims live Codex-provider behavior.

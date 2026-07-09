# GPT Code Review

This project adapts the Anthropic Claude Code code-review pattern to Codex/GPT
review lanes. The goal is not generic style review. The goal is to find
high-confidence blockers in code, runtime authority, playable proof, and release
truth.

## Model Policy

- Use GPT-5.5 with `high` or `xhigh` reasoning only for automated review lanes.
- Prefer `xhigh` for game-direction, runtime authority, evidence gates, PR merge,
  and release-truth decisions.
- Do not substitute lower-reasoning or nano models for review judgment.
- Nano models may be used only by runtime/provider preflight checks, never as
  project review authority.

## Review Shape

Run independent review lanes for meaningful PRs or large local changes:

1. Game Studio compliance: check `AGENTS.md`, `.game-studio/`, `docs/framework/`,
   `.game-harness/`, and current direction docs.
2. Game substance: check player promise, core verb, readable consequence,
   failure/recovery, and next choice.
3. Runtime authority: check that AI/API providers can propose wording only and
   cannot decide suspicion, Exposure, Evidence, report, inquest, verdict, or
   session termination.
4. Bug and regression scan: inspect changed code and tests for obvious breakage
   introduced by the diff.
5. History/context scan when a PR exists: inspect relevant git history or blame
   before treating a pattern as intentional.
6. Visual/playable scan for Godot-facing work: verify captures, smoke paths,
   input clarity, UI readability, and Evidence Pack output.

Use multiple independent GPT review agents when the lanes can run in parallel.
For write work after review, keep ownership split by file or module.

## Finding Threshold

- Report only actionable findings with confidence at or above 80/100.
- Findings must cite concrete files and lines when possible.
- Filter out pre-existing issues unless the current diff makes them worse.
- Filter out lint-only nits, vague quality complaints, and issues already covered
  by deterministic checks.
- Prefer one severe, proven blocker over many speculative comments.

## Game Studio Grounding

Reviewers must apply Game Studio's proof-first rule:

- Passing commands are implementation evidence, not playable quality.
- A playable claim needs player action, system response, visible consequence,
  failure or recovery, gameplay capture, QA walkthrough, and a review verdict.
- Product or release claims must map to build truth and known limitations.
- Public language must not outrun current proof.

For Dream of One specifically, reviewers must protect these boundaries:

- Player is investigated by NPCs and Station systems.
- Conversation text is where danger starts.
- AI/API providers may propose NPC or Station wording only.
- Backend/runtime authority owns deterministic suspicion signals, Exposure,
  Evidence, report, inquest, verdict, and session termination.
- The current conversation-first `Same Order` proof is M1 technical evidence.
  Renderer-backed visual capture may be cited as internal evidence, but public
  route/playability claims still require backend canonical route event
  validation, manual replay/readability/comprehension validation,
  provider/export truth, and role review gates.

## Output

Use this shape for local or PR review:

```text
Verdict:
Central claim:
Review lanes:
Proof checked:
Internal evidence checked:
Findings:
Additional verification:
Blocked claims:
Next smallest proof:
```

When posting PR text, keep it concise and in English.

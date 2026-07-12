# AI Provider Ports and Adapters

Production gameplay is provider-first. Game logic depends only on
`NpcProposalPort`; vendor API shapes are isolated behind `TextGenPort`
adapters. A storylet supplies context and constraints, never a pre-authored
dialogue tree or ordered NPC action list.

## Layering

```text
conversation + agent loop
        │ NpcProposalPort
        ▼
ProviderService
  prompt shaping · zod envelope validation · one repair · timeout · budget
        │ TextGenPort
        ├── ResponsesAdapter ─────────────── OpenAI
        └── ChatCompletionsAdapter ───────── ModelScope / compatible endpoints

tests + fixture generation
        │ NpcProposalPort
        └── ScriptedNpcAdapter (never selectable from production config)
```

The domain port exposes five operations. During ordinary conversation, the
merged conversation-turn operation is the only provider work that blocks the
player. The scheduled terminal hearing deliberately blocks once more on
`judgeHearing`; opening lines, agent beats, and ambient work use the split
operations without adding another ordinary-play wait.

```ts
interface NpcProposalPort {
  proposeConversationTurn(request): Promise<ResolvedProposal<ConversationProposal>>;
  judgeConversationTurn(request): Promise<ResolvedProposal<ConversationJudgment>>;
  judgeAndProposeConversationTurn(request): Promise<ResolvedProposal<MergedConversationTurn>>;
  proposeNextStep(request): Promise<ResolvedProposal<AgentStepProposal>>;
  judgeHearing(request): Promise<ResolvedProposal<HearingJudgment>>;
}
```

`MergedConversationTurn` is judgment fields (bounded suspicion/report deltas,
signal classes, and a player-visible why-line) plus the NPC's next utterance
and three reply suggestions. If a live model breaks that schema, `ProviderService`
retries once, then falls back to composing the rule judgment with the
canned reply set — the schema contents are not shrunk.

`ConversationProposal` contains an NPC utterance and three generated reply
suggestions. Reply intent labels shape variety only; they never decide
suspicion. `ConversationJudgment` is the judging NPC's read of the player's
answer: a bounded suspicion/report delta, the signal classes that applied,
and a player-visible why-line. The runtime clamps deltas and scores;
it does not decide what the answer meant. `AgentStepProposal` contains at
most one tool call, an optional utterance, and a stop flag. The runtime
validates every tool against visibility, role authority, object state, and
the offered catalog.

`HearingJudgment` contains exactly six resident assessments, a proposed
ordinary/abnormal verdict, the Station officer's final line, and record/ledger
citations. The provider sees only the final defense and the run's normalized
resident memories, records, and ledger events. `RunService` validates the
exact actor set and every cited id, clamps unsupported or uncited stance
movement, forces never-met testimony to say so, and enforces four evidenced
vouches as a floor. Four vouches do not force an ordinary result: with the
floor met, the selected model still owns the verdict. Invalid semantic
citations switch the whole judgment to visibly marked deterministic fallback.

## Production profiles

Profiles live in `backend/npc-runtime/providers.config.json`. The checked-in
default is `openai/gpt-5.4-mini`; `NPC_PROVIDER_PROFILE` switches profiles
without changing game code. Model IDs remain opaque profile data and must be
verified by an opt-in live smoke.

Available adapter shapes:

| Profile | Adapter | Credentials |
| --- | --- | --- |
| `openai/gpt-5.4-mini` | Responses | `OPENAI_API_KEY` |
| `modelscope/qwen3.7-plus` (`Qwen-Ambassador/Qwen3.7-Plus`) | Chat Completions | ModelScope env vars |
| `local/openai-compatible` | Chat Completions | `LOCAL_LLM_BASE_URL` |

Secrets are environment variables and never appear in config, logs, fixtures,
or committed files.
The ModelScope profile reads `MODELSCOPE_BASE_URL` and `MODELSCOPE_API_KEY`.
It uses the private `Qwen-Ambassador/Qwen3.7-Plus` model id and disables Qwen
thinking for the bounded JSON envelope; this keeps reasoning tokens from
consuming the response budget before the JSON body is emitted. Its output cap
is 1,600 tokens so the exact-six hearing envelope is not truncated; this is a
ceiling, not a request to lengthen ordinary dialogue.

## Live prompt calibration

Judgment deltas are model-owned but calibrated to the runtime's 0–125 score
scale. The prompt gives magnitude examples for ordinary, mismatched, explicit
outside/dream, and severe refusal cases; they are a ruler, not a deterministic
classifier. This prevents providers that naturally emit 1–5 ratings from
making report and Station pressure unreachable while leaving the actual
meaning judgment with the NPC model.

M3R prompts derive every player-visible output instruction from the run's
supported locale and carry that locale into `AgentStepRequest`; they still
tell the model to stop after a successful goal-satisfying tool result instead
of repeating the same successful read or look until the iteration budget ends.
Tool names and ids stay unchanged for validation. The generic agent-loop
validator also suppresses an identical call after it has already succeeded or
been blocked within the same beat, returning that result to the model so it can
stop or choose a genuinely different next action.

One locale-aware validation stage covers
player-visible dialogue, reply suggestions, judgment reasons, NPC utterances,
and record/ledger prose. Korean keeps its modern-Korean script check; the other
locales use bounded structural and locale instructions without introducing a
second language detector. A mismatch will use the existing single repair
attempt; ids and tool names remain excluded. Supported gameplay locales are
`ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP`.

A run fixes its locale at creation. That tag is part of opening-cache and
request-idempotency signatures and flows through conversation, ambient agent
steps, records, hearing/recap, and fallback selection. Adapters remain
locale-agnostic transports; no
vendor SDK, base URL, or provider profile is added per language. Localized
fallback is structurally bounded in all six locales, while its legacy
keyword signal classifier remains Korean/partial-English and is not treated
as native-quality non-Korean judgment.

## Envelope and failure handling

Adapters return text and usage only. `ProviderService` parses the text with the
zod schemas in `src/providers/envelope.ts`. Invalid JSON receives one bounded
repair request. The following conditions use deterministic fallback and are
reported in `ProposalMeta`:

- missing credentials or unavailable profile;
- timeout (config `runtime.timeoutMs`; sized for judgment-grade calls, not
  the old 2.5-second bark budget);
- rate limiting or transport failure;
- invalid envelope after repair;
- per-session call or token budget exhaustion.

Fallback is resilience, not the production policy. For judgment, fallback is
the deterministic signal classifier in
`src/runtime/conversation-suspicion.ts`; for conversation and agent steps it
is the bounded rule adapter. The HUD shows the selected profile,
`live`/`fallback`/`scripted` transport, and fallback reason.

## Scripted tests

Fixed dialogue, tool sequences, and failure sets live only in
`src/providers/testing/`. `ScriptedNpcAdapter` implements the same domain port
and is injected by integration tests, fixture generation, and the HTTP parity
server. It does not exist in `providers.config.json`, so normal runtime
selection cannot silently become scripted gameplay.

The `Same Order` script is a deterministic regression scenario. It proves the
Godot UI, Session API, tool validation, records, citations, and four authority
outcomes. It is not a production NPC policy.

## Verification

```bash
bun run --cwd backend/npc-runtime check
GODOT_BIN="$GODOT_BIN" backend/npc-runtime/scripts/live-route-parity.sh

# Manual and spend-bearing; never CI
bun run --cwd backend/npc-runtime provider:smoke -- --profile openai/gpt-5.4-mini
bun run --cwd backend/npc-runtime provider:smoke -- --profile modelscope/qwen3.7-plus
```

Under the scripted test adapter, route outcomes are deterministic for a given
answer history — that is what the regression fixtures assert. Under a live
provider, judgment, wording, and validated world attempts are the model's, so
neither routes nor world state are required to be identical across runs; the
guarantees that hold everywhere are validity (visibility, tool validation,
clamps) and a session that ends.

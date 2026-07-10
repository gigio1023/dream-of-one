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

The domain port exposes two operations:

```ts
interface NpcProposalPort {
  proposeConversationTurn(request): Promise<ResolvedProposal<ConversationProposal>>;
  proposeNextStep(request): Promise<ResolvedProposal<AgentStepProposal>>;
}
```

`ConversationProposal` contains an NPC utterance and three generated reply
suggestions. Reply intent labels shape variety only; deterministic
classification owns suspicion. `AgentStepProposal` contains at most one tool
call, an optional utterance, and a stop flag. The runtime validates every tool
against visibility, role authority, object state, and the offered catalog.

## Production profiles

Profiles live in `backend/npc-runtime/providers.config.json`. The checked-in
default is `openai/gpt-5.4-mini`; `NPC_PROVIDER_PROFILE` switches profiles
without changing game code. Model IDs remain opaque profile data and must be
verified by an opt-in live smoke.

Available adapter shapes:

| Profile | Adapter | Credentials |
| --- | --- | --- |
| `openai/gpt-5.4-mini` | Responses | `OPENAI_API_KEY` |
| `modelscope/qwen3.7-plus` | Chat Completions | ModelScope env vars |
| `local/openai-compatible` | Chat Completions | `LOCAL_LLM_BASE_URL` |

Secrets are environment variables and never appear in config, logs, fixtures,
or committed files.
The ModelScope profile reads `MODELSCOPE_BASE_URL` and `MODELSCOPE_API_KEY`.

## Envelope and failure handling

Adapters return text and usage only. `ProviderService` parses the text with the
zod schemas in `src/providers/envelope.ts`. Invalid JSON receives one bounded
repair request. The following conditions use deterministic fallback and are
reported in `ProposalMeta`:

- missing credentials or unavailable profile;
- 2.5-second timeout;
- rate limiting or transport failure;
- invalid envelope after repair;
- per-session call or token budget exhaustion.

Fallback is resilience, not the production policy. The HUD shows the selected
profile, `live`/`fallback`/`scripted` transport, and fallback reason.

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
```

Route truth remains deterministic for a given player statement history.
Provider choices may change NPC wording and validated world attempts, so world
state is not required to be byte-identical across models.

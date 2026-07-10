# AI Provider Ports and Adapters

The AI layer is **ports and adapters**. The game is not "a Qwen game" or "an
OpenAI game": the runtime speaks to one domain port, adapters translate to API
shapes, and profiles (pure config) decide which vendor/model actually serves a
request. Adding a new model — e.g. Qwen3.7-Plus via ModelScope — must be a
config change plus at most a registry entry, never a code path through game
logic.

## Layering

```
game logic (agent loop, conversation)
        │  NpcProposalPort (domain port — the ONLY thing game code sees)
        ▼
provider service: registry, profile selection, budget, retry, fallback ladder
        │  TextGenPort (API-shape port)
        ▼
adapters: ChatCompletionsAdapter │ ResponsesAdapter │ MockAdapter
        ▼
vendors:  ModelScope / OpenRouter / DashScope-compat / local vLLM·Ollama
          │ OpenAI (api.openai.com)
```

Two API-shape adapters cover the market:

| Adapter | API shape | Covers |
|---|---|---|
| `ChatCompletionsAdapter` | OpenAI SDK `chat.completions.create` with configurable `baseURL` + `apiKey` | **Diverse model families** behind OpenAI-compatible endpoints: ModelScope (Qwen, GLM, DeepSeek, ...), OpenRouter, Alibaba DashScope compatible-mode, local vLLM/Ollama |
| `ResponsesAdapter` | OpenAI SDK `responses.create` | **OpenAI models** (gpt-5.x family), where Responses is the native shape (structured outputs, reasoning effort) |

Both are thin: transport, message shaping, structured-output strategy, usage
extraction. No game knowledge.

## Domain port (what game code calls)

```ts
// src/providers/ports.ts
export interface NpcProposalPort {
  proposeUtterance(req: UtteranceRequest): Promise<ProposalResult>;
  proposeNextStep(req: AgentStepRequest): Promise<ProposalResult>; // M3
}

export interface TextGenPort {
  generate(req: TextGenRequest): Promise<TextGenResult>; // messages in, text/JSON out
  preflight(): Promise<PreflightResult>;                 // cheap availability check
}

// ProposalResult = { ok: true, envelope: ProposalEnvelope, usage, profileId }
//                | { ok: false, reason: ProviderFailReason }  → caller falls back
```

`ProposalEnvelope` (zod schema, `src/providers/envelope.ts`):

```ts
{
  utterance?: { text: string; intent: string; locale: "ko" | "en" };
  toolCall?:  { tool: string; args: Record<string, unknown> }; // must be from the offered catalog
  confidence?: number;
}
```

Envelope extraction strategy per adapter: native structured-output/JSON mode
where the endpoint supports it, otherwise instructed-JSON with zod parse and
one bounded repair retry. A proposal that fails validation is a *fallback
event, never an error surfaced to gameplay*.

## Profiles and registry

Profiles are declarative config (`backend/npc-runtime/providers.config.json`,
committed; secrets stay in env). **First-class profiles** (keys available to
this project now, used by default in M2 work and smokes): `modelscope/*` and
`openai/*`. OpenRouter/local entries are supported examples, not defaults:

```jsonc
{
  "profiles": {
    "modelscope/qwen3.7-plus": {
      "adapter": "chat-completions",
      "baseUrlEnv": "MODELSCOPE_BASE_URL",     // e.g. https://api-inference.modelscope.cn/v1
      "apiKeyEnv": "MODELSCOPE_API_KEY",
      "model": "Qwen/Qwen3.7-Plus",            // verify exact id at first use
      "params": { "temperature": 0.7, "maxTokens": 300 },
      "structured": "json-instructed"
    },
    "openai/gpt-5.4-mini": {
      "adapter": "responses",
      "apiKeyEnv": "OPENAI_API_KEY",
      "model": "gpt-5.4-mini",
      "params": { "reasoningEffort": "low", "maxTokens": 300 },
      "structured": "native"
    },
    "openrouter/default": {
      "adapter": "chat-completions",
      "baseUrlEnv": "OPENROUTER_BASE_URL",
      "apiKeyEnv": "OPENROUTER_API_KEY",
      "model": "qwen/qwen3.6-plus",
      "structured": "json-instructed"
    },
    "local/ollama": {
      "adapter": "chat-completions",
      "baseUrlEnv": "OLLAMA_BASE_URL",
      "apiKeyEnv": null,
      "model": "qwen3:8b",
      "structured": "json-instructed"
    },
    "mock/scripted": { "adapter": "mock" }
  },
  "selection": {
    "default": "off",                          // deterministic-only
    "envOverride": "NPC_PROVIDER_PROFILE",     // e.g. modelscope/qwen3.7-plus
    "perRole": {}                              // later: cheap model for ambient, better for Station
  }
}
```

Registry rules:

- **No hardcoded vendor anything** outside adapters + this config. Base URLs
  come from env (with documented defaults in `.env.example`), keys only from
  env.
- **Model ids are opaque strings** owned by the profile. Never assume a model
  exists: `preflight()` runs once at session start; failure downgrades the
  session to fallback with a single HUD-debug notice.
- Exact current model names/prices live at the vendor console, not in docs —
  record them in the profile when configuring, verify at first use.

## Fallback ladder (always terminates)

```
selected profile → (optional) fallbackProfile → deterministic line bank / policy
```

Triggers: missing key, preflight fail, timeout (default 2500ms), rate limit,
malformed envelope after one repair retry, budget exceeded. Every fallback
emits a telemetry event with reason. Gameplay never blocks on a provider:
conversation shows a beat-appropriate "thinking" cue and takes the fallback
line if the deadline passes.

## Budget

Per-session token/call budget enforced in the provider service (defaults:
~50 calls or ~50k tokens per session, config-overridable). Usage accounting
(input/output tokens per profile) accumulates in session telemetry and prints
in the debug overlay. Exceeding budget = silent permanent fallback for the
rest of the session.

## Testing

- **Contract tests** run the whole provider service against `MockAdapter`
  (scripted envelopes + scripted failures) — validation, fallback ladder,
  budget, and envelope repair are fully testable offline. CI runs these.
- **Live smokes**
  (`bun run --cwd backend/npc-runtime provider:smoke -- --profile modelscope/qwen3.7-plus`)
  are manual/opt-in, spend pennies, and print utterance + usage. Never in CI.
  Default smoke targets are the two first-class profiles (ModelScope, OpenAI).
- The game with `default: "off"` must be byte-identical in route outcomes to
  the game with providers on (providers change texture, not truth) —
  `route_smoke.gd` asserts this by running routes in both modes (M2).

## What carries over from v1

v1's `openai-codex` broker (ChatGPT-backend device auth, `codex-broker.ts`,
tool gateway) is **retired** — it solved auth for a quota-opaque endpoint we
no longer depend on. Salvage: the proposal-boundary philosophy, the packet
shapes feeding proposals (`actorMemory`, `actorPolicy`, visible-context
assembly), budget-capped smoke patterns, and the scheduling contract that
batches NPC proposal jobs. The old `OPENAI_BASE_URL` override in `config.ts`
is superseded by the registry.

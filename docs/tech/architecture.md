# Architecture

## System map

```mermaid
flowchart LR
    subgraph Client["Godot 4.x 2D client (godot/)"]
        Scenes["Scenes: world tilemaps,\nactors, record props"]
        HUD["HUD: conversation panel,\nsuspicion, ledger line"]
        Bridge["RuntimeBridge\n(HTTP or embedded)"]
    end

    subgraph Runtime["NPC runtime (backend/npc-runtime/, TypeScript)"]
        Decision["DecisionService\n(deterministic authority)"]
        Suspicion["Suspicion classifier\n+ reason taxonomy"]
        World["World state: records,\ncivic ledger, economy"]
        Agent["Agent-loop engine:\ncontext assembly, tool validation"]
        Ports["Provider ports\n(NpcProposalPort)"]
    end

    subgraph Providers["Adapters (config-selected profiles)"]
        CC["ChatCompletionsAdapter\nOpenAI SDK + custom baseURL\n(ModelScope, OpenRouter, local, ...)"]
        RESP["ResponsesAdapter\nOpenAI Responses API\n(gpt-5.x family)"]
        MOCK["MockAdapter (tests)\n+ deterministic fallback"]
    end

    Scenes --> Bridge
    HUD --> Bridge
    Bridge <--> Decision
    Decision --> Suspicion
    Decision --> World
    Decision --> Agent
    Agent --> Ports
    Ports --> CC
    Ports --> RESP
    Ports --> MOCK
```

## Boundaries (load-bearing)

1. **Godot never computes truth.** The client renders state, captures input,
   and forwards player actions/answers to the runtime. All suspicion, record,
   ledger, verdict, and session-end decisions come back from the runtime.
2. **The runtime never touches a vendor SDK.** All LLM access goes through
   `NpcProposalPort`; adapters are the only files that import the OpenAI SDK
   or know a base URL. Spec: [`ai-provider-ports.md`](ai-provider-ports.md).
3. **Providers never mutate.** Adapter output is a `ProposalEnvelope`
   (wording + at most one tool call); the agent-loop engine validates it like
   any other candidate action.

## Where the NPC brains live — decided: the TS runtime

The question that settles the client/runtime split: where is it best to
implement *many concurrent NPC brains* that assemble context, talk to LLM
provider APIs, and manage memory? Answer: TypeScript, decisively.

| Concern | TS runtime (Node) | GDScript in-engine |
|---|---|---|
| Concurrent LLM calls for N NPCs | Native async I/O; trivial fan-out, timeout, retry per NPC | `HTTPRequest` nodes + signal plumbing per call; awkward at N>2 |
| Provider SDKs | Official OpenAI SDK (both API shapes), mature streaming | No first-class LLM SDK; hand-rolled HTTP + SSE parsing |
| Schema validation of proposals | zod at every boundary, typed end to end | Manual `Dictionary` checking, no type safety |
| Context/prompt assembly, token budgeting | First-class string/JSON tooling, tokenizer libs | Possible but clumsy |
| Testing brains without the engine | Plain unit/fixture tests, headless simulation of whole social scenes | Engine-coupled tests only |
| Frame-rate isolation | Brain latency can never hitch rendering (separate process) | LLM waits share the main loop |

So: **brains (agent loop, context assembly, provider ports, memory, all
deterministic authority) live in `backend/npc-runtime/`. Godot is the body
and the stage** — senses in (observations, player input), actions out
(validated mutations to render). This also means the whole social sim can run
headless (fixture NPCs conversing without a renderer), which is how agent-loop
work gets tested from M3 on.

## Client ↔ runtime transport

- **HTTP sidecar.** The runtime runs as a local Node process
  (`npm run serve`) exposing the v1-proven endpoint shape
  (`/v1/npc/decision`, plus v2 session endpoints). Godot talks JSON over
  localhost. Fast iteration, engine-independent testing.
- **Packaging (M5 detail, not an architecture question):** the shipped build
  bundles the sidecar (launcher starts/stops it; Node runtime packaged
  per-OS). Porting brains to GDScript is explicitly rejected per the table
  above; if bundling proves painful at M5, the fallback investigation is a
  compiled single-binary sidecar (e.g. pkg/bun-style), never an engine port.

## Data flow contracts

- **Schema first.** `backend/npc-runtime/src/runtime/schema.ts` +
  `src/godot/runtime-schema.ts` define every packet crossing a boundary
  (session events, decision packets, proposal envelopes, ledger events).
  Zod-validated on both ingress and egress. Godot-side parsing stays dumb.
- **Semantic world layout.** `godot/data/world_layout.json` remains the
  source for landmarks/zones/anchors/actors, extended with a `tile` block
  (grid coords) for 2D. The client renders it; the runtime reasons over it.
  One file, two consumers, no duplicated world truth.
- **Content as data.** Storylets compile from `docs/scenario/` canon into
  runtime data (`backend/npc-runtime/data/storylets/*.json`); lines, choices,
  classification patterns, and route definitions are data, not code.

## Repo layout target

```
godot/                     # 2D client (rebuilt in M1)
  scenes/ scripts/ assets/ data/ tools/
backend/npc-runtime/
  src/
    runtime/               # deterministic core (kept+trimmed from v1)
    agentloop/             # v2: context assembly, tool validation, iteration
    providers/             # v2: ports, adapters, registry, budget
    api/                   # http server
    contracts|godot/       # schemas
  data/storylets/          # compiled content
docs/                      # this documentation tree
```

Module inventory and the v1 keep/trim/remove list:
[`npc-runtime.md`](npc-runtime.md).

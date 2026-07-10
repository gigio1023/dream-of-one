# Glossary

Canonical terms. Code, docs, and content use these exactly; player-facing
Korean strings in parentheses.

| Term | Meaning |
|---|---|
| **Station** (스테이션) | The town's administrative authority. Receives reports, cites records, runs intake → inquest → verdict. Deterministic runtime authority, never LLM-driven. |
| **Record** (기록) | A persistent in-world artifact created by a validated NPC/player action: a clerk note, correction slip, report, posting, dossier entry. Records are readable by roles with visibility and are the medium of social propagation. |
| **Civic ledger** (시민 원장) | Append-only event log of validated world mutations. Every record change, role action, and value change lands here; NPCs observe ledger events they can see. |
| **Suspicion signal** (의심 신호) | Deterministic classification of a player answer or behavior (odd wording, contradiction, hesitation/`response_hesitation_noted`, refusal). Signals raise NPC suspicion; they are computed by rules, never proposed by a model. |
| **Route** (경로) | One deterministic outcome arc of a scenario. The canonical four: clean cover (무사 통과), repair recovery (수습), soft report (약식 보고), hard inquest (심문). |
| **Storylet** | A small social situation containing scene facts, actor objectives, deterministic signals, and authority outcome presentation. It does not contain production choice lists or NPC reply sequences. |
| **Agent loop** | The NPC decision cycle: observe → choose/receive a proposed tool call → validate → apply → read result → update memory → iterate. See [`npc-agent-loop.md`](npc-agent-loop.md). |
| **Tool** | A small validated world action available to an NPC role (`move_to`, `look`, `talk_to`, `use_object`, `write_record`). Tools are the only way anything mutates the world. |
| **Affordance** | An object- or place-scoped action a role may take, with visibility rules (who can see/use it). |
| **Proposal** | LLM output: candidate wording and/or one next tool call, inside a schema envelope. Proposals are suggestions; validation decides. |
| **Provider / profile / port / adapter** | Provider = an LLM API vendor endpoint. Profile = named config (adapter + base URL + model + params). Port = the interface the runtime calls. Adapter = port implementation for an API shape. See [`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md). |
| **Fallback** | Deterministic resilience used when the selected provider is unavailable, over budget, or invalid. It is visibly marked and is never the production default profile. |
| **Suspicion / report pressure** (의심 / 보고 압박) | Per-NPC suspicion accumulates into social report pressure; thresholds trigger reports to the Station. Deterministic. |
| **Fun gate** | The single product gate: after playing a slice, "would I play this again for five minutes?" Honest answer recorded in the PR. |
| **Session** | One run from start to a deterministic end state (verdict or exit). Replay with different answers must reach a meaningfully different route. |

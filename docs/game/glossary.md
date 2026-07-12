# Glossary

Canonical terms. Code, docs, and content use these exactly; player-facing
Korean strings in parentheses.

| Term | Meaning |
|---|---|
| **Station** (스테이션) | The town's administrative authority. Receives reports, cites records, runs intake → inquest → verdict. The judgment inside those steps is the model's — a persuasive player can genuinely turn a verdict — while the runtime guarantees the procedure stays valid and the session ends. |
| **Record** (기록) | A persistent in-world artifact created by a validated NPC/player action: a note, correction, report, posting, or dossier entry. Records are readable by roles with visibility and carry factual/institutional information. In M3R they never substitute for a real conversation or directly move personal stance. |
| **Civic ledger** (시민 원장) | Append-only event log of validated world mutations. Every record change, role action, and value change lands here; NPCs observe ledger events they can see. |
| **Suspicion signal** (의심 신호) | A labeled class of suspicious answer or behavior (odd wording, contradiction, hesitation/`response_hesitation_noted`, refusal). The judging NPC's model decides which signals apply and how much suspicion moves; rules clamp the movement and keep a fallback classifier for provider outages. |
| **Route** (경로) | One canonical outcome arc kept as a regression test: clean cover (무사 통과), repair recovery (수습), soft report (약식 보고), hard inquest (심문). Live play may leave these arcs. |
| **Storylet** | A small social situation containing scene facts, actor objectives, ending thresholds, and outcome presentation. It does not contain production choice lists, NPC reply sequences, or classification rules. |
| **Agent loop** | The NPC decision cycle: observe → choose/receive a proposed tool call → validate → apply → read result → update memory → iterate. See [`npc-agent-loop.md`](npc-agent-loop.md). |
| **Tool** | A small validated world action available to an NPC role (`move_to`, `look`, `talk_to`, `use_object`, `write_record`). Tools are the only way anything mutates the world. |
| **Affordance** | An object- or place-scoped action a role may take, with visibility rules (who can see/use it). |
| **Proposal** | LLM output inside a schema envelope: candidate wording, a suspicion judgment, and/or one next tool call. Wording and judgment are the model's to make; world mutations remain suggestions that validation decides. |
| **Provider / profile / port / adapter** | Provider = an LLM API vendor endpoint. Profile = named config (adapter + base URL + model + params). Port = the interface the runtime calls. Adapter = port implementation for an API shape. See [`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md). |
| **Fallback** | Deterministic resilience used when the selected provider is unavailable, over budget, or invalid. It is visibly marked and is never the production default profile. |
| **Suspicion / institutional pressure** (의심 / 제도 압력) | Suspicion is each NPC's private, model-judged input and never accumulates directly into the public pressure state. Institutional pressure changes only when an authorized NPC proposes a validated administrative record action; the runtime clamps that mutation and appends its attributable ledger event. Conversation and record-reading may change what an NPC believes, but neither directly changes personal stance or pressure outside that record action. |
| **Fun gate** | The single product gate: after playing a slice, "would I play this again for five minutes?" Honest answer recorded in the PR. |
| **Run** (회차) | The unit of play (2026-07-11): the player arrives as an outsider with a scheduled Station hearing as the deadline, and a run spans multiple conversations and incidents in continuous world time. Only a player-modal conversation, including its merged reply wait, pauses that clock; ambient NPC work stays asynchronous. Suspicion, records, stances, and the ledger persist across conversations within a run and reset together between runs. Replay with different answers must reach a meaningfully different run. |
| **Stance** (태도) | The coarse player-facing form of an NPC's existing opinion toward the player: `oppose`, `uncertain`, or `vouch`. It is built only from that NPC's real memories, model-judged, and rule-clamped; a vouch additionally requires meaningful first-hand player conversation. |
| **Hearing** (청문회) | The only scheduled run-ending Station event in M3R. Four of six evidenced vouches are the deterministic eligibility floor, not the verdict; after the final defense, the model judges the six residents' pooled memories inside guaranteed procedure. Classified ordinary = win; definitive abnormal verdict = loss. |
| **Session** | One conversation with a guaranteed ending — the runtime unit behind the Session API. A session ending is not a run ending: a survived interrogation returns the player to the run. |

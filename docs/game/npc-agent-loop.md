# NPC Agent Loop

The permanent AI/NPC philosophy (inherited from v1's final direction lock,
now the build target instead of a doctrine): **NPCs are constrained agents
running a coding-agent-style loop inside the game world.** Do not extend NPCs
by authoring fixed social reaction chains ("if Station citation then Park
warning"). Author tools, visibility, and rules; let role agents iterate.

Search anchors for future agents: `AGENT_LOOP_RUNTIME`, `NPC_TOOL_LOOP`,
`NO_FIXED_SOCIAL_CHAINS`.

## The loop

```
loop (per NPC, per beat, budgeted):
  1. observe   — assemble the NPC's bounded context:
                 role, goals, policy, actor memory,
                 visible objects/records/actors, heard speech,
                 available tool catalog (from affordances)
  2. propose   — pick the next step:
                 deterministic policy first (fallback always works);
                 provider proposal when a profile is live
                 (one tool call + optional utterance, schema-bound)
  3. validate  — runtime checks the tool call against the catalog,
                 role permissions, visibility, object state, budget
  4. apply     — valid → world mutation + civic ledger event
                 invalid/blocked → structured failure result
  5. read      — the NPC reads the result (success, blocked, busy, refused)
  6. update    — actor memory append; conversation state; goal priority shift
  7. iterate   — up to N steps per beat (default 3–6), then yield
```

The key property carried from v1's design: **a blocked or busy result must
change the NPC's next step.** An agent that retries the same tool against the
same blocked state is a bug.

## Tool catalog (v2 baseline, ≤ 8 tools)

| Tool | Effect | Validation highlights |
|---|---|---|
| `move_to(place_or_actor)` | Pathfind toward a navpoint/actor | Reachability, role area permissions |
| `look(target)` | Add a visible object/actor/record to context | Line of sight, visibility rules |
| `talk_to(actor, intent)` | Open/continue conversation; utterance from proposal or line bank | Target availability (busy/refusing), social rules |
| `wait(reason)` | Yield a beat, keep intent | Always valid; consumes iteration |
| `use_object(object, affordance)` | Trigger an object affordance (serve, mark queue, post notice, pause service) | Affordance exists for role, object state |
| `write_record(kind, target)` | Create/update a record (note, correction, report, posting, citation) | Role authority for the record kind; becomes a ledger event |
| `read_record(record)` | Load a visible record into memory | Visibility (열람 rules) |
| `request(actor, action)` | Ask another NPC to act (handoff, confirmation) | Target role can perform the action |

Player-directed danger stays deterministic: suspicion classification of player
speech is **not** a tool and never goes through the provider.

## Memory and context bounds

- **Actor memory** = the NPC's own validated actions + ledger events the NPC
  actually observed (visibility-checked). No omniscient NPCs.
- **Actor policy** = stable goals, priority shifts, action-selection policy,
  forbidden claims. Deterministic data, editable per role.
- Context assembly is a pure function of world state — the same packet shape
  feeds the deterministic policy, the provider proposal, and the debug
  transcript.

## Provider involvement

When a provider profile is live (see
[`../tech/ai-provider-ports.md`](../tech/ai-provider-ports.md)), step 2 sends
the observe-packet and receives a `ProposalEnvelope`: at most one tool call
from the offered catalog plus optional utterance text. Validation treats a
provider proposal exactly like a deterministic one — no trust distinction.
Provider unavailable, over budget, or invalid → deterministic policy decides.
The game must be indistinguishable in *structure* (routes, records, verdicts)
with providers on or off; providers change texture, not truth.

## Transcript (player/agent-readable)

Every NPC keeps a rolling transcript of loop iterations: observed context
summary, chosen/proposed tool, validation result, world effect, next-step
change. Exposed two ways:

- **Debug overlay** (dev builds): full transcript per NPC.
- **In-world legibility** (all builds): reaction markers, `보는 단서` (what
  the NPC can see), `들은 말`/`오간 말` (what was heard/exchanged), influence
  links from source actor to reacting actor. v1 proved these HUD patterns;
  v2 re-implements them in 2D where they are cheaper and clearer.

## Milestone mapping

- **M1** ships the loop's *shape* deterministically: NPCs run observe →
  policy → validate → apply with the tool catalog, no provider.
- **M2** adds provider proposals through the ports.
- **M3** is the full probe: 2 NPCs + 1 object/record, ≤ 5 tools active, 3–6
  iterations per beat, a blocked result visibly changing a plan, transcript
  overlay shipped. Acceptance details:
  [`../plan/m3-agent-loop-npcs.md`](../plan/m3-agent-loop-npcs.md).

# Game Studio Usage

This file defines how Dream of One uses the project-local Game Studio overlay.
It is an operating guide for Codex sessions in this repository, not a separate
toolchain.

## Purpose

Use Game Studio to keep agent work tied to playable validation, role review,
and product gates.

The main output is still the game. In Dream of One, Game Studio should push
Codex toward the smallest playable improvement that makes the intended
conversation-first social simulation clearer in the running build. Tests,
AI-play probes, Evidence records, packets, and review notes are support tools;
they should not become the work when a missing mechanic, consequence, role
action, or readable environment affordance can be implemented.

Current direction is open-environment first. Store/Station is a small example,
not the game premise. When a decision would deepen Store operations or Station
procedure, first ask whether it proves a reusable pattern for any social
environment. If not, keep it out.

Game Studio does not replace Linear, `.game-harness/`, Git, backend checks,
Godot checks, or human authority over taste, Direction Lock, stage movement, and
public promises.

## Current Route

| Item | Value |
|---|---|
| Entry mode | `direction-carry-in` |
| Engine profile | `godot` |
| Scope profile | `solo-indie` with small-team role overlay |
| Genre profiles | `social-stealth`, `narrative-ai` |
| Review mode | `lean` |
| Decision mode | `agentic` with human authority |
| Current stage | M1 Conversation Protocol Proof |
| Current gate | Product closure pending after technical conditional pass |

The active state record is `.game-studio/project-state.md`. The active M1
execution harness remains `.game-harness/`.

## Default Loop

For player-facing or milestone work:

1. Read `.game-studio/project-state.md`.
2. Read `.game-harness/current-stage.md` when M1 scope is involved.
3. Identify the missing game consequence or player-facing improvement first.
4. Reduce it to the smallest playable implementation slice.
5. Use the strictest relevant Game Studio skill.
6. Run the cheap checks that match the touched area.
7. Report a verdict as `READY`, `CONCERNS`, or `NOT_READY`.

Passing scripts are repository health checks. They are not enough to approve
game quality, release claims, or stage movement.

If the next proposed action is only a new test, helper, manifest, review packet,
or documentation pass, verify that it directly protects a playable game change
or unblocks external play. Otherwise, implement the small game change first.

## Economy Work Rule

Economy design in this repository must be agile and playable.

Before adding an economy feature, reduce it to one loop:

```text
source -> pool -> actor decision -> sink/transform -> player-readable consequence
```

Use external references and research to choose the pattern, but do not write a
large economy spec before proving the smallest loop in Godot/backend Evidence.
For the current M1 target, economy may be deliberately crude. A few readable
values such as trust, burden, attention, tokens, queue delay, or account points
are enough if they change one visible NPC choice. Economy means ordinary social
obligations around records: who creates a burden, who sees it, who must repair,
report, warn, refuse, gossip, or cite. Store management, prices, wages, rent,
inventory, taxes, and multi-shop systems are blocked until the small social
record loop is readable and externally understood.

Use standard game-economy terms only as a small-loop checklist:

- source/tap: the action that creates value, burden, or obligation;
- pool: the visible place where it rests;
- sink/drain: the action that spends, repairs, consumes, or formalizes it;
- converter: the step that turns speech into record or correction into closure;
- gate: the role/visibility/authority rule that decides which action is valid;
- measurement: Evidence Pack proof that the player-facing consequence happened.

One economy increment means one hypothesis, one visible role-action change, and
one proof run. Stop after the first readable proof before adding another value.

Do not define pressure in detail before the running build needs it. A proposed
economy value is valid only if it changes one visible role decision inside the
current example environment. The next economy work should favor a local
repair/report/social-reaction loop over broader business-management systems:

```text
record problem -> simple value changes -> role decision -> visible reaction
```

When using external economy references, translate them through this filter:

- core-loop/source-sink references define vocabulary, not feature scope;
- colony/city-sim references justify a value only when it changes event or role
  selection;
- operation-sim references justify concrete chores, props, and readable
  service consequences;
- live-economy references justify measurement and explicit sinks only after
  the current playable loop is understood.

## Skill Routing

| Skill | Use when |
|---|---|
| `game-studio` | Planning a milestone, stage, roadmap, demo gate, release gate, or next proof. |
| `game-director` | Reviewing thesis, pillars, player role, presentation choice, AI premise, Direction Lock, or release promise. |
| `narrative-director` | Reviewing dialogue, scenario flow, lore, story branch coverage, Korean-first text, or narrative AI boundaries. |
| `game-review-council` | Running role-led readiness review across director, systems, narrative, QA, producer, UX, art, audio, or release lenses. |
| `game-evidence-gate` | Checking whether a claim is backed by playable proof and concrete internal artifacts. |
| `game-execution` | Turning an accepted proof target into implementation handoff, file ownership, verification, and drift tracking. |
| `game-onboarding` | Only when a new project area has missing or ambiguous direction. Dream of One itself is already `direction-carry-in`. |

## Dream Of One Rails

Game Studio review must preserve these project rails:

- Player is not an investigator.
- NPCs, local institutions, and authority systems investigate the player.
- Text is where the danger starts.
- Provider output is wording only.
- Backend/runtime owns deterministic validation, fallback selection, scheduling,
  Evidence semantics, Exposure, reports, formal transitions, verdict, and
  session termination.
- Korean source meaning is the primary text authority; English text must keep
  consequence parity.
- Do not call M1 a vertical slice or public demo.

## Common Requests

Use these request shapes in Codex when starting focused work:

```text
Use game-evidence-gate to check whether the current M1 Same Order proof is
backed by the required playable artifacts and verification ledger entries.
```

```text
Use game-review-council in lean mode to review M1 product closure for Game
Director, Narrative, Systems, QA, and Producer roles.
```

```text
Use game-execution to turn the accepted M1 free-input UI proof target into file
ownership, implementation steps, and verification checks.
```

```text
Use narrative-director to review Korean-first dialogue and Station wording
against Dream Law, Cover Test, Exposure, and deterministic consequence rules.
```

## Check Routing

Use these checks when the touched area requires them:

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
```

If Godot is not installed or not on `PATH`, record the blocker instead of
claiming the Godot proof passed.

## Codex App Position

For this repository, Codex app should be treated as a production and review
layer around the game, not as the player runtime. The game runtime should keep
using the backend/provider boundary defined in `.game-studio/project-state.md`.

Useful Codex app framing:

- project-local skills for direction, execution, and review.
- browser or visual review of local captures when available.
- worktree or local runs for checks and implementation.
- future debug/review tools around Evidence Packs, Station review, and route
  comparison.

Do not make Codex app availability a player requirement.

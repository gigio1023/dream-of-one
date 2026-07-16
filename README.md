# Dream of One

> **The society investigates you.**

[![Godot 4.7](https://img.shields.io/badge/Godot-4.7-478CBF?logo=godot-engine&logoColor=white)](https://godotengine.org/)
![Development Bun 1.3.14](https://img.shields.io/badge/development-Bun%201.3.14-FBF0DF?logo=bun&logoColor=black)
![Korean first](https://img.shields.io/badge/content-Korean--first-B86055)

Dream of One is a first-person social-simulation game set in one small 3D
town. Six persistent residents move on ordinary game-AI schedules, meet and
talk to one another, remember what they heard, and use an LLM to form their
own judgments about the player.

The player arrives as an outsider and must change those beliefs through
conversation before a scheduled Station hearing. Four residents need
meaningful first-hand grounds to vouch for the player, but the model still
owns every resident assessment and the final ordinary/abnormal verdict.

The current active milestone and build truth live in
[`docs/plan/m3-first-person-town.md`](docs/plan/m3-first-person-town.md).

## Playable now

- Explore a seamless low-fi park, Studio reception, Office, and Station in
  first person; every visible building is enterable through an open portal.
- Walk, look, jump, and pick up, move, or throw a small set of physical props.
- Meet six residents who wander locally, follow schedules, approach grounded
  targets, and hold audible NPC-to-NPC conversations.
- Talk through three model-generated reply suggestions or bounded free text.
- See model-owned suspicion/stance changes with attributed why-lines,
  encountered records, and social provenance.
- Reach the scheduled hearing, submit a final defense, and receive six
  memory-grounded testimonies plus a model-owned verdict.
- Run the same UI/provider path in Korean, English, Italian, Simplified
  Chinese, French, or Japanese.

Production play is provider-first and fail-closed. The runtime may ask the
same selected model once to repair an invalid schema. If credentials, network,
budget, timeout, or validation still fail, the affected event applies no NPC
speech, judgment, action, memory, testimony, or verdict. The HUD displays a
simulation interruption and preserves the exact request for retry or lets the
player abandon the interrupted run. Fixed responses exist only in explicitly
selected test fixtures.

## Run the game

Requirements:

- Godot **4.7.x stable**
- Bun **1.3.14+**
- a configured provider key such as `MODELSCOPE_API_KEY` or `OPENAI_API_KEY`

```bash
export GODOT_BIN="/absolute/path/to/Godot"
test -e backend/npc-runtime/.env || \
  cp backend/npc-runtime/.env.example backend/npc-runtime/.env
# Add the provider key locally. This file is ignored and must never be committed.

bun install --cwd backend/npc-runtime --frozen-lockfile
PORT=18787 bun run --cwd backend/npc-runtime serve
```

In a second terminal:

```bash
DREAM_SESSION_MODE=http \
DREAM_SESSION_URL=http://127.0.0.1:18787 \
"${GODOT_BIN:?set GODOT_BIN to the local Godot CLI}" --path godot
```

The checked-in provider profiles live in
[`backend/npc-runtime/providers.config.json`](backend/npc-runtime/providers.config.json).
Select one with `NPC_PROVIDER_PROFILE`; model availability is checked at
runtime rather than assumed.

### Controls

| Action | Keyboard / mouse |
|---|---|
| Move | `WASD` |
| Look | Mouse |
| Jump | `Space` |
| Interact / talk / handle prop | `E` |
| Choose a reply | Mouse or `1`–`3` |
| Submit free text | `Enter` or the submit button |
| Open encountered social log | `Tab` |
| Settings / close a non-modal surface | `Esc` |

Conversation is modal: movement, camera, world time, NPC simulation, and
physics pause until the exchange closes. Provider work for free-world NPC
meetings remains asynchronous and is revalidated against the latest world
revision before any effect applies.

## Architecture

| Layer | Owns | Must not own |
|---|---|---|
| Godot client | First-person presentation, input, local physics, HUD, observed spatial facts | Suspicion, memory/record semantics, testimony, verdicts |
| TypeScript runtime | Context separation, tool validation, clamps, records/ledger, scheduling, run lifecycle, provider-interruption state | NPC wording or social judgment |
| AI provider through ports | NPC wording, reply suggestions, suspicion/stance judgment, next tool proposals, hearing judgment | Direct world mutation or unseen context |

All vendor access goes through `NpcProposalPort` → `TextGenPort` adapters.
Production storylets provide setting, roles, goals, secrets, and scene facts;
they never contain ordered reply sets or social consequences. The scripted
adapter is registry-inaccessible and exists only for deterministic smokes.

See [`docs/tech/architecture.md`](docs/tech/architecture.md),
[`docs/tech/npc-runtime.md`](docs/tech/npc-runtime.md), and
[`docs/tech/ai-provider-ports.md`](docs/tech/ai-provider-ports.md).

## Develop and verify

Headless is the default implementation-time route so the game does not steal
desktop focus:

```bash
bun run --cwd backend/npc-runtime check
"$GODOT_BIN" --headless --import --path godot
DREAM_SESSION_MODE=fixture \
  "$GODOT_BIN" --headless --path godot \
  --script res://tools/scene_load_smoke.gd
```

Headless checks prove imports, scene/script loads, deterministic runtime
authority, localization parity, and fixture routes. They do not prove rendered
composition, camera feel, native IME behavior, or whether the game is fun.
Those claims require the smallest relevant windowed play run and the honest
five-minute fun gate described in
[`docs/tech/verification.md`](docs/tech/verification.md).

Start documentation at [`docs/README.md`](docs/README.md). Contribution and
commit discipline are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

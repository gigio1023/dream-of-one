# Content Guide

## Canon source of truth

Engine-agnostic scenario canon lives in [`../scenario/`](../scenario/) and
survived the v1→v2 reboot intact. Reuse it before writing new canon:

| File | What it holds | v2 use |
|---|---|---|
| `scenario/content/same-order-storylet-packet.md` | The complete `Same Order` (같은 주문) storylet: prompts, choices, signals, routes | M1's playable slice implements exactly this |
| `scenario/content/social-simulation-cards.md` | ~700 lines of social situation cards | Source for M4 storylets |
| `scenario/content/dialogue-line-bank.md` | Reusable NPC lines by role/intent | Deterministic fallback lines |
| `scenario/content/environment-affordance-map.md` | Object affordances per role | Tool catalog + `use_object` validation data |
| `scenario/content/location-placement-contracts.md` | Where objects/NPCs belong per location | 2D scene layout |
| `scenario/content/korean-voice-notes.md` | Korean tone/voice rules | All KO writing |
| `scenario/bible/12-conversation-suspicion-prologue.md` | Prologue arc | M5 demo arc |

## Tone

Mundane-administrative with a low hum of wrongness. NPCs are polite,
procedural, and never cartoonishly sinister — dread comes from how ordinary
the questions are and how permanent the records feel. Korean first; the
Korean voice notes govern register (존댓말 defaults, clipped clerk speech,
Station's flat officialese).

## Writing rules

- Every NPC prompt needs its three-choice set with a felt safe/uncertain/risky
  gradient, plus deterministic classification patterns for typed input.
- Every suspicion signal needs a why-line (이유 문장) a player can read.
- Role voice separation is strict: NPC speech, player choices, and system/HUD
  text use distinct registers and must never be attributed across roles.
- Content lives in data files (storylet packets → runtime data), not in code.
  Player-visible strings never appear as literals in GDScript/TS logic.

## Localization

- Author KO → translate EN. Parity is a release (M5) requirement, not a
  per-slice gate.
- The v1 localization smoke pattern carries over: a headless check that every
  player-facing key resolves in both locales.

## Provider-written text boundary

LLM proposals may vary NPC wording within an intent (a probe stays a probe, a
refusal stays a refusal) and must respect forbidden-claims lists in actor
policy. Provider text never introduces facts absent from the NPC's memory or
visible context. Fallback lines from the line bank must exist for every
intent the provider can color.

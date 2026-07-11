# Content Guide

## Canon source of truth

Engine-agnostic scenario canon lives in [`../scenario/`](../scenario/) and
survived the v1→v2 reboot intact. Reuse it before writing new canon:

The Store-specific names, layouts, choices, and route ordering in the M1
packet remain regression-fixture material, not M3R world instructions. M3R
reuses tone, role pressures, visibility constraints, and the general
outsider-under-procedure premise, then re-expresses them through the studio,
office, park, and Station named in the active milestone. When a legacy
scenario page conflicts with the M3R milestone or the late 2026-07-11 owner
block, the newer active direction wins.

| File | What it holds | v2 use |
|---|---|---|
| `scenario/content/same-order-storylet-packet.md` | `Same Order` prompts, choices, signals, and routes | M1 scripted regression adapter; not M3R layout or production dialogue policy |
| `scenario/content/social-simulation-cards.md` | ~700 lines of social situation cards | Source for M4 storylets |
| `scenario/content/dialogue-line-bank.md` | Reusable NPC lines by role/intent | Scripted tests and bounded fallback reference |
| `scenario/content/environment-affordance-map.md` | M1 object affordances per role | Source patterns for tool validation; Store-specific objects are not M3R requirements |
| `scenario/content/location-placement-contracts.md` | Legacy placement and readability constraints | Reuse sightline/landmark principles, not the Store layout; M3R's 3D layout is newly authored |
| `scenario/content/korean-voice-notes.md` | Korean tone/voice rules | All KO writing |
| `scenario/bible/12-conversation-suspicion-prologue.md` | Prologue arc | M5 demo arc |

## Tone

Mundane-administrative with a low hum of wrongness. NPCs are polite,
procedural, and never cartoonishly sinister — dread comes from how ordinary
the questions are and how permanent the records feel. Korean first; the
Korean voice notes govern register (존댓말 defaults, clipped clerk speech,
Station's flat officialese).

**Setting/naming rule (stateless district):** the town is a placeless
administrative zone. No real-world countries, cities, brands, currencies, or
holidays. Places and institutions use generic-administrative names (스테이션,
구역/번호, 스튜디오, 사무실); people use role titles over surnames where
possible. Korean is the authoring language, but nothing in the text should
pin the place to Korea — a reader should feel "somewhere administered,"
nowhere on a map.

## Writing rules

- Every conversation objective requests three generated suggestions with a
  felt safe/uncertain/risky gradient. Canon may keep fixed examples for tests,
  but production storylets store no choice or reply arrays.
- Every suspicion signal needs a why-line (이유 문장) a player can read.
- Role voice separation is strict: NPC speech, player choices, and system/HUD
  text use distinct registers and must never be attributed across roles.
- Scene facts, goals, ending thresholds, and outcome presentation live in
  data. Fixed test dialogue lives only in scripted adapters; live
  player-facing dialogue and suspicion judgment come from the selected
  provider.

## Localization

- Author KO → translate EN. Parity is a release (M5) requirement, not a
  per-slice gate.
- The v1 localization smoke pattern carries over: a headless check that every
  player-facing key resolves in both locales.

## Provider-written text boundary

LLM proposals choose both wording and the next valid tool attempt while
respecting actor goals, visible context, and forbidden claims. Generated reply
intent labels shape variety but never assign suspicion. Provider text never
introduces facts absent from the NPC's memory or visible context.

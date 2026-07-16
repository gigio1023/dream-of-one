---
name: dream-content-authoring
description: Use when writing, editing, or reviewing dream-of-one player-facing content — Korean NPC dialogue and tone, storylets, scenario canon, suspicion why-lines, HUD strings, or six-locale localization. Triggers include "storylet", "대사", "말투", "why-line", "이유 문장", "Korean voice", and "localization keys". NOT for engineering docs, code comments, runtime logic (dream-npc-runtime), or client presentation (dream-godot-client).
---

# Dream of One — Content Authoring

Write player-facing content — Korean dialogue and tone, storylets, scenario
canon, HUD strings — inside the repo's canon and voice contract. Paths
below are from the repository root; the cited docs stay the source of
truth.

## Canon First

Reuse before writing. Active canon lives in `docs/scenario/` — the file map
is `docs/scenario/content/README.md`. New canon must follow
`docs/game/content-guide.md` and use `docs/game/glossary.md` terms exactly:
do not coin synonyms for Station, record, civic ledger, suspicion signal,
route, or storylet.

## Tone and Setting

- Mundane-administrative with a low hum of wrongness. NPCs are polite,
  procedural, never cartoonishly sinister; dread comes from how ordinary
  the questions are and how permanent records feel.
- Stateless district: no real-world countries, cities, brands, currencies,
  or holidays. Generic-administrative naming (스테이션, 구역/번호, 스튜디오);
  role titles over surnames. Korean is the authoring language, but nothing
  in the text may pin the place to Korea.
- Register follows `docs/scenario/content/korean-voice-notes.md`: 존댓말
  defaults, clipped clerk speech, the Station's flat officialese.
- Role voice separation is strict: NPC speech, player choices, and
  system/HUD text use distinct registers and are never cross-attributed.

## What Content May and May Not Contain

Production storylets carry scene facts, actor goals, ending thresholds, and
outcome presentation only. They never contain choice lists, NPC reply
sequences, classification rules, or ordered social consequences — live
wording and judgment come from the selected provider. Fixed dialogue lives
only in scripted test adapters. Provider failure is a visible simulation
interruption and must never select a production line-bank response.

Every suspicion movement needs a player-readable why-line (이유 문장) in the
run locale; Korean remains the authored source. Prompt-side content must never
introduce facts absent from the NPC's visible context.

Owner-set never-accept failures — content and prompts actively defend
against them: an NPC breaking the fiction (admitting it is an AI,
referencing the real world) and an NPC contradicting what it just said.

## Localization

Author Korean first, then localize through the same content path into English,
Italian, Simplified Chinese, French, and Japanese. The exact locale contract,
parity timing, and terminology rules live in `docs/game/content-guide.md` and
the active plan under `docs/plan/`. Player-facing strings live in content
files and translation keys, not code.

## Verification

Storylet data validates inside the backend check; localization keys have a
headless smoke:

```bash
bun run --cwd backend/npc-runtime check
$GODOT_BIN --headless --path godot --script res://tools/localization_smoke.gd
```

## Read Before Writing

| Doc | When |
|---|---|
| `docs/game/content-guide.md` | every content slice |
| `docs/scenario/content/korean-voice-notes.md` | any Korean wording |
| `docs/game/glossary.md` | naming anything |
| `docs/game/core-loop.md` | answer surface, suggestion gradient, session shape |

## Gotchas

- Store-specific scenario pages are M1 regression/source material. Do not
  restore commerce, the Store layout, authored choices, or ordered reactions
  in M3R; adapt tone and procedural pressure to studio, office, park, and
  Station through `docs/game/content-guide.md`.
- A record can change factual memory and institutional pressure, but it cannot
  directly move a resident's personal stance. That requires remembered real
  speech; a vouch additionally requires meaningful first-hand player contact.
- Keep hidden speech hidden. Player-facing logs may name an encountered
  provenance chain without revealing words the player never heard or later
  learned in-world.

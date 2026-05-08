# Onboarding, Localization, And Accessibility

Status: superseded for AI setup/onboarding details as of 2026-05-06. The active release premise is API proposal-provider preflight, runtime model availability checks, and deterministic fallback, not a Codex CLI prerequisite.

## Purpose

The Codex CLI requirement is part of the product. The game must teach it honestly and handle failure as designed UX, not as a broken prototype.

## First-Run Flow

| Step | Player Sees | Pass Condition |
|---|---|---|
| Language | Korean default, English selectable. | Player can change language before setup text. |
| Codex disclosure | Local Codex CLI, player-owned account/access, internet, possible usage cost. | No gameplay starts before disclosure is acknowledged. |
| Preflight | `codex` found, auth/access, exec flags, read-only sandbox, structured output probe. | All required checks pass or show precise failure. |
| Control lesson | Move, arrow/mouse look, read, choose speech act. | Player performs each action once. |
| First rule | Station board teaches read-before-answer. | Player sees first objective and Exposure HUD. |

## Codex Preflight Errors

| Error | Required Copy Behavior |
|---|---|
| Missing binary | Name `codex`, show install/status help, allow retry/quit. |
| Auth failed | Tell player to run login/status outside the game. |
| Unsupported CLI behavior | Name the failed probe and expected capability. |
| Read-only sandbox failed | Explain that AI worker must not write to player files. |
| Structured output failed | Explain that NPC proposals need JSON output. |
| Timeout | Explain retry/fallback behavior without claiming AI worked. |

Do not use a generic "AI unavailable" message.

## Controls

The demo must be playable without a mouse.

| Function | Required Inputs |
|---|---|
| Move | WASD and arrow-key alternative if configured. |
| Look | Mouse and keyboard arrows. |
| Interact/read | Keyboard key shown in HUD. |
| Speech choice | Number keys and keyboard focus navigation. |
| Pause/menu | Escape/back. |
| Language/settings | Keyboard focus, no pointer-only controls. |

Prompts must display current bindings, not hard-coded text.

## Rule Teaching

Teach by doing, not with a static manual:

1. Show rule board.
2. Require interaction to read.
3. Ask one bounded answer.
4. Show why-line and Evidence.
5. Let the player inspect what changed.

The first Codex NPC pressure should happen only after this loop is clear.

## Localization Rules

| Rule | Requirement |
|---|---|
| Source language | Korean is canonical. |
| English role | English preserves function, pressure, and UI fit; it is not literal translation. |
| String keys | Every setup, menu, HUD, sign, bark, choice, why-line, Evidence, and end state needs keys. |
| Missing keys | Missing Korean or English critical strings fail release validation. |
| Layout | Korean and English must fit the same UI class without clipping. |
| AI lines | Codex produces Korean source line plus English intent field; runtime localizes display policy explicitly. |

Godot should use the engine localization pipeline rather than ad hoc per-node string swaps.

## Accessibility Minimum

| Area | Requirement |
|---|---|
| Text | Readable critical text at laptop and 1080p resolutions; text scale option. |
| Contrast | High-contrast option for HUD, signs, choices, and why-lines. |
| Color | Exposure changes cannot be color-only. |
| Captions | Critical audio cues have text equivalents. |
| Input | Keyboard-only full run; remappable core actions. |
| Camera | Sensitivity, invert X/Y, and arrow look. |
| Focus | Visible focus state in all setup/menu/speech UI. |
| Pause | Player can pause and inspect Evidence without time pressure. |

## Playtest Questions

Ask testers:

- What does the game require before it can use AI NPCs?
- What did the first Station rule teach?
- Why did Exposure change?
- Which line came from an NPC and which consequence came from the system?
- Could you finish without a mouse?
- Did any Korean or English text feel clipped, vague, or unsupported?

## Release Gate

Public release is blocked unless:

- 2-3 clean-machine testers can reach first AI interaction using player-facing help;
- one full run completes keyboard-only;
- Korean and English runs have no missing critical strings;
- setup failure states do not crash, softlock, or fake AI gameplay.

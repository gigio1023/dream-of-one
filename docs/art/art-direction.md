# Art Direction

## Direction in one line

A stateless administered district in warm 16×16 pixel art — cozy at first
glance, administrative on second glance — where surveillance reads through
composition and UI, not grimdark palette.

Setting note (decided 2026-07-10): the town is a **placeless administrative
zone** — no real-world country markers, generic-modern signage, institutional
naming (구역/스테이션 numbering). Korean remains the authoring language of all
content; the *place* stays unlocatable, which also keeps KO/EN localization
symmetrical and fits the dream-logic undertone.

## Camera and resolution

- Top-down, Stardew Valley-style camera (slight front-facing walls, no
  isometric diamond grid). Quarter-view/isometric was evaluated and rejected:
  higher art cost, scarcer packs, zero gameplay value for a conversation game.
- The world renders 1:1 into a logical view picked by window height —
  320×180 (720p), 480×270 (1080p and 4K), 512×288 (1440p) — then integer-scales
  to the output (4×/4×/5×/8×). A larger output means more visible world or
  finer pixels, never the same narrow view re-magnified. Pixel snap on.
- Rooms sit on a darker pavement apron (10 tiles) so wide views never expose
  void; the follow camera clamps to the apron bounds.
- Tile size **16×16**; characters 16×32 (LimeZu-compatible proportions),
  4-direction walk cycles.

## Look rules

- **Warm base, cold authority.** Interiors and streets use the pack's natural
  warm palette. Station elements (officer, citations, intake desk, inquest
  overlay) introduce the game's only systematic cold accent — desaturated
  blue-grey. Suspicion UI borrows this accent as pressure rises.
- **Readability beats density.** Record props (trays, slips, boards, dossier)
  must read as distinct silhouettes at play distance; if a prop needs a label
  to be identified, recompose before labeling.
- **Roles are visually separable** before any inspection panel: distinct
  sprite + one-color role accent per role (clerk, manager, waiting customer,
  studio PM, park witness, Station officer). This re-implements v1's proven
  role-tint finding in real sprites.
- **Surveillance is drawn, not narrated:** sightline/attention cues, speech
  and gossip bubbles, reaction markers with source tokens, influence lines
  from observer to reactor. All were HUD-proven in v1's 3D scene and are
  cheaper in 2D.

## UI

- Diegetic-leaning HUD: conversation panel (prompt, three choices, typed
  input), suspicion/pressure meter, record/ledger line, outcome panels.
- Pixel font pair: one KO-capable pixel font for body (e.g. Galmuri/NeoDunggeunmo
  family — verify license at adoption), one accent font for Station officialese.
- Follow the LimeZu Modern User Interface pack style where it fits; UI is the
  one place bespoke pixel work is acceptable early.

## Anti-goals

- No 3D, no normal-mapped "HD-2D" lighting, no mixed pixel densities on one
  screen.
- Free-first with greybox mixing is the M1–M3 norm (see
  [`asset-pipeline.md`](asset-pipeline.md)): greybox elements must follow the
  greybox rules (plain, labeled, on-grid) so they read as intentional. The M4
  art pass unifies the look; after M4, no greybox in player-facing builds.
- No horror styling — dread comes from procedure, not from darkness.

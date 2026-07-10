# Verification

Verification is deliberately thin. v1 drowned in proof; v2 runs one product
gate and a short list of smokes.

## The fun gate (product)

After any slice that changes played experience: run the game, play the
affected flow for at least five minutes, answer honestly in the PR
description — **"Would I play this again for five minutes?"** with one
sentence of why. That's it. External playtests are welcome input and never a
gate.

## Commands (engineering)

```bash
# Runtime (fast, always)
bun run --cwd backend/npc-runtime check

# Godot client (headless)
$GODOT_BIN --version # Expected: 4.7.x stable
$GODOT_BIN --headless --import --path godot
$GODOT_BIN --headless --path godot --script res://tools/scene_load_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/route_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/localization_smoke.gd
$GODOT_BIN --headless --path godot --script res://tools/check_assets.gd

# Localhost sidecar parity (starts and stops its own deterministic server)
GODOT_BIN="$GODOT_BIN" backend/npc-runtime/scripts/live-route-parity.sh
```

CI runs the Bun check on backend changes (existing workflow). Godot smokes
run locally per slice; add them to CI only if a real regression escapes
twice.

## Policy

- A slice ships with the narrowest check that would catch its regression —
  usually one existing smoke, occasionally one new fixture.
- Tests protect: deterministic authority, schema compatibility, the provider
  boundary (validation/fallback/budget), player-visible route outcomes. Tests
  do not protect: helper scripts, formatting, internal helper structure.
- No verification ledgers, evidence packs, proof audits, or standing status
  files. State lives in code, tests, and the PR that shipped it.
- Screenshots in PRs for visual changes: one before/after pair, taken from
  the running game. No contact-sheet apparatus.

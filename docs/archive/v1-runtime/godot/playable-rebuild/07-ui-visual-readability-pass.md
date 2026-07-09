# UI And Visual Readability Pass

Status: active implementation note  
Date: 2026-05-11  
Basis: Game Studio `GS-PRESENTATION-VALUE` and moment-to-moment rubric

## Goal

Make the current `Same Order` prologue read as a small conversation game, not a
debug harness.

The pass does not try to make final art. It improves the first playable proof so
the player can read the core chain:

```text
Verb -> Read -> Risk -> Response -> Learning -> Internal Evidence
Speak -> see the clerk premise -> choose a line -> see suspicion -> understand why -> see Station record
```

## Visual Thesis

A small civic space where ordinary speech is visibly recorded, socially noticed,
and routed into Station authority.

3D earns its cost only when the Store counter, Clerk, witness/report line, and
Station pull make the player feel observed. UI earns its cost only when NPC
speech and player choices are clearer than Evidence/debug state.

## Current Gaps

| Area | Gap | Risk |
|---|---|---|
| Conversation UI | Choices are present but compete with debug/state panels. | Player reads the harness, not the conversation. |
| Pressure display | Suspicion can exceed 100 while the HUD reads as a 100-point meter. | Deterministic authority looks inconsistent. |
| NPC reaction | Clerk response exists as text, but the NPC body does not visibly react. | Suspicion feels like UI math, not social pressure. |
| World staging | Store counter exists, but the conversation/report line is weak. | 3D space does not yet increase surveillance pressure enough. |
| Evidence feed | Raw event summaries can leak backend wording into player UI. | Korean-first readability and immersion break. |
| Proof gate | Visual capture proves nonblank state, not taste or comprehension. | Product/demo claims remain blocked. |

## Implementation Plan

1. Reframe HUD around the active conversation.
   - Bottom-center panel becomes the primary NPC prompt and choice surface.
   - Three choices are presented as large diegetic lines.
   - Key `4` is explicitly labeled as a recorded statement, not open chat.
   - Traversal mode collapses the panel so it does not cover the world.

2. Make Station pressure readable without bad math.
   - Clamp the player-facing pressure label to `100+` when internal suspicion
     exceeds the displayed meter.
   - Use `inquest open` language instead of implying final verdict when verdict
     authority has not fired.

3. Add NPC reaction state.
   - Store Clerk gets a visible attention disc and reaction label.
   - `normal`, `uneasy`, `probing`, `reported`, and `inquest` map to visual
     state without changing deterministic authority.

4. Add Store conversation staging cues.
   - Counter focus rail.
   - Three choice pads near the pressure zone.
   - Clerk sightline and faint report route hint toward Station.

5. Localize player-facing record summaries.
   - HUD uses short localized record labels when no `uiSummaryKey` exists.
   - Raw backend summaries remain Evidence data, not primary UI copy.

6. Refresh proof artifacts.
   - Godot syntax and scene smoke.
   - Playable smoke.
   - Renderer-backed visual capture and contact sheet.
   - Verification ledger update.

## Non-Goals

- Final art pass.
- Audio pass.
- Manual typed free-input UI.
- Live provider/backend proof.
- External player comprehension.
- Exported build setup.

## Product Claim After This Pass

Allowed:
- The local Godot proof has a more readable conversation-first HUD.
- Store conversation captures show NPC prompt, three choices, recorded statement
  label, why-line, and inquest outcome.
- NPC reaction and Store staging cues are visible in the current renderer
  capture.

Not allowed:
- Demo complete.
- Release ready.
- Player comprehension proven.
- Manual free input proven.
- Live API/model/provider proven.

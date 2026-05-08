# MVP Design: Ultra-Minimal Convenience Store

## Premise
Social stealth simulation. Player is a lucid dreamer who must blend in at a convenience store. NPCs observe actions and conversations — break the rules, get reported, get interrogated.

## Scope
- **1 landmark**: Convenience store + surrounding sidewalk
- **3 NPCs**: Store Clerk, Customer, Police Officer
- **2 rule zones**: Queue Zone (줄서기), Staff-Only Zone (직원 전용)
- **5-minute session**
- **New clean scene** (existing Prototype scene abandoned)

## Core Loop
```
Player walks around (WASD)
  → Enters rule zone without permission → Suspicion +auto
  → Approaches NPC, presses E → Text input dialog
    → LLM judges: did player violate dream laws? → Suspicion +/-
  → Suspicion crosses threshold → NPC reports to police
  → Police approaches player → Interrogation (LLM conversation)
  → Survive 5 min = Win / Exposure 100 = Lose
```

## Player
- WASD movement via CharacterController
- E key: interact with nearby NPC (opens text input)
- No inventory, no combat, no jumping needed for MVP

## NPCs (3 total)
- **Store Clerk**: Patrols behind counter area. Observes queue zone. Will challenge player who enters staff zone.
- **Customer**: Walks between store entrance and queue zone. Passive witness. Reports if suspicion high.
- **Police Officer**: Patrols outside. Receives reports. Moves to player for interrogation.

### NPC Behavior
- Simple NavMesh patrol between 2-3 waypoints
- Observation: detect player entering rule zones within line-of-sight range
- Conversation: LLM-driven (pluggable backend)
- Suspicion: individual per-NPC, decays over time
- Report: when suspicion > threshold, send report to Police

## Suspicion System (Simplified)
- **Action-based**: Enter staff-only zone (+30), cut queue (+15), run inside store (+10)
- **Conversation-based**: LLM returns suspicion delta (-10 to +30) per exchange
- **Decay**: -2/sec when not violating
- **Report threshold**: 50 (NPC reports to police)
- **Interrogation threshold**: 1+ reports received by police
- **Lose threshold**: Global suspicion (G) >= 100

## LLM Integration
- **Interface**: `ILLMBackend.SendAsync(prompt, context) → string`
- **Implementations** (pluggable):
  - `OllamaBackend` — local, for development (Llama 3.2 3B)
  - `ColabBackend` — remote Colab GPU serving (future)
  - `CodexExecBackend` — Codex CLI proxy (future)
- **NPC prompt template**: role description + dream laws + recent events + player message → response + suspicion_delta
- **Fallback**: if LLM fails, NPC gives generic suspicious response + small suspicion increase

## Scene Layout (Top-down)
```
        [Sidewalk - Police patrol]
   ┌─────────────────────────────┐
   │     Convenience Store       │
   │  ┌───────┐  ┌───────────┐  │
   │  │Staff  │  │ Queue Zone │  │
   │  │Only   │  │ (Customer) │  │
   │  │(Clerk)│  │            │  │
   │  └───────┘  └───────────┘  │
   │         [Counter]           │
   │      [Entrance]             │
   └─────────────────────────────┘
        [Sidewalk - Player spawn]
```

## UI (Minimal)
- **Suspicion bar**: top of screen, 0-100
- **Conversation window**: bottom, text input + NPC response
- **Toast**: brief notifications ("NPC가 당신을 의심합니다", "신고 접수됨")
- **Timer**: remaining session time
- **Result screen**: Win/Lose at session end

## What's Reused from Existing Code
- `PlayerController.cs` — WASD movement (simplify: remove jump)
- `SuspicionComponent.cs` — per-NPC suspicion + decay + report logic
- `ReportManager.cs` — report queue + interrogation trigger
- `PoliceController.cs` — state machine (Patrol → MoveToPlayer → Interrogate)
- `UIManager.cs` — HUD display (strip to essentials)
- `GlobalSuspicionSystem.cs` — aggregate G calculation

## What's Deleted / Ignored
- `RuntimeBootstrap.cs` — not needed, scene built via MCP
- `NpcPopulationBootstrap.cs` — not needed, NPCs placed in scene
- `NpcRoleRoutine.cs` — replaced by simple 2-3 waypoint patrol
- All World_v2, CITY_Package, DreamOfOne/World legacy objects
- Interior/Portal system
- CCTV system
- LucidCover visual effects
- Complex speech act system (SA_COMPLY etc) — LLM handles naturally
- Witness statements / report memos / artifacts

## What's New
- `ILLMBackend.cs` — pluggable LLM interface
- `OllamaBackend.cs` — Ollama HTTP client
- `NPCConversation.cs` — manages text input/output with NPC
- `SessionTimer.cs` — 5-min countdown + win/lose
- `InteractionTrigger.cs` — E key proximity interaction
- New minimal scene: `MVP_Store.unity`

## Success Criteria
1. Player can walk around the store area
2. Entering staff-only zone triggers visible suspicion increase
3. Player can talk to Store Clerk via text, LLM responds in-character
4. Saying something suspicious increases suspicion visibly
5. High suspicion → Clerk reports → Police approaches → Interrogation
6. Surviving 5 minutes = win screen
7. Suspicion 100 = lose screen

# Dream of One — MVP Improvement Design

**Date:** 2026-04-02
**Goal:** Playtest demo + concept validation for social-stealth + LLM dialogue mechanics
**Approach:** "Full Atmosphere" — all layers at shallow depth, maximum free resources

---

## Core Concept

The player enters a small society (convenience store setting) and must blend in by participating in social activities. NPCs form organic social groups with ongoing relationships and shared context. **Dialogue is the simulation engine** — the impression of a living society comes from what NPCs say, not from complex mechanical systems.

### Design Principles
- **Dialogue-as-Simulation**: LLM prompts create social texture, not code
- **Mechanical simplicity**: Cover work is E-key toggle, not minigames
- **Diegetic feedback**: No suspicion meters — environmental cues only
- **Drama Manager pacing**: Sessions have 3-act structure with escalating tension

---

## Layer 1: Audio Atmosphere

### Ambient (always playing)
- Refrigerator hum, AC/ventilation low-frequency drone
- Street noise outside (distant cars, wind)

### SFX (event-triggered)
- Door open/close on NPC entry/exit
- Footsteps (player + NPC)
- Item pickup/putdown
- Scanner beep

### Tension Audio (suspicion-reactive)
- BGM layers crossfade based on suspicion float parameter
- Crowd murmur quiets as suspicion rises (Dead Space pattern)
- Heartbeat fades in at medium suspicion
- Sharp sting + silence at critical level

### BGM
- Peaceful: lo-fi / liminal ambient track
- Tense: same track + dissonant layer mix

### Implementation
- **FMOD Studio** (free indie license) with suspicion float parameter
- `IAudioService` interface — `SetSuspicionLevel(float)`, `PlaySFX(clip, pos)`, `PlayAmbientDialogue(clip)`
- `FloatVariable` (ScriptableObject) for suspicion value, shared across all systems
- 3D spatialization with min/max attenuation for NPC dialogue audio

### Free Resources
| Use | Source | License |
|-----|--------|---------|
| Ambient/SFX | Freesound.org (InspectorJ) | CC-BY 4.0 |
| Bulk SFX | Sonniss GDC Bundle | Royalty-free |
| BGM peaceful | FreePD "Eerie" / "Ambient" | CC0 |
| BGM tense | Incompetech "Comfortable Mystery" | CC-BY 4.0 |
| Audio system | FMOD Studio | Free (indie) |

---

## Layer 2: NPC Society Simulation

### Drama Manager (new system)
A scene-pacing controller above the LLM. Prevents aimless conversation, controls tension arc.

**3-Act Structure:**
- **Act 1 (0-3 min)**: Peace. NPC-NPC casual conversation. Light greetings to player.
- **Act 2 (3-8 min)**: Rising tension. NPCs mention suspicious observations. Questions to player intensify.
- **Act 3 (8-12 min)**: Resolution. Low suspicion → safe passage. High suspicion → confrontation → game over.

**Implementation:**
- `DramaManager` MonoBehaviour tracks session time and current act
- Injects tone directives into LLM prompts: `"[TONE: casual, friendly]"` → `"[TONE: suspicious, probing]"`
- Triggers "Among Us-style meeting" events where NPCs gather and discuss the player (Act 2-3)

### NPC Preoccupations (personality through prompts)
Each NPC has 1-2 obsession topics defined as ScriptableObject data, injected into LLM prompts:

- **Coworker**: "night shifts are exhausting", "boss watches CCTV"
- **Regular customer**: "neighborhood redevelopment rumors", "that weird person from yesterday"
- **Delivery person**: "how many deliveries left today", "that shop owner is rude"

These topics surface naturally in NPC-NPC dialogue and player interactions, creating individuality without complex AI.

### NPC-NPC Ambient Dialogue
- **Pre-generation**: When player is far, LLM generates short conversations (4-6 lines), cached
- **Playback**: When player approaches, cached dialogue plays via speech bubbles
- **Real-time generation**: Only for player-NPC direct interaction
- **Performance**: Eliminates latency for ambient social chatter

### NPC Behavior FSM (simple)
States: `Idle` → `Patrol` → `Talk` → `Work`
- NavMeshAgent-based movement (package already installed)
- State transitions via SO Event Channels
- Only call `SetDestination` on waypoint change (not every frame)
- 2-3 NPCs per scene — FSM is sufficient, no behavior trees needed

### Animation
- **Mixamo** (free): 15-20 clips — idle(3), walk, talk gesture(3), reach, wipe
- **Basic Motions FREE** (Kevin Iglesias, Asset Store): supplementary locomotion
- **Animancer Lite** (free): code-driven animation, no Animator Controller graphs

---

## Layer 3: Player Cover Work

### Principle
Mechanically trivial. The real cover work is **dialogue performance**.

### Implementation
- `WorkStation` component: position marker + E-key state toggle
- Player at work station → "working" animation plays
- That's it. No progress bars, no minigames.

### Suspicion Integration
| Situation | Suspicion Effect |
|-----------|-----------------|
| At work station | Passive decay bonus |
| Wandering without purpose | Passive increase |
| Coworker asks "how's work going?" + good answer | LLM-judged decrease |
| Coworker asks + bad answer | LLM-judged increase |

### Rhythm Matching (SpyParty pattern)
- Coworker NPC checks on player every ~3 min (Drama Manager paced)
- Player should be at work station during these checks
- Creates tension: "I need to be at my station when they come by"

---

## Layer 4: Suspicion Feedback (Diegetic)

**No explicit meters or numbers.** All feedback through environment.

| Suspicion Level | Audio | Visual | NPC Behavior |
|-----------------|-------|--------|-------------|
| **Low** (noticed) | Subtle dissonance added | Slight color temp cooling | One NPC glances at player |
| **Medium** (watched) | Heartbeat fade-in, crowd quiets | Vignette starts, speech bubbles show "..." | NPCs whisper, stop talking when player approaches |
| **High** (suspected) | Strong heartbeat, tension peak | Heavy vignette, desaturation | NPCs confront directly, one "goes to get someone" |
| **Critical** (blown) | Sharp sting → silence → alarm | Screen flash, tunnel vision | NPCs scatter or block exits |

### Implementation
- URP Volume Profile: Vignette, Color Adjustments, Chromatic Aberration
- `SuspicionPresenter` subscribes to `FloatVariable` → interpolates all effects
- `CinemachineImpulseSource` for camera shake at high suspicion
- All thresholds tunable via ScriptableObject

---

## Layer 5: Visual Polish

| Element | Source | License |
|---------|--------|---------|
| Store props (shelves, drinks, snacks) | Kenney Furniture Kit + Food Kit | CC0 |
| Additional props | Quaternius Ultimate Food Pack | CC0 |
| NPC visual variety | ithappy Creative Characters (already owned) | Asset Store |
| UI icons | game-icons.net + Kenney UI Pack | CC-BY / CC0 |
| Speech bubbles | TextMeshPro + 9-slice sprite (custom) | Built-in |

---

## Layer 6: Session Flow

```
[Start text: "Have a normal day."]
     ↓
  Act 1: Peace (0-3 min)
  - NPC-NPC casual dialogue
  - Light greetings to player
  - Player learns cover work rhythm
     ↓
  Act 2: Tension (3-8 min)
  - NPCs gather and whisper (Among Us meeting pattern)
  - Questions to player intensify
  - Drama Manager injects suspicion tone into LLM
     ↓
  Act 3: Resolution (8-12 min)
  - Low suspicion → "Good work today, see you tomorrow" → Clear
  - High suspicion → Confrontation → Caught → Game Over
     ↓
[Result screen: "Survived the day" / "Identity exposed"]
```

---

## Architecture

```
Core/
  ├── FloatVariable.cs          (suspicion level, shared SO)
  ├── DialogueEventChannel.cs   (SO event for dialogue start/end)
  ├── SuspicionEventChannel.cs  (SO event for suspicion changes)
  ├── DramaManager.cs           (3-act pacing + LLM tone injection)

NPC/
  ├── NPCStateMachine.cs        (FSM: Idle/Patrol/Talk/Work)
  ├── NPCPreoccupation.cs       (SO: obsession topic data)
  ├── DialogueScheduler.cs      (NPC-NPC dialogue schedule + cache)
  ├── NavMeshAgent setup        (existing package)

Audio/
  ├── AudioService.cs           (IAudioService + FMOD integration)
  ├── SuspicionAudioController  (FMOD parameter binding)

UI/
  ├── SpeechBubbleUI.cs         (world-space Canvas + TMP)
  ├── SuspicionFeedback.cs      (Vignette/ChromAb/ColorTemp interpolation)

Player/
  ├── WorkStation.cs            (E-key toggle, position marker)
  ├── CoverWorkTracker.cs       (suspicion bonus/penalty)
```

---

## LLM Prompt Architecture

### Three-Tier NPC Memory (Stanford Generative Agents adapted)
1. **Core prompt** (~500 tokens, always present): NPC name, personality, preoccupations, relationship to player, current scene
2. **Recent buffer** (~1000 tokens, sliding window): Last 5-10 dialogue exchanges verbatim
3. **Long-term** (future): Vector-indexed archive for retrieval (post-MVP)

### Prompt Template Structure
```
[SYSTEM] You are {npc_name}, a {role} at a convenience store.
[PERSONALITY] {personality_description}
[PREOCCUPATIONS] {obsession_topics}
[DREAM_LAWS] {rules_that_trigger_suspicion}
[DRAMA_TONE] {current_act_tone_directive}
[RECENT_CONTEXT] {last_5_exchanges}
[INSTRUCTION] Respond in character. Return JSON: {reply, suspicion_delta, reasoning}
```

### Hallucination Guard
- Constrain output to JSON schema (reply + suspicion_delta + reasoning)
- Personality cards ground NPC behavior
- Dream Laws provide explicit boundaries for what triggers suspicion
- Fallback response if LLM fails: hardcoded Korean "...흠, 수상하군." (+5 suspicion)

---

## Free Resource Summary

| Category | Primary Source | License |
|----------|---------------|---------|
| SFX/Ambience | Freesound.org + Sonniss GDC | CC-BY / Royalty-free |
| Music | FreePD + Incompetech | CC0 / CC-BY 4.0 |
| Audio System | FMOD Studio | Free (indie) |
| NPC Animations | Mixamo + Basic Motions FREE | Free |
| Animation System | Animancer Lite | Free (Asset Store) |
| 3D Props | Kenney + Quaternius | CC0 |
| UI Assets | Kenney UI + game-icons.net | CC0 / CC-BY 3.0 |
| Speech Bubbles | TextMeshPro (built-in) | Free (Unity) |

---

## Out of Scope (MVP)
- Voice synthesis / TTS for NPC dialogue
- Economy / buying-selling system
- Multiple scenes / locations (store only)
- Save/load system
- Settings menu / pause
- Long-term NPC memory (RAG/vector store)
- Combat / physical stealth

# Manual Tasks — MVP Improvement (Task 12)

Code implementation is complete. These tasks require Unity Editor or manual download.

---

## 1. Audio Asset Import

### Download from Freesound.org (CC-BY / CC0)
1. Search "refrigerator hum loop" → save as `Assets/Audio/Ambient/fridge_hum.ogg`
2. Search "store door chime" → save as `Assets/Audio/SFX/door_chime.ogg`
3. Search "footsteps indoor tile" → save as `Assets/Audio/SFX/footsteps_tile.ogg`
4. Search "barcode scanner beep" → save as `Assets/Audio/SFX/scanner_beep.ogg`

### Download from FreePD.com (CC0)
5. Browse "Eerie" section → save as `Assets/Audio/BGM/peaceful.ogg`
6. Browse "Ambient" section → save as `Assets/Audio/BGM/tense.ogg`

### Import Settings in Unity
- Ambient/BGM: Load In Background, Streaming, Vorbis (Quality 70%)
- SFX: Decompress On Load, PCM

---

## 2. 3D Prop Import

### Kenney (CC0) — kenney.nl/assets
1. Download "Furniture Kit" → import shelves, counter, table → `Assets/Models/Kenney/`
2. Download "Food Kit" → import bottles, cans, boxes → `Assets/Models/Kenney/`

### Quaternius (CC0) — quaternius.com
3. Download "Ultimate Food Pack" → additional props → `Assets/Models/Quaternius/`

### After Import
- Assign URP Lit shader to all materials
- Adjust colors to match POLYGON City Pack aesthetic

---

## 3. NPC Animation Import

### Mixamo (Free) — mixamo.com
Download as FBX "Without Skin":
1. `Idle_Breathing.fbx`
2. `Idle_LookAround.fbx`
3. `Walking.fbx`
4. `Talking_Gesture_01.fbx`
5. `Talking_Gesture_02.fbx`
6. `Reaching.fbx`

Save to `Assets/Animations/Mixamo/`

### Import Settings
- Rig → Animation Type: Humanoid
- Configure Avatar for retargeting to ithappy characters

---

## 4. Scene Assembly (Unity Editor)

### AudioMixer Setup
1. Create → AudioMixer: `Assets/Audio/MVPMixer.mixer`
2. Groups: Master → BGM, SFX, Ambient
3. On BGM group, expose parameter `BGMTensionBlend`

### MVPAudioService Setup
1. Create empty GameObject "AudioService"
2. Add `MVPAudioService` component
3. Add 4 child AudioSources: bgmPeaceful, bgmTense, ambientLoop, sfxOneShot
4. Wire AudioMixer and AudioClips in inspector

### NPC Setup (for each NPC)
1. Add `NavMeshAgent` component
2. Add `NPCBehavior` component → assign waypoints
3. Add `SpeechBubbleUI` component
4. Add/keep `NPCInteraction` component → assign `NPCPreoccupation` SO asset
5. Add/keep `SuspicionComponent`

### NavMesh
1. Add `NavMeshSurface` to floor/ground object
2. Mark walkable geometry as Navigation Static
3. Bake NavMesh

### WorkStations
1. Create 2-3 empty GameObjects at work positions (behind counter, near shelves)
2. Add `WorkStation` component to each

### Suspicion Volume
1. Create GameObject "SuspicionVolume"
2. Add `Volume` component (Global mode)
3. Add `SuspicionFeedback` component
4. Wire `SuspicionLevel` FloatVariable SO (create as `Assets/Resources/MVP/SuspicionLevel.asset`)

### Result Screen
1. Create UI Canvas with Panel, Title TMP, Body TMP
2. Add `ResultScreenUI` component
3. Wire references in inspector
4. Wire to SessionManager's `resultScreen` field

### ScriptableObject Assets to Create
- `Assets/Resources/MVP/SuspicionLevel.asset` (FloatVariable)
- `Assets/Resources/MVP/DialogueEvent.asset` (GameEventChannel)
- `Assets/Resources/MVP/Preoccupation_Coworker.asset` (NPCPreoccupation)
- `Assets/Resources/MVP/Preoccupation_Regular.asset` (NPCPreoccupation)
- `Assets/Resources/MVP/Preoccupation_Delivery.asset` (NPCPreoccupation)

---

## 5. Attribution

Create `ATTRIBUTION.md` in project root after importing assets. Template in design spec.

---

## Verification Checklist

- [ ] No compile errors in Unity Console
- [ ] EditMode tests pass (Test Runner)
- [ ] Play mode: ambient audio plays
- [ ] Play mode: NPC walks patrol route
- [ ] Play mode: speech bubbles appear over NPCs
- [ ] Play mode: E key near WorkStation toggles work state
- [ ] Play mode: approach NPC → E → conversation with LLM
- [ ] Play mode: suspicion rises → vignette/color shift visible
- [ ] Play mode: session reaches Act 3 → result screen appears

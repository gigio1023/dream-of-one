# Dream of One — Master Plan (Project.md Driven)

This document consolidates the implementation plan, completion criteria, and progress based on **project.md**.
No questions. Keep moving until completion criteria are met.

---

## 0) Goals / Non‑Goals

### Goals (Release‑Ready)
- Log‑based social simulation works as designed
- Deterministic core: violation/suspicion/report/verdict are rule‑driven
- LLM only renders 1‑line surface text (with fallback)
- Zero console errors through end of play

### Non‑Goals (Explicit)
- [x] No save/load
- [x] No WEL replay for state restore
- [x] LLM must not decide verdicts or state transitions

Completion Criteria (Required)
- Scene/lighting/UI render correctly on Play
- CITY package world visualization complete (landmarks obvious, zones readable)
- **WEL → Blackboard → Injection → Gossip/Report → Police Verdict** loop occurs at least once
- Organization procedure events are logged and NPCs act on them
- Korean text renders without corruption

## 0‑1) Game Identity (Core Pillars)
- [x] Log‑First World: understand world via logs, not state
- [x] Organizations move society: goal conflicts create events
- [x] Deterministic core: violations/suspicion/reports/verdicts are rules
- [x] Text‑first results: 1–2 lines + artifacts

---

## 1) World / Organization Definition

### 1‑1. Space Spec
- [x] Expand to ~110m × 110m city block
- [x] Key places: Studio (2F), Convenience Store, Park, Police Station
- [x] Place 2 CCTV points
- [x] Fixed player scale + building scale 1.25

### 1‑2. Organization Definition (Goal/Procedure/Resource/Artifact)
#### Studio
- [x] Goal: RC submission / release stabilization
- [x] Procedure: Kanban update → Patch note → Approval → RC insert
- [x] Resource: Kanban board, lounge, server slots
- [x] Artifact: Kanban logs, patch note, approval note, RC strip

#### Police
- [x] Goal: handle minor offenses, prevent recurrence
- [x] Procedure: report intake → on‑site check → evidence collection → interrogation → verdict
- [x] Resource: ticket issue, printer, capture board
- [x] Artifact: violation ticket, CCTV capture, event log strip

#### Convenience Store
- [x] Goal: zero stockouts, label updates, transaction order
- [x] Procedure: label check → shelf/stock update → counter rules
- [x] Resource: label system, counter
- [x] Artifact: price/stockout label, transaction memo

#### Park Management
- [x] Goal: seat/noise/photo norms, minimize complaints
- [x] Procedure: on‑site warning → action → report
- [x] Resource: bulletin board, enforcement authority
- [x] Artifact: action report, bulletin notice, complaint memo

#### Cafe / Rest Area
- [x] Goal: order orderliness / seat turnover / noise control
- [x] Procedure: order → wait → seat guidance → clean up
- [x] Resource: order desk, ticketing, seating chart
- [x] Artifact: order memo, seating/cleanup logs

#### Delivery / Logistics
- [x] Goal: on‑time delivery, access compliance
- [x] Procedure: pickup → access check → signature → exit
- [x] Resource: delivery cart, access checklist
- [x] Artifact: delivery label, signature log

#### Facilities (Building Ops)
- [x] Goal: safety, minimize outages
- [x] Procedure: periodic check → repair request → work approval → completion report
- [x] Resource: inspection checklist, work permit
- [x] Artifact: inspection log, repair ticket

#### Media / Photo Crew
- [x] Goal: permit compliance, safe shoot zones
- [x] Procedure: pre‑approval → zone marking → shoot → return
- [x] Resource: gear, permits
- [x] Artifact: permit, shoot log

### 1‑3. CITY Package World Application (User Assets)
- [x] Maintain 1 unit = 1m (prefab scale 1.0)
- [x] Expand map by extending road/sidewalk grid
- [x] Increase building prefab scale for city feel
- [x] Visibility rules: minimize occlusion of interactables/characters
- [x] CITY package import validated (prefabs/materials/textures)
- [x] Scale/collider/material compatibility check (URP/Standard)
- [x] Landmark replacement: studio/store/park/police/CCTV silhouettes
- [x] Roads/sidewalks/crosswalks/lamps/benches for path & zone readability
- [x] Trees/props to reinforce area identity
- [x] Directional light/ambient tuned for visibility
- [x] URP material auto‑fix (avoid purple/gray)
- [x] NavMesh rebake + obstacle/collision validation
- [x] Lighting bake / reflection probes
- [x] Performance pass: Static/LOD/Occlusion/Batching
- [x] Run CITY auto‑placement script (`Tools/DreamOfOne/Build City (POLYGON)`)
- [x] Enable CITY auto‑runner on editor load
- [x] CITY root/anchors validated: `CITY_Package`, `CITY_Anchors` → `StoreBuilding/ParkArea/StudioBuilding_L1/Station/Cafe/DeliveryBay/Facility/MediaZone`

---

## 2) Core Systems

### 2‑1. WEL (World Event Log)
- [x] Structured event recording
- [x] Canonical text generation (template)
- [x] Required fields: t/actor/event/place/topic/rule/object/note/position
- [x] Append‑only behavior
- [x] Cooldown to suppress duplicates
- [x] Event taxonomy: movement/zone, order/transaction, norms/violation, gossip, procedure, evidence, org tasks

### 2‑2. Semantic Shaper
- [x] Event → 1‑line template
- [x] Extend categories: norm/procedure/evidence/verdict
- [x] Enforce 80‑char limit

### 2‑3. Spatial Blackboard
- [x] Recent log buffer per Zone/Object
- [x] Fields: timestamp, topic, actor, severity, text, trust, source
- [x] TTL layering (evidence/procedure longer)
- [x] Position‑based access API

### 2‑4. Distance‑Based Log Injection
- [x] Near D1=1.2m / K1=2
- [x] FOV D2=8m / K2=3
- [x] Noise D3=6m / K3=1 (high severity)
- [x] Priority: procedure/evidence > norms > gossip > general
- [x] Latest events for same actor prioritized (cooldown)
- [x] Same topic cooldown tuning
- [x] Personal memory TTL

### 2‑5. Gossip Network
- [x] Draft (shared) event generation
- [x] Confirm/Debunk transition rules
- [x] Trust w / source / time / place tags
- [x] Only proximity conversation allowed (distance check)

### 2‑6. Police Procedure
- [x] Case Bundle assembly
- [x] Bundle elements: violation/report/evidence/procedure/gossip/defense/rebuttal/statement
- [x] On‑site check → evidence log → interrogation → verdict
- [x] Verdict set: cleared / hold / suspicion increase / expulsion
- [x] One‑line verdict reason based on logs/evidence

### 2‑7. LLM Surface Layer
- [x] Chat Completions / Local / Mock providers
- [x] 1‑line dialogue
- [x] Variation based on canonical text
- [x] Fallback to template on failure

---

## 3) Player / Cover System

### 3‑1. Cover Profile
- [x] Organization affiliation
- [x] Role
- [x] Allowed places
- [x] Allowed topics / taboo topics
- [x] Default vocabulary

### 3‑2. Outsiderness Tracking
- [x] Outsiderness increases on violations or mismatches
- [x] Outsiderness decays over time
- [x] Outsider probability derived from outsiderness + global G

### 3‑3. Cover Status UI
- [x] Cover status line output
- [x] Update on event

---

## 4) Interaction / Zones

### 4‑1. Zones
- [x] Queue / Seat / Photo zones
- [x] Enter/exit events logged
- [x] Zone ID / Zone type stored

### 4‑2. Interactables
- [x] E interaction produces violation logs
- [x] Prompt display
- [x] Cooldown to prevent spam

---

## 5) NPC Systems

### 5‑1. SuspicionComponent
- [x] Per‑NPC suspicion sᵢ
- [x] Decay over time
- [x] Report threshold + cooldown
- [x] Report to ReportManager

### 5‑2. ReportManager
- [x] Report window TTL
- [x] Evidence attachment
- [x] Global G threshold gates interrogation
- [x] Social pressure reduces required reports

### 5‑3. PoliceController
- [x] Patrol → Investigate → Move → Interrogate → Cooldown loop
- [x] Interrogation text (LLM or deterministic)
- [x] Verdict based on case bundle score

### 5‑4. NPC Dialogue (LLM surface)
- [x] Single‑line commentary on reports/suspicion
- [x] Cooldown and suppression when dialogue system present

---

## 6) UI / HUD

### 6‑1. HUD Elements
- [x] Global suspicion bar + label
- [x] Event log text
- [x] Toast line
- [x] Interrogation line
- [x] Prompt line

### 6‑2. UI Layout
- [x] UILayouter applies positions and fonts at runtime

---

## 7) Diagnostics / Validation

### 7‑1. Runtime Diagnostics
- [x] RuntimeDiagnostics scene checks
- [x] LoopVerifier asserts one complete loop
- [x] Editor menu: `Tools/DreamOfOne/Run Diagnostics`

### 7‑2. Tests
- [x] EditMode tests for core systems

---

## 8) Release Checklist
- [ ] No console errors
- [ ] Prototype scene plays end‑to‑end
- [ ] 1+ loop observed without manual forcing
- [ ] Korean text renders correctly
- [ ] City package materials render correctly in URP

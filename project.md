# Dream of One — Game Definition & Design (Log‑First Social Organization Simulation, Revised)
Event‑centric, log accumulation world model, distance‑based log injection, deterministic core + LLM surface layer

---

## 0. Purpose and Scope

### 0.1 Purpose
This document defines **Dream of One** as an organization‑driven simulation of society. It specifies what the game is, what the player does, and how the world operates from a **log‑first (world‑understanding‑by‑logs)** perspective.

### 0.2 Core Assumptions (Revision Focus)
- This project **does not** attempt to build a VLM/world‑model‑level “world understanding AI.”
- Instead, factual changes in the world are continuously written to a **text‑based World Event Log (WEL)**.
- NPCs receive **nearby, recent logs** based on location/distance/visibility and decide their next actions.
- Therefore, the core of the game is **logs that accumulate, inject, and interpret well**.

### 0.3 Non‑Goals (Explicit)
- No snapshot save/load.
- No WEL replay to restore state.
- LLM must not decide verdicts or state transitions (deterministic core only).

---

## 1. One‑Line Definition
In a small multi‑organization society (a city block), the player must survive **without revealing their outsiderness**. The society records all events as **text logs**, NPCs spread gossip or file reports based on **nearby logs**, and police issue **procedural verdicts** using accumulated records and evidence (artifacts).

---

## 2. Game Identity (Core Pillars)

1) **Log‑First World**
- The game does not fully model “current state.”
- It records “what happened” in logs.
- NPCs infer context from nearby logs.

2) **Organizations Move Society**
- NPCs follow **organization goals**, not random behavior.
- Goal conflicts create events that become logs.

3) **Deterministic Core**
- Violation/detection/suspicion/report/verdict/update are rule‑based.
- LLM outputs only 1‑line surface text.

4) **Text‑First Outcomes**
- Outcomes are shown as **1–2 lines of text + artifacts**.

---

## 3. World (Society) Composition

### 3.1 Spatial Scale
- ~110m × 110m city block
- Places act as “activity nodes”; events are anchored to places.

### 3.2 Key Places (Nodes)
- **Indie Studio (2F)**: dev/review/approval/release flow
- **Convenience Store**: queueing, transactions, label norms
- **Park**: seating/noise/photo norms
- **Police Outpost**: report/interrogate/evidence/verdict procedure
- **CCTV Points (2)**: “record → evidence” conversion

### 3.3 Social Organizations (Definition)
Each organization has:
- **Goal**
- **Procedure**
- **Resources**
- **Artifacts**

Examples:

#### A) Studio
- Goal: RC submission (review → approval → insertion)
- Procedure: Kanban update → patch note → PM approval → RC insert
- Resources: Kanban board, lounge, server slots
- Artifacts: Kanban logs, patch notes, approval notes, event log strips

#### B) Police
- Goal: handle minor offenses, prevent recurrence, secure evidence
- Procedure: report intake → on‑site check → evidence collection → interrogation → verdict
- Resources: ticket issuance, printer, capture board
- Artifacts: violation ticket, CCTV capture, event log strips

#### C) Store / Merchant Association
- Goal: zero stockouts, label updates, orderly transactions
- Procedure: label check → shelf/stock update → counter rules
- Resources: label system, counter
- Artifacts: price/stockout labels, transaction notes

#### D) Park Management
- Goal: seat/noise/photo norms, minimize complaints
- Procedure: on‑site warning → action → report writing
- Resources: bulletin board, enforcement authority
- Artifacts: action report, bulletin notice, complaint memo

#### E) Cafe / Rest Area
- Goal: order orderliness / seat turnover / noise control
- Procedure: order → wait → seat guidance → cleanup
- Resources: order desk, ticketing, seating chart
- Artifacts: order notes, seating/cleanup logs

#### F) Delivery / Logistics
- Goal: on‑time delivery, access compliance
- Procedure: pickup → access check → signature → exit
- Resources: delivery cart, access checklist
- Artifacts: delivery labels, signature logs

#### G) Facilities (Building Ops)
- Goal: safety, minimize failures
- Procedure: routine check → repair request → approval → completion report
- Resources: inspection checklist, work permit
- Artifacts: inspection logs, repair tickets

#### H) Media / Photo Crew
- Goal: permit compliance, safe shoot zones
- Procedure: pre‑approval → zone marking → shoot → return
- Resources: camera gear, permits
- Artifacts: permits, shoot logs

### 3.4 Art / Environment Assets (CITY Package)
With the larger city block, visual clarity must remain high while using **CITY package** assets.

- Target: replace primitives with CITY prefabs to sell the city block.
- Assets: `Assets/POLYGON city pack` (CITY Package 1.0)
- Scale: 1 unit = 1m; player scale fixed; building prefabs scaled to ~1.25.
- Map expansion: extend road/sidewalk grid and re‑place buildings.
- Landmark clarity: studio/store/park/police/CCTV obvious via silhouettes/signage.
- Path readability: roads/sidewalks/crosswalks/lamps/benches/trees.
- Visibility first: do not hide NPCs/interactables.
- Collision & NavMesh: apply colliders and obstacles appropriately.
- Performance: static flags, LOD, baked lighting/probes.

### 3.5 Controls / Camera Principles
- Camera uses a **fixed offset**, rotates **only via mouse**.
- Movement is camera‑relative on the ground plane.
- Minimize auto‑rotation or snap to avoid forced camera changes.

---

## 4. Player: Survive via Cover

### 4.1 What Cover Means
Cover is a consistent identity that makes the player appear as an insider. It includes **role expectations, vocabulary, and procedural fluency**, not just a job title.

### 4.2 Cover Components
- Affiliation (organization or contractor)
- Role (intern, temp, delivery, cleaning, etc.)
- Base tasks (1–2 everyday tasks)
- Taboos (actions/phrases that look wrong)
- Default tone/vocabulary (org lexicon)

### 4.3 Cover Failure Patterns (Outsiderness Increase)
- Skip procedures or act outside role authority
- Use jargon incorrectly or repeat basic questions
- Fail to socially remediate after a violation
- Obstruct evidence or procedural artifacts

---

## 5. Log‑First World Model: WEL (World Event Log)

### 5.1 Definition
WEL is an **append‑only text log** of factual changes in the world. It is the primary input for NPC reasoning.

- Not a save/restore mechanism.
- Accumulates “what happened” and shapes “who knows what.”

### 5.2 Two‑Layer Structure (Recommended)
To be both readable and judgeable:

1) **Structured Event (for rules)**
- Minimum fields: `{t, actor, event, place, topic, rule?, object?, note?}`
- Deterministic updates rely on this layer.

2) **Canonical Text (for injection)**
- 1‑line, NPC‑readable text
- Template‑based and deterministic
- Example: `[R4][Queue][Violation] Queue cutting suspected: no verbal agreement.`

### 5.3 Event Taxonomy (Examples)
- Movement/Zone: `EnteredZone / ExitedZone`
- Order/Transaction: `QueuedAtCounter / PaymentProcessed / LabelChanged`
- Norm/Violation: `ViolationDetected(rule)`
- Gossip: `RumorShared / RumorQuestioned / RumorConfirmed / RumorDebunked`
- Procedure: `ReportFiled / InterrogationStarted / VerdictGiven`
- Evidence: `CCTVCaptured / EvidenceTouched / TicketIssued`
- Org Work: `TaskStarted / TaskCompleted / ApprovalGranted / RCInserted`

---

## 6. How Logs Become “Society”: Semantic Shaper + Spatial Blackboard

### 6.1 Semantic Shaper (Promotion Rules)
Promotes low‑level events into “socially meaningful” 1‑line statements.

- Rule‑based (deterministic)
- 1 line, ≤ 80 chars (recommended)
- Examples:
  - `QueuedAtCounter` + “no agreement” → “Queue cutting suspected: no verbal agreement.”
  - `PhotoTriggered x N` → “Photo violation pattern: repeated shots in restricted area.”

### 6.2 Spatial Blackboard (Distance Injection Core)
Each place/object keeps a **recent log buffer**.

- Unit: Zone or Object (counter, bench, CCTV, bulletin, etc.)
- Fields: `{timestamp, topic, actor, severity, text}`
- Purpose: NPCs read **nearby recent context** instead of the entire WEL.

---

## 7. Distance‑Based Log Injection Rules (Core Gameplay Rule)

### 7.1 Meaning of Injection
“N PCs understand the world” means they acquire **contextual logs** from nearby blackboards based on position and visibility.

### 7.2 Recommended Injection Ranges
Each decision tick:

1) **Near**: within D₁ (e.g., 1.2m) → up to K₁ logs
2) **FOV**: within D₂ (e.g., 8m) → up to K₂ logs
3) **Noise**: within D₃ (e.g., 6m) → 1 noise log
4) **Personal Memory**: last N important logs (TTL e.g., 8 min)

### 7.3 Priority (Recommended)
- Procedure/Evidence > Norm Violation > Gossip > General
- Same topic cooldown (e.g., 30s)
- Latest actor events prioritized

### 7.4 TTL & Forgetting (Social Entropy)
- Blackboard entries expire after TTL
- Evidence/procedure logs last longer
- Society forgets, but evidence persists

---

## 8. NPC Decision‑Making: Log‑Driven Social Agents

### 8.1 NPC Inputs (Per Tick)
- Org goal / personal goal
- Role / authority / procedure
- Injected nearby logs
- Personal memory
- Evidence proximity
- Belief/suspicion about player

### 8.2 NPC Internal State (Key Metrics)
- `o`: outsiderness revealed in a single act (0–1)
- `pᵢ`: belief that player is outsider
- `sᵢ`: suspicion score (0–100)
- `G`: global awareness (0–1)

### 8.3 NPC Outputs (Action Choices)
- Ask / verify / challenge
- Spread gossip
- File report
- Mediate / de‑escalate
- Perform org tasks
- Create/strengthen evidence

> In early versions, keep movement simple but make social outputs rich.

### 8.4 NPC Roster (Expansion)
- Studio: PM, dev, QA, release
- Police: officer, investigator, complaints
- Store: manager, clerk, stock
- Park: caretaker, on‑site warning
- Cafe: barista, host
- Logistics: courier, access checker
- Facilities: technician, safety inspector
- Media: reporter, camera crew
- Citizens: resident rep, tourist, student/worker

---

## 9. Gossip Network (Social Propagation via Logs)

### 9.1 Definition
Gossip is interpretation without evidence; it is the social middle state.

- States:
  - Draft (gray): unconfirmed, inquiry phase
  - Final (colored): confirmed or debunked

### 9.2 Propagation (Concept)
- Only via proximity conversation
- Trust weight `w ∈ [0,1]`
- Source/time/place tags preserved
- Evidence can flip state to Final

### 9.3 Confirm/Debunk Triggers
- CCTV captures, tickets, approval notes, action reports, etc.
- Police interrogation/verdict

---

## 10. Police Procedure: Verdict from Logs + Evidence

### 10.1 Police Role
Police do not punish impulsively; they assemble **Case Bundles** and decide procedurally.

### 10.2 Case Bundle Elements
- Violation logs (when/where/what)
- Report logs (who/why)
- Evidence artifacts (captures/tickets/notes/approvals)
- Defense/rebuttal logs
- 1‑line statements (surface text)

### 10.3 Verdict Results
- Cleared / Hold / Suspicion Increase / Expulsion (or strong penalty)
- Verdicts are rule‑based; text only describes the outcome.

---

## 11. LLM Scope (Surface Only)

### 11.1 Allowed
- 1‑line dialogue (question, mediation, interrogation, verdict line)
- 1‑line summary (player‑visible surface text)

### 11.2 Disallowed
- Deciding verdicts or state transitions
- Altering structured event facts
- Deciding whether evidence exists

### 11.3 Relationship to Logs
- NPCs read **canonical template text** as input.
- LLM paraphrases tone/style only.
- On failure, fallback to templates immediately.

---

## 12. Representative Incident Design

### 12.1 Studio: Release Flow
- Developers/PM push RC submission.
- Kanban/patch notes/approvals proceed.
- Player can participate, disrupt, or misunderstand under cover.
- Logs accumulate; approval/RC artifacts appear.

### 12.2 Convenience Store: Order Friction
- Queue norms, label rules, payment procedure repeat.
- Minor infractions spread as rumor → report → procedure.

### 12.3 Park: Daily Norm Friction
- Seating, photography, noise norms create conflict.
- Park management issues action reports.
- Police respond to complaints/evidence.

### 12.4 Police: Procedural Climax
- When reports accumulate, police assemble a case bundle.
- Verdict uses logs + evidence, not “opinion.”

---

## 13. Play Loops (Log‑First)

### 13.1 Micro Loop (Minutes)
1) Organizations perform daily goals
2) Conflict/event occurs (violation, misunderstanding, procedure slip)
3) Event recorded to WEL and promoted to 1‑line canonical text
4) Accumulates in place blackboards
5) NPCs inject logs based on distance/visibility
6) NPCs choose gossip/report/mediation/procedure/work
7) Results accumulate back into logs + artifacts

### 13.2 Macro Loop (Session)
- Player maintains cover while interacting with orgs
- Mistakes are mitigated via social remediation or procedure compliance
- As global G rises, pressure increases
- Evidence/procedure confirm or debunk incidents; society moves on

---

## 14. Demo Design (Log‑First Social Org Version)

### 14.1 Demo Goal (5–8 minutes)
- Show organizations “doing work.”
- Events occur (violation/ misunderstanding/ procedure conflict).
- Logs accumulate locally.
- NPCs read logs and move into report/procedure.
- Police issue verdicts from logs + evidence.

### 14.2 Two‑Act Demo (Recommended)

**Act 1: Store Order Incident (Norm → Log → Report)**
- Player or citizen triggers queue/label friction.
- WEL/Blackboard holds 1‑line log.
- Nearby NPC uses that log to gossip or report.

Must show:
- `[Violation]` canonical text
- NPC line/report based on “just saw” context

**Act 2: Studio Release Incident (Org Goal → Evidence → Verdict)**
- Studio RC submission proceeds (kanban/patch/approval).
- Procedure slip creates an incident.
- At least one artifact appears as evidence.
- Police assembles case bundle and outputs verdict.

Must show:
- Real org workflow (not idle NPCs)
- Evidence confirming or debunking rumor
- Police verdict based on logs + evidence

---

## 15. Design Quality Checklist (Log‑First Completeness)

### 15.1 Log Quality
- All key events emit 1‑line canonical text
- Canonical text is template‑based and unambiguous (who/what/where)
- Excess duplicate logging prevented (cooldowns)

### 15.2 Injection Quality
- NPCs actually read nearby recent logs
- Distance/FOV/noise rules are applied
- Blackboard TTL creates social forgetting

### 15.3 Procedural Consistency
- Causality of violation→gossip→report→evidence→verdict traceable in logs
- Verdicts are rule‑based; LLM text does not alter outcomes

---

## 16. Summary (Core Statement)

Dream of One is not a “perfect world‑state AI.” It builds a **society of accumulated text logs**, and NPCs **inject nearby logs by distance** to execute organization goals and run social processes like gossip, report, and verdict.

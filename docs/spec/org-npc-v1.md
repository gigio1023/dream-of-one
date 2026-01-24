# Org + NPC spec v1 (MCSS: Store/Studio/Park/Station)

This document is the v1 spec baseline for organization procedures, NPC roles/routines, incident templates, and artifact expectations for the MCSS vertical slice. It is designed to align with existing runtime terminology in `OrganizationCatalog`, `WorldDefinitionSeeder`, and `NpcDefinition`.

## Terminology alignment (code SoT)

### Organization IDs

`OrganizationCatalog` currently uses the following organization IDs for this slice:

- `Store`
- `Studio`
- `Park`
- `Station` (police outpost)

For design text, “Police” refers to the `Station` organization ID. When an enum is introduced later, prefer `OrganizationId.Station` for police.

### NPC definition fields (design-relevant)

`NpcDefinition` fields this spec references most often:

- `npcId`: stable NPC identity key (e.g., `Police_Officer`)
- `roleName`: role/archetype name used by UI/dialogue
- `organization`: organization ID string (`Store`, `Studio`, `Park`, `Station`)
- `routine`: routine profile key (anchors + schedule logic)
- `authorityProfile`: governs what commands are legitimate
- `anchorName`: primary home anchor (e.g., `StoreBuilding`, `Station`)

### Anchors and zones already seeded

Anchors and zones referenced below are grounded in `WorldDefinitionSeeder`:

- Building anchors:
  - `StoreBuilding`
  - `StudioBuilding_L1`
  - `ParkArea`
  - `Station`
- Key zones:
  - `StoreQueue`
  - `StudioPhoto`
  - `ParkSeat`
  - `PoliceReport`

## Organization procedures (spec tables)

Each organization table captures the current design intent in the same shape as `OrganizationDefinition`: `goal`, `procedures`, `resources`, `artifacts`, and `roles`.

### Store (`Store`)

| Field | Spec |
| --- | --- |
| Goal | Keep `품절 0/라벨 갱신/거래 질서 유지` stable under load. |
| Procedure steps (6) | 1) Open counter + confirm `라벨 시스템` state. 2) Sweep `StoreQueue` for rule risk (`R_QUEUE`). 3) Verify high-risk labels (`R_LABEL`) and update where needed. 4) Resolve counter conflicts (order, refunds, mislabels). 5) Emit evidence artifacts (tickets/receipts/memos) for any dispute. 6) Close with a short “status line” for the next cycle (what changed, why). |
| Resources | `라벨 시스템`, `카운터`, `Store_QueueMarker`, `Store_LabelBoard`, `Store_Printer`, `Store_CounterBell`. |
| Artifacts (examples) | `가격/품절 라벨`, `거래 메모`, `Violation Ticket`, `Complaint Memo`, `Defense Memo`. |
| Roles | `Clerk`, `Manager`, plus supporting `Customer` archetypes. |

### Studio (`Studio`)

| Field | Spec |
| --- | --- |
| Goal | Deliver `RC 제출/릴리즈 안정화` while keeping procedure integrity visible. |
| Procedure steps (7) | 1) Pull current work into visible state (`칸반 갱신`). 2) Verify scope against release target (what counts as RC). 3) Draft/refresh `패치노트` based on actual work. 4) Run approval pass at `Studio_ApprovalDesk`. 5) Insert RC at `Studio_RCInsert` only after approval evidence exists. 6) Broadcast release outcome (approval granted vs. slip). 7) Log any procedure slips as explicit incidents, not silent failures. |
| Resources | `칸반 보드`, `라운지`, `서버 슬롯`, `Studio_Kanban`, `Studio_ApprovalDesk`, `Studio_RCInsert`. |
| Artifacts (examples) | `칸반 로그`, `패치노트`, `승인 노트`, `RC 스트립`, `Approval Note`. |
| Roles | `PM`, `Developer`, `QA`, `Release`. |

### Park (`Park`)

| Field | Spec |
| --- | --- |
| Goal | Maintain `좌석/소음/촬영 규범 유지` without feeling over-policed. |
| Procedure steps (5) | 1) Patrol anchor loop around `ParkArea` and `ParkSeat`. 2) Detect visible rule pressure: noise clusters, seat monopolies, unauthorized photo setups. 3) Issue graded interventions: soft warning → directive → escalation call. 4) Record the intervention outcome as a lightweight report/memo. 5) Update public signals (`게시판 공지`) when norms change. |
| Resources | `게시판`, `조치 권한`, `Park_Bench`, `Park_NoticeBoard`, `Park_NoiseSpot`, `Park_PhotoSpot`. |
| Artifacts (examples) | `조치 보고`, `게시판 공지`, `민원 메모`, `Rumor Card`, `Complaint Memo`. |
| Roles | `Elder`, `Caretaker`, plus supporting `Visitor` archetypes. |

### Police outpost (`Station`)

| Field | Spec |
| --- | --- |
| Goal | Execute `신고 접수 → 현장 확인 → 증거 수집 → 심문 → 판정` with legible truth transitions. |
| Procedure steps (8) | 1) Intake report at `Police_ReportDesk` (who/what/where). 2) Create/refresh case bundle (report + suspects + initial artifacts). 3) Visit scene anchor and confirm rule context (what rule exists here). 4) Collect evidence artifacts (captures, tickets, statements). 5) Interrogate key actors at `Police_InterrogationSpot`. 6) Reconcile contradictions on the evidence board (`Police_EvidenceBoard`). 7) Emit a deterministic verdict line (clear / guilty / unresolved / escalation). 8) Publish resolution artifacts and close or escalate the case. |
| Resources | `티켓 발부`, `프린터`, `캡처 보드`, `Police_ReportDesk`, `Police_EvidenceBoard`, `Police_Printer`, `Police_InterrogationSpot`. |
| Artifacts (examples) | `위반 티켓`, `CCTV 캡처`, `사건 로그 스트립`, `Violation Ticket`, `CCTV Capture`, `Approval Note`. |
| Roles | `Police`, `Officer`, `Investigator`. |

## NPC archetypes and routines

Each organization defines at least two NPC archetypes. Archetypes are expressed in terms of `NpcDefinition`-compatible keys (`roleName`, `organization`, `routine`, `authorityProfile`, `anchorName`).

### Store archetypes

#### 1) Store Clerk (`roleName: Clerk`)

- Organization: `Store`
- Authority profile: `Medium` (can warn, correct labels, and issue store-level tickets/receipts)
- Anchor: `StoreBuilding`
- Routine anchors (primary loop):
  - `Store_LabelBoard` → `Store_QueueMarker` → `Store_CounterBell` → `Store_Printer`
- Major interactions:
  - Resolves queue disputes and label mismatches.
  - Produces artifacts when forced to arbitrate (ticket/memo/receipt).
  - Defers bans/escalations to `Manager` or `Station`.

#### 2) Store Manager (`roleName: Manager`)

- Organization: `Store`
- Authority profile: `High` (can overrule clerk decisions, authorize exceptions, escalate to Station)
- Anchor: `StoreBuilding`
- Routine anchors (primary loop):
  - `Store_CounterBell` → `Store_LabelBoard` → `Store_Printer`
- Major interactions:
  - Converts ambiguous disputes into explicit rulings.
  - Signs off on artifacts that change future policy (e.g., “label freeze”).
  - Acts as a reliable witness for “why was this exception made?”

### Studio archetypes

#### 1) Studio PM (`roleName: PM`)

- Organization: `Studio`
- Authority profile: `High` (controls approval gates and RC readiness decisions)
- Anchor: `StudioBuilding_L1`
- Routine anchors (primary loop):
  - `Studio_Kanban` → `Studio_ApprovalDesk` → `Studio_RCInsert`
- Major interactions:
  - Requests proof that work exists before allowing approval.
  - Blocks RC insertion when artifacts do not support claims.
  - Generates approval artifacts that become police-grade evidence later.

#### 2) Studio QA (`roleName: QA`)

- Organization: `Studio`
- Authority profile: `Medium` (can delay but not finalize release)
- Anchor: `StudioBuilding_L1`
- Routine anchors (primary loop):
  - `Studio_Kanban` → `Studio_Terminal` → `Studio_ApprovalDesk`
- Major interactions:
  - Turns rumors (“RC is ready”) into verifiable claims (“show patch notes / approvals”).
  - Produces `Defense Memo`-style artifacts when blocking a release.
  - Serves as a frequent witness for “what was missing?”

### Park archetypes

#### 1) Park Caretaker (`roleName: Caretaker`)

- Organization: `Park`
- Authority profile: `Medium` (can warn and redirect; escalates repeat offenses)
- Anchor: `ParkArea`
- Routine anchors (primary loop):
  - `Park_Bench` → `Park_NoiseSpot` → `Park_NoticeBoard`
- Major interactions:
  - Converts diffuse discomfort into explicit, logged interventions.
  - Issues soft-to-hard escalations that create artifacts players can cite.
  - Requests Station help for high-friction conflicts.

#### 2) Park Elder (`roleName: Elder`)

- Organization: `Park`
- Authority profile: `High` (sets norms; can redefine what is considered acceptable)
- Anchor: `ParkArea`
- Routine anchors (primary loop):
  - `Park_NoticeBoard` → `Park_Bench`
- Major interactions:
  - Publishes norm updates that change interpretation of future events.
  - Acts as a “policy witness” rather than an “event witness.”
  - Creates powerful “why” evidence via public notices.

### Station archetypes

#### 1) Station Officer (`roleName: Officer`)

- Organization: `Station`
- Authority profile: `High` (can issue tickets, open cases, and deliver verdicts)
- Anchor: `Station`
- Routine anchors (primary loop):
  - `Police_ReportDesk` → `Police_EvidenceBoard` → `Police_InterrogationSpot`
- Major interactions:
  - Anchors the case loop for the player.
  - Translates organizational incidents into formal cases.
  - Produces the final verdict artifacts.

#### 2) Station Investigator (`roleName: Investigator`)

- Organization: `Station`
- Authority profile: `Medium-High` (can gather/interpret evidence but defers verdict)
- Anchor: `Station`
- Routine anchors (primary loop):
  - `Police_EvidenceBoard` → scene anchors (`StoreBuilding` / `StudioBuilding_L1` / `ParkArea`) → `Police_EvidenceBoard`
- Major interactions:
  - Performs cross-org evidence reconciliation.
  - Requests missing artifacts explicitly (“I need a capture, not a rumor.”)
  - Serves as a structured hint system for evidence gaps.

## Incident templates (minimum 1 per organization)

Each template includes: trigger, observers/witnesses, evidence generation, and outcomes (at least two of clear/guilty/unresolved/escalation).

### Store incident: Queue cutting + label dispute

- Trigger:
  - A customer skips `StoreQueue` order and claims a mislabel discount.
- Observers / witnesses:
  - Primary: `Clerk`, nearby `Customer` archetypes.
  - Secondary: `Manager` (if escalated).
- Evidence generation:
  - `Violation Ticket` from `Store_Printer` tied to `R_QUEUE`.
  - Label state snapshot from `Store_LabelBoard`.
  - Optional `Complaint Memo` / `Defense Memo` statements.
- Possible outcomes:
  - Clear: label was actually wrong; queue violation downgraded.
  - Guilty: label was correct and queue violation confirmed.
  - Escalation: conflict becomes a Station case due to refusal.

### Studio incident: RC inserted without approval

- Trigger:
  - RC is inserted at `Studio_RCInsert` without a matching approval artifact.
- Observers / witnesses:
  - Primary: `PM`, `QA`.
  - Secondary: `Developer` who performed the insert.
- Evidence generation:
  - Missing or out-of-order `Approval Note` vs. `RC 스트립` timing.
  - `칸반 로그` and `패치노트` inconsistencies.
  - Station follow-up can produce `CCTV Capture`-style timeline proof.
- Possible outcomes:
  - Guilty: approval absent or clearly post-dated.
  - Clear: approval exists but was not surfaced; PM validates it.
  - Unresolved: contradictory artifacts require Station escalation.

### Park incident: Noise complaint vs. permitted performance

- Trigger:
  - Noise complaint filed at `Park_NoiseSpot` during a claimed permitted activity.
- Observers / witnesses:
  - Primary: `Caretaker`, nearby `Visitor` archetypes.
  - Secondary: `Elder` (policy witness).
- Evidence generation:
  - `Complaint Memo` from the caretaker.
  - Current norm snapshot from `Park_NoticeBoard`.
  - Optional rumor artifacts if players rely on hearsay.
- Possible outcomes:
  - Clear: notice board indicates the performance window is allowed.
  - Guilty: no allowance exists; warnings were ignored.
  - Escalation: repeated conflict routed to Station.

### Station incident: Conflicting testimonies across orgs

- Trigger:
  - A report at `Police_ReportDesk` includes two incompatible claims about the same event.
- Observers / witnesses:
  - Primary: `Officer`, `Investigator`.
  - Secondary: org-specific witnesses (`Manager`, `PM`, `Elder`, etc.).
- Evidence generation:
  - Case bundle artifacts: `Violation Ticket`, `CCTV Capture`, `Approval Note`, memos.
  - Evidence-board reconciliation artifacts (“contradiction resolved” notes).
- Possible outcomes:
  - Clear: contradictions explained by timeline + policy context.
  - Guilty: one claim is disproven by harder artifacts.
  - Unresolved: insufficient artifacts; case remains open.
  - Escalation: policy conflict requires higher authority.

## Player question checklist (must always be answerable)

For any active incident/case, the player should be able to answer these three questions from artifacts and world state:

1) What happened?
- Identify the triggering event in concrete terms (who did what, where).
- Anchor it to a rule, procedure step, or explicit policy signal.

2) Why is it a problem (or not)?
- Show the governing rule/procedure/policy context.
- Distinguish “norm discomfort” from a formal violation.

3) What evidence supports the claim?
- Provide at least one artifact that is harder than rumor (ticket, capture, approval note, signed memo).
- Ensure at least one witness can point to the same artifact.

## ID / enum candidates (for follow-up refactors)

These candidates are intentionally aligned with current string IDs and anchor names so the eventual enum migration can be mostly mechanical.

### OrganizationId candidates

- `Store`
- `Studio`
- `Park`
- `Station`

### RoutineId candidates

- Store:
  - `StoreClerk_LabelQueueCounter`
  - `StoreManager_CounterLabelAudit`
- Studio:
  - `StudioPm_KanbanApprovalRc`
  - `StudioQa_KanbanTerminalApproval`
- Park:
  - `ParkCaretaker_PatrolIntervene`
  - `ParkElder_NoticePolicyLoop`
- Station:
  - `StationOfficer_CaseLoop`
  - `StationInvestigator_CrossOrgEvidence`

### AnchorId candidates (subset)

- Buildings: `StoreBuilding`, `StudioBuilding_L1`, `ParkArea`, `Station`
- Store: `Store_LabelBoard`, `Store_QueueMarker`, `Store_Printer`, `Store_CounterBell`
- Studio: `Studio_Kanban`, `Studio_Terminal`, `Studio_ApprovalDesk`, `Studio_RCInsert`
- Park: `Park_Bench`, `Park_NoticeBoard`, `Park_NoiseSpot`, `Park_PhotoSpot`
- Station: `Police_ReportDesk`, `Police_EvidenceBoard`, `Police_Printer`, `Police_InterrogationSpot`

## Design guardrails carried forward

- Determinism boundary: truth transitions and verdicts remain rule/policy driven; LLM output styles canonical lines only.
- Evidence-first resolution: incidents should become easier to resolve as artifacts accumulate, not as dialogue length increases.
- Org visibility: each organization should “do work” in public, leaving artifacts that make the procedure legible.

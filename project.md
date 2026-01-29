---
doc: project.md
project: Dream of One
variant: Lucid Cover Social Stealth
revision: 2026-01-25
status: Locked v1 (Design SoT + Implementation Contract)
owner: You
---

# Dream of One — Project Doc (Lucid Cover Social Stealth v1)

## 0) One-line definition
A **social stealth** game set inside a dream: the player is the only lucid dreamer and must **perform normal-looking organizational procedures** while avoiding **Suspicion** and **Exposure**. NPCs treat dream-only rules as normal; if the player behaves “too aware” or “procedurally weird,” NPCs generate records, file reports, and the Station runs an **Inquest Dossier** on the player. **If you are identified as lucid, the session ends immediately.**

> 핵심 전제: 플레이어는 “사건을 해결”하지 않는다.  
> 플레이어는 “정상처럼 일/대화/절차 수행”을 하며 **발각을 피하는 대상**이다.

---

## 1) Scope and non-goals

### In scope (v1)
- **Lucid cover loop**: “업무/절차 수행 → 의심/노출 관리 → 신고/조사 회피 → 세션 종료”
- **Dream Laws**: 꿈 세계에서만 통하는 규칙(전역/로컬). 텍스트 표면(text surfaces)로 자연스럽게 드러남.
- **Suspicion / Exposure**: 단계적 반응(수상→추궁→신고→조사→판정)으로 누적.
- **Cover Tests**: 랜드마크별로 “발각 위험이 발생하는 상황 템플릿” 6개.
- **Inquest Dossier (player case)**: Station이 플레이어를 대상으로 케이스를 번들링하고 deterministic verdict를 내림.
- **Log-first**: 의미 있는 변화는 StructuredEvent → WEL → Canonical Lines로 남음.
- **Artifacts as records**: Witness Statement / Memo / Ticket / Notice / Approval Note 등이 “플레이어 이상행동”의 증거가 됨.
- **LLM optional styling**: 문장 톤/말투만(표면 레이어). 결과/판정/증거는 deterministic.

### Out of scope (v1)
- 플레이어가 외부 사건을 “수사/해결”하는 전통적 investigation loop
- 범죄 사건/살인 사건 등 대규모 케이스 시스템 확장
- LLM이 행동 계획/사실 판정을 결정하는 구조
- 장기 저장/영속 월드(세션 간 영구 월드 상태는 v1에서 최소화)

---

## 2) Non-negotiables (implementation rails)
- **Unity MCP only**: 모든 콘텐츠는 ScriptableObjects / prefabs / addressables / editor tools로 재현 가능해야 함.
- **Determinism boundary**:
  - **Truth transitions**(Suspicion/Exposure 변경, Report 생성, Inquest verdict, Artifact 생성)은 deterministic.
  - LLM은 **오직 스타일링**(표현 문장)만. 실패 시 템플릿으로 즉시 폴백.
- **Rebuildability**: `Tools/DreamOfOne/Rebuild World From Data`로 즉시 플레이 가능한 월드 생성.
- **Diagnostics gate**: `Tools/DreamOfOne/Run Diagnostics` clean (콘솔 에러 0).
- **Performance truthiness**: steady-state per-frame allocations 0B 목표(로딩/전환 제외).

---

## 3) Player fantasy & promise
- 플레이어는 유일한 **lucid dreamer(자각자)**.
- NPC들은 꿈임을 모르며, 꿈의 규칙을 “정상/상식/절차”로 취급.
- 플레이어는 **커버(cover)**를 가진 조직 구성원처럼 행동해야 함.
- 텍스트 상호작용(대화/게시판/메모/티켓/승인노트)에서 꿈 규칙이 드러날 때,
  - 플레이어가 “꿈을 아는 티”를 내면 **Exposure**가 오르고,
  - 절차/사회적 어색함을 보이면 **Suspicion**이 오름.
- Suspicion이 충분히 쌓이면 NPC는 **Report**를 생성하고 Station이 **Inquest Dossier**를 열며,
  - “Lucid identified” 판정이 나면 **즉시 세션 종료**.

---

## 4) Design pillars (v1 contract)
1) **Hide in plain sight**: 존재 자체는 허용되나, “행동/말/절차”가 튀면 끝.
2) **Dream laws feel normal**: 규칙은 NPC에게 정상 문장으로 제시된다(플레이어만 이상함을 느낌).
3) **Staged suspicion**: 즉시 발각이 아니라 단계적으로 압박이 증가한다.
4) **Text is the danger surface**: 텍스트 표면과 텍스트 반응이 핵심 플레이.
5) **Artifacts outweigh words**: 말은 약하고 기록(artifact)이 무겁다.
6) **Deterministic, readable feedback**: 왜 의심/노출이 올랐는지 UI/로그로 항상 추적 가능.

---

## 5) Core loop: Work-as-Cover Loop (no investigation)
### Loop sentence
**Do your cover work → respond to dream-law text surfaces → manage suspicion/exposure → avoid report/inquest → survive the session.**

### Session rhythm (10–12 min)
- 0:00–1:00: Cover briefing + today’s checklist
- 1:00–9:00: 4 landmarks 방문 + 절차 수행 중 Cover Tests 발생(최소 2회)
- 9:00–12:00:
  - 신고/인퀘스트가 열리면 압박 상태에서 버티기/탈출/소명
  - 신고가 없으면 마지막 “soft check”로 마무리
- End: summary + score + next hook

---

## 6) Win / Lose states
### Win (success)
- 세션 종료 시점에 **Exposure < EXPOSED threshold**이고,
- Inquest가 열려도 **“Lucid identified” verdict가 아닌 상태**로 종료.

### Lose (immediate)
- **Lucid identified verdict** 발생 → 즉시 세션 종료 (Forced Wake / Collapse)

### Endings (v1 recommended)
- **Clean Pass**: 신고 없음 또는 조사 없음, checklist 완료
- **Narrow Escape**: 신고/조사 있었으나 “Lucid identified”는 피함 (경고/유예)
- **Exposed**: Lucid identified (즉시 종료)

---

## 7) Core variables (tuning contract)
### 7.1 Suspicion (사회적 의심)
- 범위: 0–100 (NPC별 + 조직/존 별 aggregate)
- 단계(기본):
  - 0–24: At Ease
  - 25–49: Suspicious (가벼운 확인/눈치)
  - 50–74: Challenging (추궁/증빙 요구)
  - 75–89: Reporting (Station 신고 생성)
  - 90+: Inquest pressure (즉시 조사 트리거 후보)
- 주요 상승 원인:
  - 절차/규범 위반 (Procedure detectors)
  - 어색한 반복/회피 (Repetition detectors)
  - 권한 불일치 (Authority detectors)
- 주요 감소 원인(Defuse):
  - 절차를 “정상 순서”로 재수행
  - Comply/Frame 발화 + 적절한 산출물(artifact) 제출
  - 현장 이탈(쿨다운) + 다음 체크리스트 정상 수행

### 7.2 Exposure (자각 노출)
- 범위: 0–100 (global)
- 기본 임계치:
  - 60: Station 관심 증가(특정 NPC가 “꿈 관련” 기록을 만들기 시작)
  - 100: **Exposed (즉시 종료)**
- 주요 상승 원인:
  - Dream talk: “꿈”, “자각”, “깬다”, “현실”, “시뮬레이션” 등 금기 키워드/프레이밍
  - Reality testing: 현실체크 행동/질문(시간/글자/거울/손가락/호흡 등 점검적 표현)
  - “이상하다/모순이다”를 메타로 확정하는 발화
- 주요 감소(선택): v1에서는 **Exposure는 원칙적으로 감소하지 않음**(긴장 유지).
  - 단, 특정 Cover/아이템/조직 지원으로 “-small offset” 허용 가능(후순위).

### 7.3 Optional: Dream Stability (v2)
- v1에서는 핵심 변수에서 제외(필요 시 확장).

---

## 8) Interaction model (text-first, deterministic)
### 8.1 Player speech model (Speech Acts)
플레이어의 텍스트 상호작용은 4개 Speech Act로 제한/분류된다.
- **SA_COMPLY**: 순응/수용/예절
- **SA_INQUIRE**: 질문/확인(절차 용어로 안전하게)
- **SA_FRAME**: 설명/정당화(“절차상 이렇게 했다”)
- **SA_BREAK**: 금기(꿈/현실체크/메타 발화) → Exposure 급상승

**입력 방식 권장(v1)**  
- UI에서 Speech Act를 먼저 선택하고, 선택적으로 1줄 텍스트를 입력(스타일링).
- 판정/증감은 Speech Act + 키워드 룰로 deterministic.

### 8.2 Text surfaces (Rule revealers)
Dream laws는 “NPC가 이상하게 말한다”가 아니라,
- 표지판(signage)
- 게시판(notice)
- 양식(form)
- 티켓/메모(ticket/memo)
- 승인노트(approval note)
처럼 **정상적인 문서/텍스트 표면**에서 드러난다.

각 text surface는 최소 1개 DreamLawId를 참조한다.

---

## 9) Organizations & landmarks (v1 slice)
### Landmarks (must exist)
- Store
- Studio
- Park
- Station (Police outpost)

### Organizations (IDs)
- `Store`, `Studio`, `Park`, `Station`

각 조직은 “업무 절차”를 통해 “정상성”을 유지한다.
플레이어는 그 절차를 수행하며 자연스럽게 위장해야 한다.

---

## 10) Inquest system (player-focused Case)
### 10.1 What triggers a report
NPC가 플레이어를 “이상하다”고 판단하면:
1) Witness Statement 생성(artifact)
2) 필요 시 Complaint Memo / Ticket / Notice 등 추가 artifact 생성
3) Station으로 Report event가 전송됨
4) Station은 Inquest Dossier를 열고, 일정 조건에서 Verdict를 발행

### 10.2 Inquest dossier content
- suspect: `PLAYER`
- evidence:
  - Witness Statements (누가 무엇을 봤는가)
  - Procedure Violation records (룰/절차 위반 로그)
  - Text violations (금기 발화 기록)
  - Supporting artifacts (ticket, memo, notice snapshot, approval note)
- verdict types:
  - **Cleared** (의심 해소)
  - **Warning** (경고 + 다음 세션 페널티/훅)
  - **Detained** (강제 종료에 준하는 탈출/중단)
  - **Lucid identified** (**즉시 종료**)

### 10.3 Verdict (deterministic rules)
(개념 스키마)
- score = w1 * Exposure + w2 * SuspicionAggregate + w3 * HardEvidenceCount + w4 * SeveritySum - w5 * DefenseArtifacts
- thresholds로 verdict 결정
- LLM은 verdict 라인의 “말투”만 스타일링 가능

---

## 11) Content contracts (v1)
### Required artifact types (v1)
- Witness Statement (핵심)
- Complaint Memo
- Defense Memo (플레이어의 정당화 기록)
- Notice Snapshot (게시판/표지판 캡처)
- Ticket / Receipt (절차 기록)
- Approval Note (Studio 절차 증빙)

### Required UI surfaces (v1)
- HUD: Suspicion(지역/조직) + Exposure + current cover + checklist
- Artifact inventory + inspection
- Inquest Dossier UI (“why verdict happened”)
- Dev overlay(선택): last detectors fired + last reason codes

---

## 12) Minimum Complete Session Slice (MCSS) — v1 acceptance
### Runtime target
- 10–12 minutes per session

### Must happen in one run
- Player visits 4 landmarks: Store, Studio, Park, Station
- ≥12 meaningful events (movement 제외)
- ≥6 social reactions (NPC의 수상/추궁/소문/신고 행동)
- ≥3 artifacts about the player are created and inspectable
- ≥1 report OR ≥1 near-miss (Reporting 단계 진입) 발생
- Session ends gracefully with summary (Clean Pass / Narrow Escape / Exposed)

### Definition of done (MCSS)
- Start → cover work loop → escalation or survival → end summary works reliably
- Portals/NavMesh never permanently break NPC state
- Diagnostics clean; no console errors
- UI always explains: “what raised suspicion/exposure and why”
- LLM disabled mode still fully functional

---

## 13) Tooling & QA gates (must stay)
- `Rebuild World From Data` produces playable world
- `Run Diagnostics` clean
- PlayMode tests cover:
  1) Session start/end without errors
  2) At least one CoverTest triggers escalation
  3) Inquest dossier can form and verdict is deterministic
  4) LLM disabled still passes

---

## 14) References to v1 content packs
- Dream laws library: `docs/design/dream-laws.md`
- Cover tests library: `docs/design/cover-tests.md`
- IDs:
  - Organization: Store / Studio / Park / Station
  - Player suspect: PLAYER

---

## 15) Document policy (SoT)
- `project.md` is the **single source of truth** for gameplay promise, loops, variables, and acceptance.
- `dream-laws.md` is the SoT for forbidden/normal rules and detectors.
- `cover-tests.md` is the SoT for scenario templates that exercise those laws.

**WP7 — UI Completion**
- Artifact UI, case view, debug overlay

**WP8 — Performance & QA Gate**
- Play Mode tests, diagnostics expansion, GC profiling

## 15) Roadmap (how we evolve the game)
**Goal:** Extend the current MCSS slice into a replayable, choice-driven “casework” loop without breaking determinism.

### Phase 0 — Immediate (stability + feel, 1–3 days)
- Ensure runtime-only spawning (avoid edit-time NavMeshAgent errors during rebuild/compile)
- Make interaction UX consistent (one interaction model, one prompt model)
- Reduce always-on debug text; show only when toggled
- Lock in quality gates: errors 0, softlocks 0, repeatable session 0 failures

### Phase 1 — Vertical Slice v1 (repeatable loop, 1–2 weeks)
- Expand from 2 incidents → 4–6 incidents with meaningful branches
- Upgrade case UI for “why this verdict happened”
  - Link: event ↔ artifact ↔ witness ↔ rule
  - Filter/pin/highlight for quick reasoning
- Add navigation UX (mini-map/compass + landmark markers + current objective)
- Move NPC behavior from “wander” → “role + routine” (store/studio/park/police)
- Add 3+ end states (cleared / guilty / unresolved / escalation) + a score/replay reason

### Phase 2 — Core Expansion (social depth, 3–6 weeks)
- Rumor network: trust/authority-weighted propagation + rebuttal/confirmation travel
- Organization policy packs: same action judged differently by org/zone/time
- Interiors become purpose-built spaces (visibility, choke points, evidence stations)
- WEL-driven replay harness for debugging/balancing (reproduce a session from logs)

### Phase 3 — Productization (scale + meta, 2–3 months)
- Chunk streaming (3x3 district), addressables handles discipline, portal + nav safety at scale
- Meta progression (rank/permissions/tools) that unlocks new cases/areas
- Build/release pipeline + automated gates (tests/diagnostics) for every release

### Success criteria (clear “it got better” signals)
- 15–20 minute session remains stable (no errors, no hard locks)
- 6 incidents / 3 endings / 4+ NPC routines
- Player can always answer: “What happened, why, and what evidence supports it?”

## 16) Document policy
**Single source of truth**
- `project.md`: decisions, scope, roadmap, and non-negotiables
- `docs/spec/new-plan.md`: detailed implementation contract (long-form)

**Archive**
- `docs/archive/`: historical snapshots (completed checklists, older status notes)

**Rule**
- Update `project.md` when decisions/scope/roadmap change.
- Update `docs/spec/new-plan.md` when execution details change.

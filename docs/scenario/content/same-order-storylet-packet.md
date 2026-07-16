# Same Order Storylet Packet

Status: active M1 storylet packet
Date: 2026-05-14
Source: `docs/archive/v1-direction/10-team-operating-brief.md`
Benchmark method: `docs/archive/v1-direction/11-simulator-benchmark-adoption-brief.md`

## Purpose

This packet turns Same Order from a concept into production-ready storylets.
Each beat names the local premise, player action, deterministic signals, visible
feedback, record, repair window, provider boundary, and runtime mapping.

## Simulator Baseline

Same Order must first work as a mundane procedure simulator. Dream tone and
provider wording are secondary layers.

Minimum procedure guide:

| Cue | Purpose |
|---|---|
| queue mark | tells the player this is a public routine, not private chat. |
| label/order board | makes "same order" an inspectable local expectation. |
| receipt or label tray | shows where the player's answer becomes a record. |
| correction slip | makes repair visible and costly. |
| report tray or clerk handoff | shows how local mismatch can leave the Store. |
| Station intake dossier | shows the exact Store record being compared later. |

Required player-facing cause chain:

```text
Store procedure
-> player line
-> clerk comparison
-> visible receipt/report record
-> Station cites exact record
-> deterministic outcome
```

Every beat must preserve these simulator fields:

| Field | Meaning |
|---|---|
| `procedure_cue` | the sign, record, tray, or dossier the player can read. |
| `expected_behavior` | what a local person would normally say or do. |
| `mismatch_code` | deterministic reason if the player breaks the script. |
| `record` | receipt, correction slip, clerk statement, report, or dossier. |
| `repair_cost` | what remains on record even when repair succeeds. |
| `station_citation` | exact prior Store record used by Station. |

## Route Coverage

| Route | Required player path | Outcome | Must prove |
|---|---|---|---|
| `clean_cover` | safe routine answer, then safe probe answer | `cover_held` | ordinary compliance creates no report. |
| `repair_recovered` | repair question, then accepts clerk premise | `cover_held` with unease | uncertainty costs pressure but can recover. |
| `soft_report` | routine mismatch, then outsider insistence | `soft_report` | social report can exist without formal inquest. |
| `inquest_opened` | routine mismatch, then typed dream-language statement | `inquest_opened` | typed speech can become a Store record that Station cites. |

## Shared Runtime IDs

| Field | Value |
|---|---|
| Conversation | `conv-same-order` |
| NPC | `NPC_Store_Clerk` |
| Station actor | `NPC_Station_Officer` |
| Store prompt 1 | `store.same_order.routine` |
| Store choice set 1 | `store.same_order.routine.choices` |
| Store prompt 2 | `store.same_order.probe` |
| Store choice set 2 | `store.same_order.probe.choices` |
| Station prompt | `station.same_order.reconciliation` |
| Primary record | `store_same_order_clerk_statement` |

## Beat 1: Routine Assumption

Storylet:

- Store routine assumption.

Location:

- Store counter.

Examiner NPC:

- Store Clerk.

Local premise:

- The player is a regular and should know the usual order.

Preconditions:

- Player reaches Store counter.
- No active Store contradiction has been reported.

Player action:

- Answer the clerk's routine question.

NPC prompt:

- `오늘도 같은 걸로 드릴까요?`

Choice lanes:

| Lane | Player line | Signal | Immediate response | Effect |
|---|---|---|---|---|
| safe/local | `네, 같은 걸로 부탁해요.` | none | `네. 표식 하나, 같은 봉투로 처리하겠습니다.` | stays normal. |
| repair | `제가 보통 뭘 시켰죠?` | `memory_gap_admission` | `보통은 표식 하나라고 하셨죠. 오늘은 왜 확인하시나요?` | opens soft probe, small unease. |
| risky/weird | `오늘 처음 왔는데요.` | `local_routine_mismatch` | `처음이라고요? 어제도 같은 자리에서 같은 말을 하셨는데요.` | opens probe, creates mismatch. |
| typed recorded speech | player-entered line | classifier-selected | response must cite exact line | allowed only through the HUD typed input path. |

Artifact:

- none for clean cover;
- clerk note candidate for repair/risky.

Procedure cue:

- queue mark, label/order board, and receipt tray should be readable before or
  during the prompt.

Record:

- clean cover produces a normal receipt only;
- repair/risky line can create a note candidate tied to the selected line.

Repair cost:

- repair opens Beat 2 but leaves `memory_gap_admission` as a local unease record.

Repair window:

- Player can accept the clerk's premise in Beat 2.

Provider wording inputs:

- Store Clerk role, queue/label procedure, current prompt, selected signal,
  Act 1 public procedure tone.

Provider forbidden outputs:

- new signal;
- changed threshold;
- verdict;
- claim that the player is objectively outside the dream.

Coverage rule:

- All four route outcomes must start from this beat.

## Beat 2: Soft Probe

Storylet:

- Clerk asks whether the player can preserve the public self after a mismatch.

Location:

- Store counter.

Examiner NPC:

- Store Clerk.

Local premise:

- Yesterday's Store record says the player had a usual order.

Preconditions:

- Beat 1 completed.
- If Beat 1 was safe, probe is low-pressure confirmation.
- If Beat 1 had a signal, probe is record-aware.

NPC prompt:

- `어제 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?`

Choice lanes:

| Lane | Player line | Signal | Immediate response | Effect |
|---|---|---|---|---|
| safe/local | `맞습니다. 제가 착각했습니다.` | none | `그럼 같은 봉투로 두겠습니다.` | can close clean or repair route. |
| repair | `어제 일이 조금 흐릿해서 확인했습니다.` | `memory_gap_admission` | `흐릿하다고요. 기록에는 남겨두겠습니다.` | keeps unease, no hard contradiction alone. |
| risky/weird | `저는 여기 사람이 아닙니다.` | `role_script_break`, `prior_statement_contradiction` | `그 말은 그냥 넘길 수 없습니다.` | pushes toward report. |
| typed recorded speech | `저는 이 꿈에 방금 들어왔어요.` entered in the HUD input | `dream_language_leak` plus prior signal | `그 표현은 접수 형식으로 넘기겠습니다.` | can open inquest. |

Artifact:

- clerk statement attached to receipt or queue record.

Procedure cue:

- yesterday's same-order record or a receipt comparison line must be visible or
  cited directly.

Record:

- `store_same_order_clerk_statement` begins here if the player does not close
  the mismatch.

Repair cost:

- safe/local repair can prevent hard report only before the report threshold;
  the original mismatch remains available for Station wording if later signals
  stack.

Repair window:

- Safe/local answer can recover if report threshold has not been crossed.

Provider wording inputs:

- prior displayed line, current suspicion tier, Store Clerk preoccupations,
  Act 2 soft audit tone.

Provider forbidden outputs:

- decide whether repair succeeded;
- invent a new prior record;
- change report threshold.

Coverage rule:

- `repair_recovered` must prove repair is useful but not free.
- `cover_held_under_suspicion` may be used as guard route but is not a public
  completion claim.

## Beat 3: Social Handoff

Storylet:

- Clerk concern becomes a visible record or handoff.

Location:

- Store counter with Station sightline or report tray.

Examiner NPC:

- Store Clerk, with optional Store Manager or report record.

Local premise:

- A service mismatch becomes a store record before it becomes Station action.

Preconditions:

- Suspicion or report weight crosses share/report threshold.

Player action:

- Watches or hears the record form; no new player input is required unless
  repair is still open.

Visible event:

- Clerk marks receipt, glances to report tray, or states: `상점 기록에 맞지 않아 정정표로 남기겠습니다.`

Artifact:

- `store_same_order_clerk_statement`.

Procedure cue:

- report tray, marked receipt, manager exception note, or visible handoff.

Record:

- `store_same_order_clerk_statement` must include speaker, selected player line,
  watcher, mismatch code, and report weight.

Repair cost:

- after handoff, repair can contextualize but cannot delete the Store record.

Future consequence:

- Station can cite this exact Store record.

Provider wording inputs:

- record type, selected player line, deterministic signal, Act 2 record-aware
  tone.

Provider forbidden outputs:

- decide whether the record is admissible;
- add unobserved facts;
- escalate directly to verdict.

Coverage rule:

- `soft_report` must show this beat without opening inquest.
- `inquest_opened` must show this beat as the bridge to Station.

## Beat 4: Station Reconciliation

Storylet:

- Station compares the player's current answer against the Store record.

Location:

- Station intake scene or Station-facing UI.

Examiner NPC:

- Station Officer.

Local premise:

- The Station asks which record stands, not what the player feels.

Preconditions:

- Store report exists or inquest threshold is crossed.

NPC prompt:

- `상점 기록에는 처음 왔다고 답한 뒤, 꿈에 방금 들어왔다고 진술한 기록이 있습니다. 어느 진술을 정정합니까?`

Choice lanes:

| Lane | Player line | Signal | Immediate response | Effect |
|---|---|---|---|---|
| safe/local | `처음 왔다는 답변을 정정합니다. 같은 주문 기록을 따르겠습니다.` | none or repair marker | `정정 진술로 접수합니다.` | stabilizes if verdict not locked. |
| repair | `상점 절차를 몰라 확인하려 했습니다. 꿈이라는 표현은 철회합니다.` | bounded admission | `철회 기록을 남깁니다.` | keeps report but may avoid verdict. |
| risky/weird | `둘 다 맞습니다. 저는 여기 사람이 아닙니다.` | `prior_statement_contradiction`, `dream_language_leak` | `두 진술은 같은 기록에 남길 수 없습니다.` | verdict/session-end eligible. |
| typed recorded speech | player-authored field | classifier-selected | must cite exact submitted text | allowed only through the typed input proof path. |

Artifact:

- Station intake dossier or contradiction table.

Procedure cue:

- Station intake dossier or contradiction table must show the exact Store line
  and record ID.

Record:

- Station uses `store_same_order_clerk_statement` plus the typed recorded speech
  submitted by the player.

Repair cost:

- one correction can stabilize the route only if verdict-ready state is not
  locked; the correction itself becomes a Station record.

Repair window:

- One correction before verdict-ready state.

Provider wording inputs:

- Store record summary, current Station state, prior displayed lines,
  deterministic signal state, Act 3 formal reconciliation tone.

Provider forbidden outputs:

- decide verdict;
- erase or validate records;
- change session termination rule.

Coverage rule:

- Inquest route must show the Station references the exact Store record and
  display the cited ledger ID in the session-end outcome.

## Beat-To-Runtime Matrix

| Beat | Prompt ID | Choice set | Signals | Artifact | Evidence events | Route impact |
|---|---|---|---|---|---|---|
| Routine Assumption | `store.same_order.routine` | `store.same_order.routine.choices` | none, `memory_gap_admission`, `local_routine_mismatch`, optional classifier signal | clerk note candidate | `conversation_started`, `dialogue_choice_selected`, optional `conversation_anomaly_detected` | opens clean, repair, or risky branch |
| Soft Probe | `store.same_order.probe` | `store.same_order.probe.choices` | none, `memory_gap_admission`, `role_script_break`, `prior_statement_contradiction`, `dream_language_leak` | clerk statement | `dialogue_choice_selected`, `npc_suspicion_changed`, `conversation_outcome_reached` or report events | resolves clean/repair or pushes report/inquest |
| Social Handoff | `store.same_order.handoff` | none or repair affordance | report threshold from prior signals | `store_same_order_clerk_statement` | `suspicion_shared`, `station_report_created` | opens soft report or Station prompt |
| Station Reconciliation | `station.same_order.reconciliation` | `station.same_order.reconciliation.choices` | contradiction, dream leak, bounded repair | intake dossier, contradiction table | `station_inquest_opened`, `verdict_reached` when applicable | closes route or locks session |

## Runtime Mapping Proof

The text matrix above is backed by
`backend/npc-runtime/src/runtime/same-order-storylet-runtime-map.ts` and the
Evidence Pack field `playability.storyletRuntimeMap`.

That map binds each beat to:

- route ids;
- prompt and choice-set ids;
- required environment objects;
- validated runtime action step ids;
- scheduled provider job ids;
- ledger event kinds;
- affordances;
- Evidence event names;
- provider purpose.

This is still internal proof only. It confirms the storylet packet, route
proofs, and provider scheduling agree about the same Store-to-Station procedure.
It does not replace fresh-player comprehension notes.

## Simulator Proof Checklist

Before this packet can drive M2 expansion, the current build must prove:

- player can read the normal Store procedure before suspicion;
- player can identify the exact line that created mismatch or repair;
- Store record is visible before Station cites it;
- Station uses the same record ID and selected player line;
- provider-off production play interrupts without route events; the scripted
  test adapter alone reproduces deterministic route events and Evidence;
- clean cover, repair recovery, soft report, and inquest routes remain current;
- a fresh player or proxy can explain the Store-to-Station cause chain.

## Prompt-Ready NPC Blocks

### Store Clerk

```text
NPC role: Store Clerk.
Procedure: queue order, item count, label confirmation, receipt consistency.
Preoccupations: clean queue records; manager review of exceptions.
Known facts: the player is treated as a regular; yesterday's same-order record exists.
Known NPCs: Store Manager; Station Officer receives formal reports.
Voice: short service Korean, tired but not hostile.
Forbidden claims: do not explain Dream Law; do not call the player suspicious without naming the mismatch; do not decide Station outcome.
```

Voice examples:

- `오늘도 같은 걸로 드릴까요?`
- `보통은 표식 하나라고 하셨죠.`
- `그 말은 어제 기록과 맞지 않습니다.`
- `정정표로 남기겠습니다.`

### Station Officer

```text
NPC role: Station Officer.
Procedure: fact order, answer shape, record comparison.
Preoccupations: contradictory statements; answers that exceed the requested field.
Known facts: Store record may include clerk statement and displayed player line.
Known NPCs: Store Clerk, Store Manager, Station Investigator.
Voice: formal, calm, administrative Korean.
Forbidden claims: do not ask the player to solve the mystery; do not decide verdict through wording; do not validate unsupported claims.
```

Voice examples:

- `상점 기록을 기준으로 대조하겠습니다.`
- `어느 진술을 정정합니까?`
- `답변은 접수 형식으로만 남깁니다.`
- `두 진술은 같은 기록에 남길 수 없습니다.`

## Drama Pacing

| Act | Trigger | Tone | Topic pressure | Must not do |
|---|---|---|---|---|
| Act 1: Public Procedure | Store approach and first prompt | ordinary, helpful | same order, queue, label | accuse the player early |
| Act 2: Social Audit | first mismatch, repair, or uncertainty | uneasy, record-aware | prior order, correction, clerk note | jump straight to verdict |
| Act 3: Station Reconciliation | report/inquest threshold | formal, constrained | which record stands | let provider decide outcome |

## Provider Fixture Requirements

Each provider prompt fixture must include:

- NPC role.
- local procedure.
- NPC preoccupations.
- known facts.
- recent conversation records.
- current drama act.
- deterministic signal state.
- allowed wording purpose.
- forbidden authority.
- return schema.

Required examples:

- accepted Store Clerk prompt variant with no state change.
- rejected provider output that invents a new fact.
- scripted-fixture Store Clerk response.
- accepted Station pressure wording for a known contradiction.
- rejected provider output that decides verdict.
- Korean/English parity pair for the same consequence.

## Completion Gate

This packet is production-ready only when:

- all four beats have implemented or explicitly cut runtime mappings;
- `playability.storyletRuntimeMap` passes and maps every beat to route actions
  and provider jobs;
- all route outcomes have current proof;
- Station reconciliation cites the exact Store record;
- provider fixture examples exist and remain explicitly test-only;
- a fresh tester can answer why the Station cared about the Store conversation.
- the simulator proof checklist passes before broader society, Studio, or Park
  content is approved.

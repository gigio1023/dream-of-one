# Conversation Suspicion Prologue

Status: active first playable scenario; internally route-proven; product closure pending
Depends on: `docs/archive/v1-direction/08-conversation-suspicion-redesign.md`,
`docs/archive/v1-direction/09-game-design-spine.md`, and
`docs/scenario/content/social-simulation-cards.md`

## Working Title

Same Order

## Proof Question

Can one short NPC conversation make a player understand that sounding socially
wrong creates suspicion, reports, Station pressure, and deterministic
consequence?

## Player Situation

The player enters a familiar civic route but does not know the routine. The
Store Clerk assumes the player is a regular. The player must answer ordinary
questions without revealing that they do not belong.

The player is not investigating. The player is being socially checked.

## Cast

| Actor | Role | Function |
| --- | --- | --- |
| `NPC_Store_Clerk` | Clerk | Starts with normal routine, then grows uneasy. |
| `NPC_Store_Manager` | Manager | Turns visible Store burden into a follow-up note or forwarded report. |
| `NPC_Park_Witness` | Nearby witness | Can receive or overhear the clerk's concern. |
| `NPC_Station_Officer` | Officer | Formalizes a report into intake/inquest. |
| Player | Suspect outsider | Must pass through conversation pressure. |

## Conversation Beat

### Beat 1: Routine Assumption

NPC prompt:

> 오늘도 같은 걸로 드릴까요?

Choices:

| Choice | Player line | Internal intent | Expected signal |
| --- | --- | --- | --- |
| `store.same_order.safe` | 네, 같은 걸로 부탁해요. | safe/local | none |
| `store.same_order.repair` | 제가 보통 뭘 시켰죠? | uncertain/repair | `memory_gap_admission` |
| `store.same_order.risky` | 오늘 처음 왔는데요. | risky/weird | `local_routine_mismatch` |

Optional free input:

- Available as "기록될 말을 직접 입력".
- Any explicit dream/world/meta language triggers `dream_language_leak`.
- Ambiguous free input should not be punished harder than authored risky
  choices unless deterministic signals fire.

### Beat 2: Soft Probe

If safe:

> 네. 표식 하나, 같은 봉투로 처리하겠습니다.

If repair:

> 보통은 표식 하나라고 하셨죠. 오늘은 왜 확인하시나요?

If risky:

> 처음이라고요? 어제도 같은 자리에서 같은 말을 하셨는데요.

Choices for the probe should test whether the player can recover:

- safe: accept the clerk's premise.
- repair: give a bounded excuse.
- risky: insist on outsider truth or over-explain.

### Beat 3: Social Share Or Report

When suspicion reaches the share threshold, the clerk creates a social record:

> 손님 말이 어제 기록이랑 맞지 않습니다.

The witness or Station route receives the report. This should be visible as a
diegetic handoff, not only a meter.

### Beat 4: Station Intake

The Station Officer references prior conversation:

> 상점 기록에 따르면 본인이 처음 왔다고 말했습니다. 어느 구역 절차로 오셨습니까?

The answer is compared against the prior Store turn. The player gets one repair
chance before inquest or soft outcome.

## Deterministic Outcomes

| Outcome | Condition | Player-facing result |
| --- | --- | --- |
| `cover_held` | No serious signal, or repair succeeds before share. | Clerk accepts routine. No Station intake. |
| `soft_report` | One report exists but contradiction threshold is not met. | Report filed. Continued play after report is not demo-complete until Godot continuation is proven. |
| `inquest_opened` | Repeated mismatch, dream leak, or contradiction with prior record. | Station opens formal questioning. |

Current internal proof routes:

| Route | Path | Outcome |
| --- | --- | --- |
| `clean_cover` | Safe routine answer, then safe probe answer. | `cover_held` with no suspicion or report. |
| `repair_recovered` | Memory-gap repair, then accepts the clerk's premise. | `cover_held` with bounded unease. |
| `soft_report` | Routine mismatch, then outsider insistence. | `soft_report` with Station report but no inquest. |
| `inquest_opened` | Routine mismatch, then preset recorded dream statement. | `inquest_opened`. |

## Evidence Requirements

Every run must produce:

- `conversation_started`
- `dialogue_choice_selected` or `free_input_submitted`
- `conversation_anomaly_detected` when a signal fires
- `npc_suspicion_changed`
- `suspicion_shared` or `station_report_created` when social propagation fires
- `station_inquest_opened` or outcome equivalent
- `evidence_pack_created`

Every conversation event must include:

- `conversationId`
- `turnId`
- `promptId`
- `choiceSetId`
- `selectedChoiceId` or `freeInputHash`
- displayed player line
- `suspicionSignals`
- suspicion/report before and after
- why-line text

## UI Requirements

- NPC line is the dominant text.
- Three choices are visually grouped as playable speech.
- Optional free input is secondary and clearly framed as recorded speech.
- The player sees the exact line that sounded strange after a consequence.
- NPC suspicion is shown through reaction copy and handoff, not only a meter.
- Station intake references the earlier conversation record.

## First Playable Cut Rules

- Cut Studio and Park as explorable locations before cutting the Store
  conversation.
- Cut live API provider before cutting deterministic fallback playability.
- Cut free input before cutting three-choice conversation.
- Cut visual polish before cutting NPC reaction readability.
- Cut verdict ending before cutting report/inquest handoff.

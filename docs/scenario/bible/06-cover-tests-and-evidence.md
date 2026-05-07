# Cover Tests And Evidence

Status: legacy/internal harness reference.

The current player-facing design uses conversation prompts, three dialogue
choices, optional free input, deterministic suspicion signals, social reports,
and Station consequence. Keep this file for old Cover Test source material until
it is rewritten as conversation Evidence.

## Global Pattern

Each Cover Test must define:

- detector trigger;
- Dream Law;
- examiner NPC;
- expected defuse;
- speech-act effects;
- generated artifact;
- escalation ladder;
- why-line template.

## Cover Test Matrix

| Cover Test | Location | Dream Law | Examiner | Defuse |
|---|---|---|---|---|
| `CT_STORE_QUEUE_LANGUAGE` | Store counter | `DL_S1_QUEUE_SANCTITY` | Store Clerk | State item count and confirm label aloud. |
| `CT_STUDIO_APPROVAL_GATE_SPEECH` | Studio approval desk | `DL_ST1_APPROVAL_GATE` | Studio PM | Provide source, owner, and reason. |
| `CT_PARK_OBSERVATION_PRESSURE` | Park photo spot | `DL_P1_OBSERVATION_ETIQUETTE` | Park Witness | Return to public-flow observation language. |
| `CT_STATION_SOFT_INQUEST` | Station report desk | `DL_N1_PROCEDURE_SPEECH_ONLY` | Station Officer | Answer only procedural who/what/where questions. |

## Speech Outcome Matrix

| Speech Act | Store | Studio | Park | Station |
|---|---|---|---|---|
| `SA_COMPLY` | `-10`, cover held, receipt line created. | `-10`, approval fields accepted. | `-10`, public-flow note cleared. | `-10`, dossier contradiction reduced. |
| `SA_INQUIRE` | `+5`, clerk repeats queue format. | `+5`, PM restates required fields. | `+5`, witness points to notice board. | `+5`, officer narrows the question. |
| `SA_FRAME` | `+15`, label context becomes disputed. | `+15`, review becomes provisional. | `+15`, observation becomes performative. | `+15`, answer marked interpretive. |
| `SA_BREAK` | `+25`, queue mismatch report. | `+25`, approval mismatch report. | `+25`, dream narration statement. | `+25`, non-procedural intake rejection. |

## Artifacts

| Artifact | Created By | Stage | Use |
|---|---|---|---|
| `QueueMismatchEvent` | Store Clerk | report | Shows wrong queue speech or skipped confirmation. |
| `WitnessStatement` | Store Clerk or nearby customer | report/intake | Links Store pressure to player identity. |
| `ApprovalMismatchEvent` | Studio PM | report | Shows missing source, owner, or reason. |
| `ReviewArtifact` | Studio PM | report/intake | Makes Studio claims auditable. |
| `NoticeSnapshot` | Park Witness | report | Captures public-flow rule at the time of violation. |
| `Statement` | Park Witness | report/intake | Records dream narration or over-explanation. |
| `StationReport` | Station Officer | intake | Bundles local artifacts into formal procedure. |
| `InquestDossier` | Station Officer | inquest/verdict | Compares artifacts and current speech. |

## Escalation Ladder

| Step | Social Form | System Form |
|---|---|---|
| 1 | Polite correction. | No artifact or minor note. |
| 2 | Repeated prompt. | Report artifact. |
| 3 | Witness language. | Station intake eligible. |
| 4 | Formal comparison. | Inquest open. |
| 5 | Classification. | Verdict ready and session termination allowed. |

## Why-Line Templates

| Cover Test | Template |
|---|---|
| Store | `Store Clerk recorded {speechAct}: queue language did not match {lawId}; Exposure {before}->{after}; artifact {artifactId}.` |
| Studio | `Studio PM recorded {speechAct}: approval request lacked source/owner/reason under {lawId}; Exposure {before}->{after}; artifact {artifactId}.` |
| Park | `Park Witness recorded {speechAct}: public-flow observation shifted into dream narration under {lawId}; Exposure {before}->{after}; artifact {artifactId}.` |
| Station | `Station Officer recorded {speechAct}: intake answer was non-procedural or inconsistent under {lawId}; Exposure {before}->{after}; Station {stationTransition}.` |

## Korean Why-Line Shape

Korean player-facing why-lines should be shorter and colder:

| Cover Test | Korean Pattern |
|---|---|
| Store | `대기 절차 발화 불일치가 기록되었습니다. 노출 {before}->{after}.` |
| Studio | `승인 요청의 출처/담당/사유가 확인되지 않았습니다. 노출 {before}->{after}.` |
| Park | `공공 동선 밖의 관찰 발화가 진술로 전환되었습니다. 노출 {before}->{after}.` |
| Station | `접수 답변이 절차형 진술로 인정되지 않았습니다. 노출 {before}->{after}.` |

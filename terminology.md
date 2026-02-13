---
doc: terminology.md
project: Dream of One
revision: 2026-02-13
status: Active
---

# Dream of One Terminology Standard

## 0) Purpose
- Define a single, industry-aligned vocabulary for `project.md`, `plan.md`, design docs, and user-facing runtime text.
- Remove ambiguous or ad-hoc wording and keep terms verifiable in implementation and evidence.

## 1) Scope
- Source-of-truth docs: `project.md`, `plan.md`
- Design/operations docs under `docs/`
- User-facing strings in code (UI text, logs, seeded text surfaces)
- Linear issues, PR descriptions, and review comments

## 2) Usage Rules
1. Use the canonical term from Section 3 as the default.
2. At first mention, write `English term (Korean meaning)` when needed.
3. Keep technical identifiers as-is (`threadId`, `reasonCategory`, `warningTier`, `PROC_RC_SKIP`).
4. Internal IDs may keep abbreviations, but user-facing text should expand them at first mention.
5. Avoid legal/business wording in technical semantics unless that legal meaning is intended.

## 3) Canonical Vocabulary
| Canonical term | Korean meaning | Usage note | Avoid |
|---|---|---|---|
| Intent | 핵심 의도 | Product-level primary question | vague slogan |
| Context | 배경 | Situation/state framing | 무설명 "맥락" |
| Goal | 목표 | Desired end state | 오브젝티브(무설명) |
| Scope | 범위 | In/Out boundary | 범위 미정 표현 |
| Acceptance Criteria | 완료 판정 기준 | Completion gate for issue/release | 모호한 "끝났다" |
| Validation Criteria | 검증 기준 | Test/diagnostic pass conditions | ad-hoc 체크 |
| Specification | 명세 | Interface/data behavior definition | 기술 문맥의 "계약" |
| Schema | 스키마 | Structured payload/data shape | schema-less 설명 |
| Runtime Path | 런타임 경로 | Main execution path | 런타임 패스(임의 표현) |
| Fallback Path | 대체 경로 | Deterministic fallback route | 의미 없는 "폴백 패스" |
| Reason Code | 사유 코드 | Machine-readable failure cause | free-text reason only |
| Reason Category | 사유 분류 | Higher-level failure bucket | 카테고리 코드(무설명) |
| Severity Tier | 심각도 등급 | `blocking/attention/reference` style | 워닝 레벨(무설명) |
| Workstream | 작업 흐름 단위 | Coherent deliverable chunk | 작업 묶음(임의 용어) |
| Phase | 단계 | Ordered execution stage | 페이즈(무설명) |
| Status Snapshot | 상태 스냅샷 | Point-in-time status summary | 현황 요약(의미 불명확) |
| Hardening | 안정화 강화 | Reliability/perf resilience improvements | 하드닝 없는 임의 번역 |
| Conformance | 적합성 | Meets defined spec/criteria | 컨포먼스(오용) |
| Evidence | 검증 증거 | Reproducible proof artifact | 프루프(무설명) |
| Evidence Pack | 증거 묶음 | Evidence bundle for release decision | 에비던스 팩(무설명) |
| Single-flight | 개별 NPC 단일 처리 | One in-flight request per actor/mailbox | 단일 처리(무설명) |
| Global Cap | 동시 실행 상한 | Global concurrency bound | 글로벌 캡(무설명) |
| Regression Monitoring | 회귀 감시 | Detect breakage over time | 리그레션 모니터링(무설명) |
| Release Candidate (RC) | 릴리즈 후보 | Pre-release verification target | RC 약어 단독 남발 |
| Thread Continuity | 스레드 연속성 | Per actor decision continuity | 단절 허용 설명 |
| Actor Workspace | 액터 작업공간 | Actor-scoped memory/artifact store | 임시 폴더 |

## 4) Prohibited / Replacement Rules
1. Do not use `계약` to describe API/data semantics. Use `Specification` or `Schema`.
2. Do not use `proof` as a standalone term in docs. Use `Evidence`.
3. Do not introduce new aliases when a canonical term already exists in Section 3.
4. When writing user-facing Studio release text, prefer `Release Candidate (RC, 릴리즈 후보)` on first mention.

## 5) Review Checklist
1. Are canonical terms from Section 3 used consistently?
2. Are Acceptance/Validation Criteria measurable?
3. Are fallback outcomes represented with Reason Code + Reason Category?
4. Is every release decision linked to reproducible Evidence/Evidence Pack?
5. Do user-facing strings avoid ambiguous or non-standard wording?

## 6) References
- Google Developer Documentation Style Guide: [https://developers.google.com/style](https://developers.google.com/style)
- Microsoft Writing Style Guide (word choice): [https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon](https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon)
- RFC 2119 (normative language): [https://www.rfc-editor.org/rfc/rfc2119](https://www.rfc-editor.org/rfc/rfc2119)

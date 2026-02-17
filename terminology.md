---
doc: terminology.md
project: Dream of One
revision: 2026-02-17
status: Active
---

# Dream of One Terminology Standard

## 0) Purpose
- Define a single, industry-aligned vocabulary for `project.md`, design docs, Linear issue text, and user-facing runtime text.
- Remove ambiguous wording and keep terms traceable to implementation and Evidence.

## 1) Scope
- Source-of-Truth artifacts: `project.md` and Linear issues.
- Design and operations docs under `docs/`.
- User-facing strings in code (UI text, logs, seeded text surfaces).
- PR descriptions and review comments.

## 2) Usage Rules
1. Use the canonical term from Section 3 by default.
2. Expand abbreviations on first mention, for example `Release Candidate (RC)`.
3. Keep technical identifiers as-is (`threadId`, `reasonCategory`, `warningTier`, `PROC_RC_SKIP`).
4. Internal IDs can stay abbreviated, but user-facing text should prioritize explicit terminology.
5. Avoid legal or business wording in technical API/data semantics.
6. For Mineflayer events/actions, use exact API names (`login`, `spawn`, `blockUpdate`, `entitySpawn`, `bot.dig`, `bot.placeBlock`) instead of local aliases.

## 3) Canonical Vocabulary
| Canonical Term | Definition | Usage Guidance | Avoid |
|---|---|---|---|
| Intent | Product-level primary question | Use for top-level product direction | vague slogan |
| Context | Situation and baseline state | Use for problem framing | unbounded narrative context |
| Goal | Desired end state | Use for target outcomes | unlabeled objective language |
| Scope | In/Out boundary | Use for explicit inclusion/exclusion | undefined boundaries |
| Acceptance Criteria | Completion gate for issue/release | Use for measurable completion decisions | subjective “done” wording |
| Validation Criteria | Test/diagnostic pass conditions | Use for verification gates | ad-hoc checks |
| Specification | Interface/data behavior definition | Use for behavior contracts and rules | generic “contract” wording |
| Schema | Structured payload/data shape | Use for serialized structures | schema-less descriptions |
| Mineflayer Bot | Runtime client controlled through Mineflayer API | Use for NPC runtime agents in Minecraft sessions | generic “actor” when bot context is intended |
| Minecraft Server | Authoritative game-state host | Use for world-state authority and rule enforcement | vague engine authority wording |
| Bot Lifecycle Event | Session-state events such as `login`, `spawn`, `respawn`, `end` | Use for readiness and reconnect semantics | custom lifecycle aliases |
| World Event | World/block/entity events such as `blockUpdate`, `entitySpawn`, `diggingCompleted` | Use for mutation evidence and observation | unqualified “state delta” without event anchor |
| Bot Command | Direct Mineflayer API call (for example `bot.dig`, `bot.placeBlock`, `bot.activateBlock`) | Use for executable action semantics | abstract “intent command” without API mapping |
| Action Queue | Per-bot queue that allows one in-flight world mutation action | Use for per-bot concurrency control | mailbox wording without queue semantics |
| Global Concurrency Limit | Upper bound across all bots for critical actions | Use for multi-bot safety limits | unlabeled global cap wording |
| Runtime Path | Primary execution path | Use for main runtime flow | ad-hoc runtime phrasing |
| Fallback Path | Deterministic fallback route | Use for safety execution path | vague fallback phrasing |
| Reason Code | Machine-readable failure cause | Use for deterministic failure labels | free-text reason only |
| Reason Category | Higher-level failure bucket | Use for grouped failure analysis | unlabeled categories |
| Severity Tier | Severity grouping (`blocking/attention/reference`) | Use for warning/error prioritization | unqualified warning levels |
| Workstream | Coherent deliverable chunk | Use for grouped execution units | arbitrary work bundle terms |
| Phase | Ordered execution stage | Use for stage sequencing | unlabeled phase labels |
| Status Snapshot | Point-in-time status summary | Use for dated status checkpoints | generic status summary |
| Hardening | Reliability and resilience improvements | Use for stability-focused work | vague stabilization wording |
| Conformance | Meets defined Specification/Schema | Use for compliance checks | ambiguous conformance wording |
| Evidence | Reproducible validation artifact | Use for concrete proof outputs | raw “proof” wording |
| Evidence Pack | Evidence bundle for release decision | Use for release validation grouping | unqualified artifact bundle |
| Single-flight | One in-flight action per bot queue | Use as shorthand for per-bot action queue limits | ambiguous single processing wording |
| Global Cap | Legacy alias of Global Concurrency Limit | Keep only when matching existing code/metrics names | introducing as primary end-user term |
| Regression Monitoring | Detection of behavior breakage over time | Use for trend/regression tracking | undefined regression checks |
| Release Candidate (RC) | Pre-release validation target | Use for final verification builds | RC abbreviation without expansion |
| Session Continuity | Continuity of bot state across lifecycle/reconnect flows | Use for `sessionId+npcId` continuity guarantees | vague thread wording without lifecycle context |
| Thread Continuity | Internal continuity of backend conversation thread identifiers | Use when referencing `threadId` storage behavior | using as generic session term |
| Actor Workspace | Persistent bot workspace data (`persona/policy/memory/summary/thread`) | Use for per-bot runtime memory artifacts | generic temp folder wording |

## 4) Prohibited and Replacement Rules
1. Do not use informal `contract` wording for API/data semantics; use `Specification` or `Schema`.
2. Do not use `proof` as a standalone release term; use `Evidence`.
3. Do not introduce new aliases when a canonical term already exists in Section 3.
4. In release-facing text, expand `Release Candidate (RC)` on first mention.
5. Do not use custom event/action aliases when an official Mineflayer API/event name exists.

## 5) Review Checklist
1. Are canonical terms from Section 3 used consistently?
2. Are Acceptance Criteria and Validation Criteria measurable?
3. Are fallback outcomes represented with Reason Code and Reason Category?
4. Is every release decision linked to reproducible Evidence or an Evidence Pack?
5. Do user-facing strings avoid ambiguous or non-standard wording?

## 6) References
- Google Developer Documentation Style Guide: [https://developers.google.com/style](https://developers.google.com/style)
- Microsoft Writing Style Guide (word choice): [https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon](https://learn.microsoft.com/en-us/style-guide/word-choice/avoid-jargon)
- RFC 2119 (normative language): [https://www.rfc-editor.org/rfc/rfc2119](https://www.rfc-editor.org/rfc/rfc2119)

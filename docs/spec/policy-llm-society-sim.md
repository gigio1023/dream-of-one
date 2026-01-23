# Dream of One — Policy-Driven LLM Society Simulation (Design + Implementation Plan)

Revision date: 2026-01-23  
Status: Draft (implementation started)  
Primary scene: `draem-of-one/Assets/Scenes/Prototype.unity`

## 1) Problem Statement
We want the world to behave like a society: organizations operate, members perform work, and decisions respond to observations. We do **not** want to hardcode every scenario. Instead:
- Predefine a small set of **core policies**, **roles**, and **skills**.
- Let an LLM act as the **bounded decision-maker** (“brain”) that selects actions based on observations + memory.
- Keep the game stable by validating LLM outputs against policies and the world state.

This document defines what “policy” means in the game, how the LLM is used, and the exact implementation contract.

## 2) Definitions (what “policy” means here)
In this project, a “policy” is not only “do X / don’t do Y”. It is the system-level structure that makes a society *coherent*:

**Norms & procedures**
- Rule IDs (e.g., `R_QUEUE`) and procedural steps (e.g., `PROC_RC_SKIP`) that can be referenced by systems.

**Roles & responsibilities**
- Who is supposed to do what when observing specific events.

**Goals & tradeoffs**
- What each organization optimizes (order, throughput, quietness, compliance, evidence quality, etc.).

**Observation → response**
- Which observations should trigger action candidates (warn, report, collect evidence, escalate).

**Evidence & accountability**
- How claims become evidence, how evidence affects cases/verdicts, and how decisions are justified.

**Communication contract**
- What gets said, to whom, and in what channel (rumor vs official report vs status update).

**Budgets**
- Limits for action frequency, LLM calls, and memory size.

## 3) Non-Negotiables (stability rails)
To keep the simulation from becoming “LLM chaos”, we enforce:

1) **LLM proposes, engine disposes**
   - LLM produces a *structured plan* (JSON).
   - Engine validates the plan against policy/world constraints.
   - Engine executes deterministic “skills” that emit WEL events.

2) **LLM does not write truth directly**
   - LLM cannot directly append arbitrary events.
   - Only skill execution can write WEL events.

3) **Policy is enforceable**
   - Each role has a whitelist of skills.
   - Skills have preconditions (distance, target exists, required authority).
   - Violations produce explicit events and/or are rejected.

4) **Budget discipline**
   - Hard caps on decisions/minute per agent and global LLM calls/minute.
   - Graceful fallback when budget is exceeded or JSON is invalid.

## 4) Architecture (runtime loop)
For each agent (NPC):

1) Observe
   - Pull recent WEL events and/or nearby zone facts.
   - Extract a compact “observation set”.

2) Remember
   - Store observations in the agent’s personal memory:
     - Working (short-lived)
     - Episodic (summaries)
     - Relationship (trust/authority)
     - Task state (current intent, blockers)

3) Plan (LLM)
   - Provide: role + org + goals + allowed skills + memory summary + recent observations.
   - Ask for: JSON action plan (1–3 actions max).

4) Validate
   - Reject skills not allowed for this role.
   - Reject actions failing preconditions (no target, too far, not on NavMesh, etc.).
   - If invalid: fall back to deterministic default behavior.

5) Execute
   - Execute the first valid action via deterministic skill executors.
   - Emit WEL events for outcomes (utterance/report/evidence/etc.).

6) Broadcast
   - Results feed back into WEL + blackboards + gossip/report systems.

## 5) LLM Contract (strict JSON output)
The LLM is treated as an untrusted planner.

### 5.1 Output schema
The LLM must return a JSON object:

```json
{
  "intent": "short intent",
  "speak": "optional single-line utterance",
  "actions": [
    {
      "type": "SkillId",
      "targetId": "optional",
      "placeId": "optional",
      "zoneId": "optional",
      "ruleId": "optional"
    }
  ],
  "memoryWrite": "optional short memory summary"
}
```

Constraints:
- JSON only (no markdown, no commentary).
- `actions` length <= 3.
- Unknown fields are ignored.
- Invalid JSON triggers fallback.

### 5.2 Prompt structure (high-level)
Inputs include:
- Role + organization + goals
- Allowed skills (IDs + one-line description + preconditions summary)
- Current world facts (location, inside/outside, nearby zones)
- Observation set (recent events relevant to this agent)
- Memory summary (last N memories)

## 6) Data Model (core assets only, not combinatorial rules)
We avoid “every scenario policy”. We define minimal rails:

### 6.1 RoleDefinition (asset)
- `roleId`, `organizationId`
- `goalWeights` (list of key->weight)
- `allowedSkillIds` (whitelist)
- Optional “obligation triggers” (event types that should produce action candidates)

### 6.2 SkillDefinition (asset)
- `skillId`
- Parameters it expects (target/zone/rule)
- Preconditions summary (enforced by code)
- WEL events it may emit (via executor)

### 6.3 PolicyPack (asset)
- Bundle of roles and skills used by a scenario/slice.
- Used as the “policy library” for the runtime.

## 7) Implementation Plan (detailed)
This plan is intentionally staged: we build rails first, then add depth.

### Phase A — Policy rails + memory skeleton (2–4 days)
- Create `RoleDefinition` and `SkillDefinition` ScriptableObjects.
- Extend policy pack to reference roles/skills.
- Implement per-agent memory store (working + episodic).
- Implement observation collector (recent WEL + proximity filter).
- Implement JSON plan parser + strict validator.

**Done when**
- An agent can produce a plan (mock/fallback), validate it, execute a deterministic skill, and write WEL.

### Phase B — LLM action planning (3–7 days)
- Extend LLM client with “raw text” requests (not line-clamped).
- Add prompt builder for policy+role+memory+observations.
- Add execution budget per agent (cooldown) + global budget.

**Done when**
- With LLM enabled, at least one non-police role selects skills via JSON.
- With LLM disabled, deterministic fallback keeps the society loop alive.

### Phase C — Organization workflows (1–2 weeks)
- Convert hardcoded organization routines into “policy-driven task prompts”.
- Add role-specific skill sets for Store/Studio/Park/Police.
- Add minimal task state machine (in memory) for multi-step work.

**Done when**
- Organizations visibly “do work” driven by observation and memory (not just timers).

### Phase D — Evaluation + debugging harness (continuous)
- Log every plan request/response (sanitize secrets).
- Add “why did you do this?” debug overlay based on:
  - chosen intent
  - allowed skill list
  - observation subset used
  - validator accept/reject reasons

## 8) Risks and mitigations
**Risk: LLM produces invalid/unbounded output**
- Mitigation: strict JSON parsing + hard fallback + budgets.

**Risk: Society becomes noisy/unreadable**
- Mitigation: separate dialogue feed, throttle utterances, and keep canonical event lines short.

**Risk: Non-deterministic debugging**
- Mitigation: record prompts/responses and provide a replay harness for analysis.

## 9) Implementation status (what’s started)
Initial scaffolding has begun in codebase:
- Dialogue feed UI supports persistent text-first communication.
- Next step is to introduce policy assets + agent memory + action planning pipeline.


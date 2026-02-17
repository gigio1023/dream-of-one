---
doc: memory.md
project: Dream of One
revision: 2026-02-17
status: Active
---

# NPC Memory Specification (Minecraft Runtime)

## 0) Purpose
Define a game-oriented memory system for Mineflayer NPC society simulation.  
This is not a personal assistant memory model. The memory scope is NPC behavior continuity, social interpretation, and player suspicion tracking.

## 1) Design intent
- NPCs choose actions naturally from local world context and organization context.
- Runtime does not force a fixed internal thought sequence.
- The only mandatory directional bias is player suspicion handling.
- Memory should improve continuity, not script outcomes.

## 2) Memory layers
Each NPC has an isolated Actor Workspace under:
- `data/workspaces/<sessionId>/<npcId>/`

Persistent files:
- `MEMORY.md` (Long-term Facts): durable identity/social facts that should survive across many turns in the same session.
- `memory/YYYY-MM-DD.md` (Daily Log): append-only episodic runtime trace for the day.
- Existing JSON artifacts remain authoritative for runtime state transport:
  - `persona.json`, `policy.json`, `memory.json`, `summary.json`, `thread.json`

## 3) Write policy
### 3.1 Daily Log write (always on decision)
At each broker decision, append one section to `memory/YYYY-MM-DD.md` with:
- timestamp, `sessionId`, `landmarkId`
- `actionType`, `reasonCodes`, `transport`, `usedFallback`
- `reasonCategory`, `warningTier`, `socialLoopStage` (if present)
- nearby actor list, recent world events, summary line
- player suspicion-related signal snapshot when present

### 3.2 Long-term Facts promotion (selective)
Promote only durable and behavior-relevant facts to `MEMORY.md`:
- stable player suspicion trend/snapshot
- organization context identity (organization/role/unit/rank)
- suspicion-related Reason Code observations

Do not promote:
- transient one-off noise
- raw verbose event lists
- implementation secrets or credentials

## 4) Runtime integration points
- Broker write hook: `backend/npc-runtime/src/broker/codex-broker.ts`
  - `DefaultCodexBroker.recordWorkspace(...)`
  - builds `NpcMemoryWriteInput` and calls `workspaceStore.appendNpcMemory(...)`
- Storage implementation: `backend/npc-runtime/src/memory/actor-workspace-store.ts`
  - `FileActorWorkspaceStore.appendNpcMemory(...)`
  - `ensureLongTermMemoryFile(...)`
  - `appendDailyMemoryLog(...)`
  - `promoteDurableFacts(...)`

## 5) Behavior constraints
- Memory is evidence-oriented and deterministic to write.
- Memory is non-deterministic to use: Codex may interpret stored context differently per run.
- Runtime safety still relies on Schema validation and Fallback Path.
- Memory does not bypass bounded action policy.

## 6) Suspicion-first rule
The only hard gameplay memory bias:
- NPCs can accumulate and reference suspicion toward the player.
- This suspicion memory must be queryable from persisted files and visible in runtime Evidence.
- No mandatory fixed pipeline for NPC cognition beyond this rule.

## 7) Verification criteria
For any NPC/session run, verify:
1. `MEMORY.md` exists and has `## Long-term Facts`.
2. `memory/YYYY-MM-DD.md` exists and appends per decision.
3. Fallback decisions are also written to daily log.
4. Suspicion snapshot is persisted when `playerSignals` includes suspicion/risk/exposure fields.

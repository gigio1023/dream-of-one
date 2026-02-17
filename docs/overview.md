# Project Overview and Visual Guide

Revision date: 2026-02-17

This document is the shortest path to understand what this repository does, how Runtime Path works, and where each document belongs.

## 1) Project at a glance

Dream of One is a Minecraft social-stealth simulation:
- NPC society behavior is proposed by Codex.
- Runtime safety remains deterministic (Schema + Fallback Path).
- Mineflayer + TypeScript backend is the active Runtime Path.
- Unity is retained only as a deprecated rollback path (`docs/deprecated/unity/index.md`).

Canonical product definition:
- `project.md`

## 2) Runtime context visualization

```mermaid
flowchart LR
  Player["Player"] --> McServer["Minecraft Server"]
  McServer --> Bot["Mineflayer Bot"]
  Bot --> Adapter["Runtime Adapter"]
  Adapter --> Api["Decision API"]
  Api --> Service["Decision Service"]
  Service --> Broker["Codex Broker"]
  Broker --> Codex["Codex CLI"]
  Service --> Fallback["Deterministic Fallback Path"]
  Service --> MemoryWriter["NPC Memory Persistence Service"]
  MemoryWriter --> MemoryFiles["MEMORY.md + memory/YYYY-MM-DD.md"]
  Service --> Evidence["Telemetry + Evidence Pack"]
```

## 3) Runtime decision flow

```mermaid
sequenceDiagram
  autonumber
  participant Bot as Mineflayer Bot
  participant Api as Decision API
  participant Service as Decision Service
  participant Gate as Schema + Policy Gate
  participant Broker as Codex Broker
  participant Memory as Memory Persistence Service
  participant Evidence as Telemetry/Evidence

  Bot->>Api: PerceptionPacket
  Api->>Service: decide(packet)
  Service->>Gate: validate packet + policy
  alt valid Runtime Path
    Gate->>Broker: request intent
    Broker-->>Service: DecisionEnvelope
  else invalid/timeout/parse/tool
    Gate-->>Service: fallback reason
    Service->>Service: build fallback intent
  end
  Service->>Memory: persist workspace + memory files
  Service->>Evidence: emit decision/evidence record
  Service-->>Api: DecisionEnvelope
```

## 4) Documentation map visualization

```mermaid
flowchart TD
  Root["Start Here"] --> Product["project.md\n(Intent/Goals/Acceptance)"]
  Root --> Runtime["docs/dev.md\nRun/Validate/Evidence"]
  Root --> Ops["docs/agent/codex-cli-workflow.md\nCodex CLI operations"]
  Root --> Mine["docs/mineflayer/index.md\nMineflayer Specification set"]
  Root --> Design["docs/design/game-design.md\nWorld and social loop design"]
  Root --> Plan["plan.md\nMigration and workstream status"]
  Root --> Legacy["docs/deprecated/unity/index.md\nDeprecated Unity archive"]
```

## 5) Reading paths by purpose

| Purpose | Read in order |
|---|---|
| Understand product scope first | `project.md` -> `docs/design/game-design.md` -> `plan.md` |
| Run backend and validate runtime | `docs/dev.md` -> `README.md` quick start -> `docs/design/runtime-evidence.md` |
| Implement/modify Mineflayer behavior | `docs/mineflayer/index.md` -> `docs/mineflayer/spec/runtime.md` -> `docs/mineflayer/spec/action-api.md` -> `docs/mineflayer/guides/implementation.md` |
| Operate Codex workflow safely | `docs/agent/runbook.md` -> `docs/agent/codex-cli-workflow.md` |

## 6) Terminology and Source of Truth

- Work Source of Truth: Linear issues.
- Product Source of Truth: `project.md`.
- Canonical terminology: `terminology.md`.
- This overview summarizes and links; canonical rules stay in owner documents.

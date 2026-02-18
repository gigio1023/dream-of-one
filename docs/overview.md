# Project Overview and Visual Guide

Revision date: 2026-02-18

This document is the shortest path to understand what this repository does, how Runtime Path works, and where each document belongs.

## 1) Project at a glance

Dream of One is a Minecraft social-stealth simulation:
- NPC society behavior is proposed by Codex.
- Runtime safety remains deterministic (Schema + Fallback Path).
- Mineflayer + TypeScript backend is the active Runtime Path.
- Human player joins the same Minecraft Server session and is evaluated by NPC social process outputs.
- Unity is retained only as a deprecated rollback path (`docs/deprecated/unity/index.md`).

v0.1 status labels used across planning/release updates:
- `runtime-complete`
- `design-complete`
- `release-complete`

v0.1 scope split labels:
- `v0.1 mandatory`: required for the current playable slice release.
- `post-v0.1 backlog`: intentionally deferred expansion work.

Canonical product definition:
- `project.md`

## 1.1) Human player baseline

- The `Player` in architecture diagrams is a real human using Minecraft Java client.
- Connect the player to the same host/port used by Mineflayer Bot runtime (`NPC_RUNTIME_MINEFLAYER_HOST`, `NPC_RUNTIME_MINEFLAYER_PORT`).
- Scenario loop starts only after player join, because cover-work outcomes are evaluated from player utterances and interactions.

## 2) Runtime context visualization

```mermaid
flowchart LR
  Player["Player"] --> McServer["Minecraft Server"]
  McServer --> Bot["Mineflayer Bot"]
  Bot --> Adapter["Runtime Adapter"]
  Adapter --> Api["Decision API"]
  Api --> Service["Decision Service"]
  Service --> Broker["Codex Broker\n(prompt builder)"]
  Broker --> Codex["Codex CLI\n(stateless tool)"]
  Service --> Fallback["Deterministic Fallback Path"]
  Broker <-->|prompt context + updates| Workspace["Actor Workspace\n(persistent)"]
  Broker <-->|thread continuity| Thread["Thread Store\n(threadId)"]
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
  participant Workspace as Actor Workspace Store
  participant Thread as Thread Store
  participant Codex as Codex CLI (stateless tool)
  participant Evidence as Telemetry/Evidence

  Bot->>Api: PerceptionPacket
  Api->>Service: decide(packet)
  Service->>Gate: validate packet + policy
  Gate->>Broker: decide(packet)
  Broker->>Workspace: load(sessionId,npcId)
  Broker->>Thread: get(sessionId,npcId)
  Note over Broker,Codex: Broker builds prompt from packet + Actor Workspace. Codex CLI never reads/writes workspace files directly.
  alt Runtime Path (Codex)
    Broker->>Codex: execute (prompt)
    Codex-->>Broker: JSON intent + threadId
  else Fallback Path (deterministic)
    Broker-->>Broker: build fallback intent
  end
  Broker->>Thread: set(sessionId,npcId,threadId)
  Broker->>Workspace: save(sessionId,npcId,workspace update)
  Broker-->>Service: DecisionEnvelope
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
- Authority map: `docs/authority-map.md`.
- Canonical terminology: `terminology.md`.
- This overview summarizes and links; canonical rules stay in owner documents.

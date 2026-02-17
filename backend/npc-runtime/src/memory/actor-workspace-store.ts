import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface ActorMemoryEntry {
  timestamp: string;
  recentEvents: string[];
  actionType: string;
  reasonCodes: string[];
  usedFallback: boolean;
  transport: "codex" | "codex-reply" | "fallback";
}

export interface ActorWorkspaceArtifacts {
  persona: Record<string, unknown>;
  policy: Record<string, unknown>;
  memory: {
    entries: ActorMemoryEntry[];
    recentEvents: string[];
    lastReasonCodes: string[];
  };
  summary: {
    text: string;
    updatedAt: string;
  };
  thread: {
    threadId: string;
    transportHistory: Array<"codex" | "codex-reply" | "fallback">;
    updatedAt: string;
  };
}

export interface NpcMemoryWriteInput {
  timestamp: string;
  sessionId: string;
  npcId: string;
  landmarkId: string;
  actionType: string;
  reasonCodes: string[];
  usedFallback: boolean;
  transport: "codex" | "codex-reply" | "fallback";
  reasonCategory?: string;
  warningTier?: string;
  socialLoopStage?: string;
  summary: string;
  recentEvents: string[];
  nearbyActors: string[];
  playerSignals: Record<string, unknown>;
  organizationContext: Record<string, unknown>;
}

const EMPTY_WORKSPACE: ActorWorkspaceArtifacts = {
  persona: {},
  policy: {},
  memory: {
    entries: [],
    recentEvents: [],
    lastReasonCodes: [],
  },
  summary: {
    text: "",
    updatedAt: "",
  },
  thread: {
    threadId: "",
    transportHistory: [],
    updatedAt: "",
  },
};

export interface ActorWorkspaceStore {
  load(sessionId: string, npcId: string): ActorWorkspaceArtifacts;
  save(sessionId: string, npcId: string, workspace: ActorWorkspaceArtifacts): void;
  appendNpcMemory?(sessionId: string, npcId: string, input: NpcMemoryWriteInput): void;
}

export class InMemoryActorWorkspaceStore implements ActorWorkspaceStore {
  private readonly records = new Map<string, ActorWorkspaceArtifacts>();

  load(sessionId: string, npcId: string): ActorWorkspaceArtifacts {
    return cloneWorkspace(this.records.get(this.key(sessionId, npcId)) ?? EMPTY_WORKSPACE);
  }

  save(sessionId: string, npcId: string, workspace: ActorWorkspaceArtifacts): void {
    this.records.set(this.key(sessionId, npcId), cloneWorkspace(workspace));
  }

  private key(sessionId: string, npcId: string): string {
    return `${sessionId}:${npcId}`;
  }
}

export class FileActorWorkspaceStore implements ActorWorkspaceStore {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath);
    mkdirSync(this.rootPath, { recursive: true });
  }

  load(sessionId: string, npcId: string): ActorWorkspaceArtifacts {
    const actorPath = this.actorPath(sessionId, npcId);
    const workspace = cloneWorkspace(EMPTY_WORKSPACE);
    workspace.persona = this.readJson(actorPath, "persona.json", workspace.persona);
    workspace.policy = this.readJson(actorPath, "policy.json", workspace.policy);
    workspace.memory = this.readJson(actorPath, "memory.json", workspace.memory);
    workspace.summary = this.readJson(actorPath, "summary.json", workspace.summary);
    workspace.thread = this.readJson(actorPath, "thread.json", workspace.thread);
    return workspace;
  }

  save(sessionId: string, npcId: string, workspace: ActorWorkspaceArtifacts): void {
    const actorPath = this.actorPath(sessionId, npcId);
    mkdirSync(actorPath, { recursive: true });
    this.writeJson(actorPath, "persona.json", workspace.persona);
    this.writeJson(actorPath, "policy.json", workspace.policy);
    this.writeJson(actorPath, "memory.json", workspace.memory);
    this.writeJson(actorPath, "summary.json", workspace.summary);
    this.writeJson(actorPath, "thread.json", workspace.thread);
  }

  appendNpcMemory(sessionId: string, npcId: string, input: NpcMemoryWriteInput): void {
    const actorPath = this.actorPath(sessionId, npcId);
    mkdirSync(actorPath, { recursive: true });
    this.ensureLongTermMemoryFile(actorPath, input);
    this.appendDailyMemoryLog(actorPath, input);
    this.promoteDurableFacts(actorPath, input);
  }

  private readJson<T>(actorPath: string, fileName: string, fallback: T): T {
    const path = join(actorPath, fileName);
    if (!existsSync(path)) {
      return cloneValue(fallback);
    }

    const raw = readFileSync(path, "utf8").trim();
    if (!raw) {
      return cloneValue(fallback);
    }

    try {
      const parsed = JSON.parse(raw) as T;
      return cloneValue(parsed);
    } catch {
      return cloneValue(fallback);
    }
  }

  private writeJson(actorPath: string, fileName: string, value: unknown): void {
    const path = join(actorPath, fileName);
    const payload = JSON.stringify(value, null, 2);
    writeFileSync(path, payload, "utf8");
  }

  private actorPath(sessionId: string, npcId: string): string {
    return join(this.rootPath, sanitizeId(sessionId), sanitizeId(npcId));
  }

  private ensureLongTermMemoryFile(actorPath: string, input: NpcMemoryWriteInput): void {
    const memoryPath = join(actorPath, "MEMORY.md");
    if (existsSync(memoryPath)) {
      const current = readFileSync(memoryPath, "utf8");
      if (current.includes("## Long-term Facts")) {
        return;
      }
      const merged = current.trimEnd().length > 0
        ? `${current.trimEnd()}\n\n## Long-term Facts\n`
        : this.initialMemoryTemplate(input);
      writeFileSync(memoryPath, `${merged.endsWith("\n") ? merged : `${merged}\n`}`, "utf8");
      return;
    }
    writeFileSync(memoryPath, this.initialMemoryTemplate(input), "utf8");
  }

  private appendDailyMemoryLog(actorPath: string, input: NpcMemoryWriteInput): void {
    const date = input.timestamp.slice(0, 10);
    const memoryDir = join(actorPath, "memory");
    mkdirSync(memoryDir, { recursive: true });
    const dailyPath = join(memoryDir, `${date}.md`);
    const existing = existsSync(dailyPath) ? readFileSync(dailyPath, "utf8") : "";
    const header = existing.trim().length === 0
      ? `# NPC Daily Memory (${input.npcId}) - ${date}\n\n`
      : "";
    const suspicionSnapshot = this.suspicionSnapshot(input.playerSignals);
    const section = [
      `## ${input.timestamp}`,
      `- sessionId: ${input.sessionId}`,
      `- landmarkId: ${input.landmarkId}`,
      `- actionType: ${input.actionType}`,
      `- reasonCodes: ${this.formatList(input.reasonCodes)}`,
      `- transport: ${input.transport}`,
      `- usedFallback: ${input.usedFallback ? "true" : "false"}`,
      `- reasonCategory: ${input.reasonCategory ?? "none"}`,
      `- warningTier: ${input.warningTier ?? "reference"}`,
      `- socialLoopStage: ${input.socialLoopStage ?? "ambient"}`,
      `- suspicionSignals: ${suspicionSnapshot ?? "none"}`,
      `- nearbyActors: ${this.formatList(input.nearbyActors)}`,
      `- recentEvents: ${this.formatList(input.recentEvents)}`,
      `- summary: ${input.summary}`,
    ].join("\n");

    const payload = `${existing.trimEnd()}${existing.trimEnd().length > 0 ? "\n\n" : ""}${header}${section}\n`;
    writeFileSync(dailyPath, payload, "utf8");
  }

  private promoteDurableFacts(actorPath: string, input: NpcMemoryWriteInput): void {
    const memoryPath = join(actorPath, "MEMORY.md");
    const current = existsSync(memoryPath) ? readFileSync(memoryPath, "utf8") : this.initialMemoryTemplate(input);
    const durableFacts = this.buildDurableFacts(input);
    if (durableFacts.length === 0) {
      if (!existsSync(memoryPath)) {
        writeFileSync(memoryPath, current, "utf8");
      }
      return;
    }

    const additions = durableFacts
      .map(fact => `- [${input.timestamp}] ${fact}`)
      .filter(line => !current.includes(line));
    if (additions.length === 0) {
      return;
    }

    const next = `${current.trimEnd()}\n${additions.join("\n")}\n`;
    writeFileSync(memoryPath, next, "utf8");
  }

  private buildDurableFacts(input: NpcMemoryWriteInput): string[] {
    const facts: string[] = [];
    const suspiciousReasonCodes = input.reasonCodes.filter(code => this.isSuspicionReasonCode(code));
    if (suspiciousReasonCodes.length > 0) {
      facts.push(`Player suspicion-related Reason Codes: ${suspiciousReasonCodes.join(", ")}`);
    }

    const suspicion = this.suspicionSnapshot(input.playerSignals);
    if (suspicion) {
      facts.push(`Player suspicion snapshot: ${suspicion}`);
    }

    const orgSummary = this.organizationSnapshot(input.organizationContext);
    if (orgSummary) {
      facts.push(`Organization context reference: ${orgSummary}`);
    }

    return facts;
  }

  private isSuspicionReasonCode(reasonCode: string): boolean {
    const normalized = reasonCode.trim().toLowerCase();
    if (!normalized || normalized.startsWith("fallback:")) {
      return false;
    }
    return /(suspicion|suspect|risk|violation|incident|witness|escalation|investig|detain|alert|flag|trust)/.test(
      normalized,
    );
  }

  private suspicionSnapshot(playerSignals: Record<string, unknown>): string | undefined {
    const keys = [
      "suspicion",
      "playerSuspicion",
      "exposure",
      "risk",
      "playerRisk",
      "trust",
      "playerTrust",
      "threatLevel",
    ] as const;
    const parts: string[] = [];
    for (const key of keys) {
      const value = playerSignals[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        parts.push(`${key}=${value}`);
        continue;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        parts.push(`${key}=${value.trim()}`);
      }
    }
    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  private organizationSnapshot(context: Record<string, unknown>): string | undefined {
    const keys = ["organization", "org", "role", "unit", "rank"] as const;
    const parts: string[] = [];
    for (const key of keys) {
      const value = context[key];
      if (typeof value === "string" && value.trim().length > 0) {
        parts.push(`${key}=${value.trim()}`);
      }
    }
    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  private formatList(values: string[]): string {
    return values.length > 0 ? values.join(", ") : "none";
  }

  private initialMemoryTemplate(input: NpcMemoryWriteInput): string {
    const orgSummary = this.organizationSnapshot(input.organizationContext) ?? "unknown";
    return [
      `# MEMORY.md (${input.npcId})`,
      "",
      "## Identity",
      `- npcId: ${input.npcId}`,
      `- initialSessionId: ${input.sessionId}`,
      `- organizationContext: ${orgSummary}`,
      "",
      "## Simulation Memory Policy",
      "- This file keeps durable memory for the NPC.",
      "- Focus: natural social behavior with explicit suspicion tracking toward player actions.",
      "- Source of Truth is file persistence on disk.",
      "",
      "## Long-term Facts",
    ].join("\n");
  }
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function cloneWorkspace(workspace: ActorWorkspaceArtifacts): ActorWorkspaceArtifacts {
  return cloneValue(workspace);
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface ThreadStore {
  get(sessionId: string, npcId: string): string | undefined;
  set(sessionId: string, npcId: string, threadId: string): void;
}

interface SerializedThreadStore {
  version: 1;
  threads: Record<string, string>;
}

export class InMemoryThreadStore implements ThreadStore {
  private readonly threadIds = new Map<string, string>();

  get(sessionId: string, npcId: string): string | undefined {
    return this.threadIds.get(this.key(sessionId, npcId));
  }

  set(sessionId: string, npcId: string, threadId: string): void {
    this.threadIds.set(this.key(sessionId, npcId), threadId);
  }

  private key(sessionId: string, npcId: string): string {
    return `${sessionId}:${npcId}`;
  }
}

export class FileThreadStore implements ThreadStore {
  private readonly threadIds = new Map<string, string>();
  private readonly storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = resolve(storagePath);
    this.load();
  }

  get(sessionId: string, npcId: string): string | undefined {
    return this.threadIds.get(this.key(sessionId, npcId));
  }

  set(sessionId: string, npcId: string, threadId: string): void {
    const key = this.key(sessionId, npcId);
    if (this.threadIds.get(key) === threadId) {
      return;
    }

    this.threadIds.set(key, threadId);
    this.persist();
  }

  private load(): void {
    if (!existsSync(this.storagePath)) {
      this.persist();
      return;
    }

    const raw = readFileSync(this.storagePath, "utf8").trim();
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SerializedThreadStore>;
      if (parsed.version !== 1 || typeof parsed.threads !== "object" || !parsed.threads) {
        return;
      }

      for (const [key, value] of Object.entries(parsed.threads)) {
        if (typeof value === "string") {
          this.threadIds.set(key, value);
        }
      }
    } catch {
      this.threadIds.clear();
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.storagePath), { recursive: true });
    const payload: SerializedThreadStore = {
      version: 1,
      threads: Object.fromEntries(this.threadIds),
    };
    const tempPath = `${this.storagePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
    // Replace via rename so readers never see a partial write.
    renameSync(tempPath, this.storagePath);
  }

  private key(sessionId: string, npcId: string): string {
    return `${sessionId}:${npcId}`;
  }
}

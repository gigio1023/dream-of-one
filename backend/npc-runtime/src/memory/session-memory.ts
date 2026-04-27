export interface SessionMemoryRecord {
  sessionId: string;
  npcId: string;
  events: string[];
}

export interface SessionMemoryStore {
  upsert(record: SessionMemoryRecord): void;
  get(sessionId: string, npcId: string): SessionMemoryRecord | undefined;
}

export class InMemorySessionMemoryStore implements SessionMemoryStore {
  private readonly records = new Map<string, SessionMemoryRecord>();

  upsert(record: SessionMemoryRecord): void {
    this.records.set(this.key(record.sessionId, record.npcId), record);
  }

  get(sessionId: string, npcId: string): SessionMemoryRecord | undefined {
    return this.records.get(this.key(sessionId, npcId));
  }

  private key(sessionId: string, npcId: string): string {
    return `${sessionId}:${npcId}`;
  }
}

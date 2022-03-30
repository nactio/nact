export interface IPersistenceEngine {
  events(persistenceKey: string, offset: number, limit: number, tags: string[]): AsyncGenerator<PersistedEvent>;

  latestSnapshot(persistenceKey: string): Promise<PersistedSnapshot>;

  takeSnapshot(persistedSnapshot: PersistedSnapshot): Promise<void>;

  persist(persistedEvent: PersistedEvent): Promise<void>;
}

export interface PersistedSnapshot {
  data: any;
  sequenceNumber: number;
  key: string;
  createdAt: number;
}

export interface PersistedEvent {
  data: any;
  tags: string[];
  sequenceNumber: number;
  key: string;
  createdAt: number;
  isDeleted: boolean;
}

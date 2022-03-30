export interface IPersistenceEngine {
  events(persistenceKey: string, offset: number, limit?: number, tags?: string[]): AsyncGenerator<IPersistedEvent>;

  latestSnapshot(persistenceKey: string): Promise<IPersistedSnapshot>;

  takeSnapshot(persistedSnapshot: IPersistedSnapshot): Promise<void>;
  persist(persistedEvent: IPersistedEvent): Promise<void>;
}

export interface IPersistedSnapshot {
  data: any;
  sequenceNumber: number;
  createdAt: number;
  key: string;
}

export interface IPersistedEvent {
  data: any;
  tags: string[];
  sequenceNumber: number;
  key: string;
  createdAt: number;
  isDeleted: boolean;
}

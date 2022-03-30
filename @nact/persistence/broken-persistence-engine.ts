import { IPersistedEvent, IPersistedSnapshot, IPersistenceEngine } from "./persistence-engine";

export class BrokenPersistenceEngine implements IPersistenceEngine {
  events(_persistenceKey: string, _offset: number, _limit?: number, _tags?: string[]): AsyncGenerator<IPersistedEvent, any, unknown> {
    throw new Error('Elvis has left the building');
  }
  latestSnapshot(_persistenceKey: string): Promise<IPersistedSnapshot> {
    throw new Error('#latestSnapshot() is yet implemented');
  }
  takeSnapshot(_persistedSnapshot: IPersistedSnapshot): Promise<void> {
    throw new Error('#takeSnapshot() is yet implemented');
  }
  async persist(_persistedEvent: IPersistedEvent): Promise<void> {

  }
}
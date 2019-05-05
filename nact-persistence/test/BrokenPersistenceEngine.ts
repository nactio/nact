import { AbstractPersistenceEngine } from '../src/AbstractPersistenceEngine'
import { PersistedEvent } from '../src/PersistedEvent'
import { PersistedSnapshot } from '../src/PersistedSnapshot'

export class BrokenPersistenceEngine extends AbstractPersistenceEngine {
  public events(
    persistenceKey: string,
    offset: number,
    limit: number,
    tags: string[],
  ): Promise<PersistedEvent[]> {
    throw new Error('Elvis has left the building')
  }

  public latestSnapshot(persistenceKey: string): Promise<PersistedSnapshot> {
    throw new Error('#latestSnapshot() is yet implemented')
  }

  public async persist(
    persistedEvent: PersistedEvent,
  ): Promise<PersistedEvent> {
    return undefined
  }
}

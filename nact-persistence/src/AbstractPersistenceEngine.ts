import { PersistedEvent } from './PersistedEvent'
import { PersistedSnapshot } from './PersistedSnapshot'

export abstract class AbstractPersistenceEngine {
  public abstract events(
    persistenceKey: string,
    offset?: number,
    limit?: number,
    tags?: string[],
  ): Promise<PersistedEvent[]>

  public abstract latestSnapshot(
    persistenceKey: string,
  ): Promise<PersistedSnapshot>

  public takeSnapshot(
    persistedSnapshot: PersistedSnapshot,
  ): Promise<PersistedSnapshot> {
    throw new Error('#takeSnapshot() is yet implemented')
  }

  public abstract persist(
    persistedEvent: PersistedEvent,
  ): Promise<PersistedEvent>
}

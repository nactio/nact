import { AbstractPersistenceEngine } from '../src/AbstractPersistenceEngine'
import { PersistedEvent } from '../src/PersistedEvent'
import { PersistedSnapshot } from '../src/PersistedSnapshot'

export class MockPersistenceEngine extends AbstractPersistenceEngine {
  constructor(
    private readonly eventsMap: { [key: string]: PersistedEvent[] } = {},
    private readonly snapshotsMap: { [key: string]: PersistedSnapshot[] } = {},
    private readonly takeSnapshotIsWorking: boolean = true,
    private readonly validateSeqNumber: boolean = false,
  ) {
    super()
  }

  public latestSnapshot(persistenceKey: string) {
    const snapshots = this.snapshotsMap[persistenceKey] || []
    const snapshot = snapshots[snapshots.length - 1]
    return Promise.resolve(snapshot)
  }

  public takeSnapshot(persistedSnapshot: PersistedSnapshot) {
    if (this.takeSnapshotIsWorking) {
      const prev = this.snapshotsMap[persistedSnapshot.key] || []
      this.snapshotsMap[persistedSnapshot.key] = [...prev, persistedSnapshot]
      return Promise.resolve(persistedSnapshot)
    } else {
      return Promise.reject(new Error('Elvis has left the building'))
    }
  }

  public async events(
    persistenceKey: string,
    offset: number = 0,
    limit: number,
    tags: string[],
  ): Promise<PersistedEvent[]> {
    const persistedEvents = this.eventsMap[persistenceKey] || []
    const slice = persistedEvents.slice(
      offset,
      limit ? offset + limit : undefined,
    )
    return slice
  }

  public persist(persistedEvent: PersistedEvent): Promise<PersistedEvent> {
    const prev = this.eventsMap[persistedEvent.key] || []
    const nextEvents = [...prev, persistedEvent]
    if (
      this.validateSeqNumber &&
      prev.reduce(
        (flag, current) =>
          flag && current.sequenceNumber !== persistedEvent.sequenceNumber,
        true,
      )
    ) {
      return Promise.reject(new Error('Duplicate sequence number'))
    }
    this.eventsMap[persistedEvent.key] = nextEvents
    return Promise.resolve(persistedEvent)
  }
}

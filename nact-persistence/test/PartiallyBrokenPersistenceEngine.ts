import { AbstractPersistenceEngine } from '../src/AbstractPersistenceEngine'
import { PersistedEvent } from '../src/PersistedEvent'
import { PersistedSnapshot } from '../src/PersistedSnapshot'

export class PartiallyBrokenPersistenceEngine extends AbstractPersistenceEngine {
  private failCount: number = 0

  constructor(
    private readonly eventsMap: Map<string, PersistedEvent[]> = new Map(),
    private readonly failIndex: number,
    private readonly maxFailures: number,
  ) {
    super()
  }

  public events(
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
    return slice.map((item, index) => {
      if (index < this.failIndex) {
        return item
      }
      ++this.failCount
      if (!this.maxFailures || this.failCount < this.maxFailures) {
        throw new Error('Elvis is now approaching the stratosphere.')
      }
      return item
    })
  }

  public latestSnapshot(persistenceKey: string): Promise<PersistedSnapshot> {
    throw new Error('#latestSnapshot() is yet implemented')
  }

  public persist(persistedEvent: PersistedEvent): Promise<PersistedEvent> {
    const prev = this.eventsMap.get(persistedEvent.key) || []
    this.eventsMap.set(persistedEvent.key, [...prev, persistedEvent])
    return Promise.resolve(persistedEvent)
  }
}

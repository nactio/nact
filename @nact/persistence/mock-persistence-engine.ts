import { IPersistedEvent, IPersistedSnapshot, IPersistenceEngine } from "./persistence-engine";

export class MockPersistenceEngine implements IPersistenceEngine {
  _events: { [key: string]: IPersistedEvent[] };
  _snapshots: { [key: string]: IPersistedSnapshot[] };
  takeSnapshotIsWorking: boolean;
  validateSeqNumber: boolean;
  constructor(events = {}, snapshots = {}, takeSnapshotIsWorking = true, validateSeqNumber = false) {
    this._events = events;
    this._snapshots = snapshots;
    this.takeSnapshotIsWorking = takeSnapshotIsWorking;
    this.validateSeqNumber = validateSeqNumber;
  }

  latestSnapshot(persistenceKey: string) {
    const snapshots = (this._snapshots[persistenceKey] || []);
    const snapshot = snapshots[snapshots.length - 1];
    return Promise.resolve(snapshot);
  }

  async takeSnapshot(persistedSnapshot: IPersistedSnapshot) {
    if (this.takeSnapshotIsWorking) {
      const prev = this._snapshots[persistedSnapshot.key] || [];
      this._snapshots[persistedSnapshot.key] = [...prev, persistedSnapshot];
    } else {
      throw new Error('Elvis has left the building');
    }
  }

  async* events(persistenceKey: string, offset: number, limit?: number, tags?: string[]): AsyncGenerator<IPersistedEvent, any, unknown> {
    const persistedEvents = (this._events[persistenceKey] || []);
    const slice = persistedEvents.slice(offset, limit ? offset + limit : undefined);
    for (const item of slice) {
      yield item;
    }
  }

  async persist(persistedEvent: IPersistedEvent) {
    const prev = this._events[persistedEvent.key] || [];
    let nextEvents = [...prev, persistedEvent];
    if (this.validateSeqNumber && prev.reduce((prev, current) => prev && current.sequenceNumber !== persistedEvent.sequenceNumber, true)) {
      throw new Error('Duplicate sequence number');
    }
    this._events[persistedEvent.key] = nextEvents;
  }
}

module.exports.MockPersistenceEngine = MockPersistenceEngine;
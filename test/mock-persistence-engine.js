const { AbstractPersistenceEngine } = require('../lib/persistence');
const { Observable } = require('rxjs');

class MockPersistenceEngine extends AbstractPersistenceEngine {
  constructor (events = {}, snapshots = {}, takeSnapshotIsWorking = true) {
    super();
    this._events = events;
    this._snapshots = snapshots;
    this.takeSnapshotIsWorking = takeSnapshotIsWorking;
  }

  latestSnapshot (persistenceKey) {
    const snapshots = (this._snapshots[persistenceKey] || []);
    const snapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : undefined;
    return Promise.resolve(snapshot);
  }

  takeSnapshot (persistedSnapshot) {
    if (this.takeSnapshotIsWorking) {
      const prev = this._snapshots[persistedSnapshot.key] || [];
      this._snapshots[persistedSnapshot.key] = [...prev, persistedSnapshot];
      return Promise.resolve(persistedSnapshot);
    } else {
      return Promise.reject(new Error('Elvis has left the building'));
    }
  }

  events (persistenceKey, offset = 0, limit, tags) {
    const persistedEvents = (this._events[persistenceKey] || []);
    const slice = persistedEvents.slice(offset, limit ? offset + limit : undefined);
    return Observable.from(slice);
  }

  persist (persistedEvent) {
    const prev = this._events[persistedEvent.key] || [];
    this._events[persistedEvent.key] = [...prev, persistedEvent];
    return Promise.resolve(persistedEvent);
  }
}

module.exports.MockPersistenceEngine = MockPersistenceEngine;

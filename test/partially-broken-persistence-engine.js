const { AbstractPersistenceEngine } = require('../lib/persistence');
const Rx = require('rxjs');
const { Observable } = Rx;

class PartiallyBrokenPersistenceEngine extends AbstractPersistenceEngine {
  constructor (events = new Map(), failIndex, maxFailures) {
    super();
    this._events = events;
    this.failIndex = failIndex;
    this.failCount = 0;
    this.maxFailures = maxFailures;
  }

  events (persistenceKey, offset = 0, limit, tags) {
    const persistedEvents = (this._events[persistenceKey] || []);
    const slice = persistedEvents.slice(offset, limit ? offset + limit : undefined);
    return Observable.from(slice).map((item, index) => {
      if (index < this.failIndex) {
        return item;
      }
      ++this.failCount;
      if (!this.maxFailures || this.failCount < this.maxFailures) {
        throw new Error('Elvis is now approaching the stratosphere.');
      }
      return item;
    });
  }

  latestSnapshot (persistenceKey) {
    throw new Error('#latestSnapshot() is yet implemented');
  }

  persist (persistedEvent) {
    const prev = this._events.get(persistedEvent.key) || [];
    this._events.set(persistedEvent.key, [...prev, persistedEvent]);
    return Promise.resolve(persistedEvent);
  }
}

module.exports.PartiallyBrokenPersistenceEngine = PartiallyBrokenPersistenceEngine;

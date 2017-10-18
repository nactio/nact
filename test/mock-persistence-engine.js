const { AbstractPersistenceEngine } = require('../lib/extensions/persistence');
const { Observable } = require('rxjs');

class MockPersistenceEngine extends AbstractPersistenceEngine {
  constructor (events = {}) {
    super();
    this._events = events;
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

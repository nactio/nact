const { AbstractPersistenceEngine } = require('../lib/persistence-engine');
const { Observable } = require('rxjs');

class MockPersistenceEngine extends AbstractPersistenceEngine {
  constructor (events = new Map()) {
    super();
    this._events = events;
  }

  events (persistenceKey, offset, limit) {
    return Observable.of((this._events[persistenceKey] || []).slice(offset, offset + limit));
  }

  persist (persistedEvent) {
    const prev = this._events.get(persistedEvent.persistenceKey);
    this._events.set(persistedEvent.persistenceKey, [...prev, persistedEvent]);
  }
}

module.exports.MockPersistenceEngine = MockPersistenceEngine;

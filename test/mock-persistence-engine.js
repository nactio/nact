const { AbstractPersistenceEngine } = require('../lib/persistence-engine');
const { Observable } = require('rxjs');

class MockPersistenceEngine extends AbstractPersistenceEngine {
  constructor (events = new Map()) {
    super();
    this.events = events;
  }

  events (persistenceKey, offset, limit) {
    return Observable.of(this.events[persistenceKey].slice(offset, offset + limit));
  }

  persist (persistedEvent) {
    const prev = this.events.get(persistedEvent.persistenceKey);
    this.events.set(persistedEvent.persistenceKey, [...prev, persistedEvent]);
  }
}

module.exports.MockPersistenceEngine = MockPersistenceEngine;

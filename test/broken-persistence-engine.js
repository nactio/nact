const { AbstractPersistenceEngine } = require('../lib/persistence-engine');

class BrokenPersistenceEngine extends AbstractPersistenceEngine {
  events (persistenceKey, offset, limit) {
    throw new Error('Elvis has left the building');
  }

  persist (persistedEvent) {}
}

module.exports.BrokenPersistenceEngine = BrokenPersistenceEngine;

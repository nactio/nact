const { AbstractPersistenceEngine } = require('../lib/persistence-engine');

class BrokenPersistenceEngine extends AbstractPersistenceEngine {
  events (persistenceKey, offset, limit) {
    throw new Error('a');
  }

  persist (persistedEvent) {}
}

module.exports.MockPersistenceEngine = BrokenPersistenceEngine;

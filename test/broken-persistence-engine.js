const { AbstractPersistenceEngine } = require('../lib/persistence');

class BrokenPersistenceEngine extends AbstractPersistenceEngine {
  events (persistenceKey, offset, limit, tags) {
    throw new Error('Elvis has left the building');
  }

  latestSnapshot (persistenceKey) {
    throw new Error('#latestSnapshot() is yet implemented');
  }

  persist (persistedEvent) {}
}

module.exports.BrokenPersistenceEngine = BrokenPersistenceEngine;

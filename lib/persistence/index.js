const { spawnPersistent } = require('./persistent-actor');
const { PersistedEvent, PersistedSnapshot, AbstractPersistenceEngine } = require('./persistence-engine');

const configurePersistence = (engine) => (system) => {
  if (!engine) {
    throw new Error('Persistence engine should not be undefined');
  }
  return Object.assign(system, { persistenceEngine: engine });
};

module.exports = { configurePersistence, spawnPersistent, PersistedSnapshot, PersistedEvent, AbstractPersistenceEngine };

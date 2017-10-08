const { spawnPersistent } = require('./persistent-actor');
const { PersistedEvent, AbstractPersistenceEngine } = require('./persistence-engine');

const configurePersistence = (engine) => (system) => {
  if (!(engine instanceof AbstractPersistenceEngine)) {
    throw new Error('Persistence engine should extend AbstractPersistenceEngine');
  }
  return Object.assign(system, { persistenceEngine: engine });
};

module.exports = { configurePersistence, spawnPersistent, PersistedEvent, AbstractPersistenceEngine };

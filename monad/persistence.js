const { configurePersistence } = require('../lib/persistence');

const SPAWN_PERSISTENT = Symbol('spawnPersistent');
const PERSIST = Symbol('persist');

const PERSISTENCE_QUERY = Symbol('persistenceQuery');

const spawnPersistent = (parent, f, key, name, properties) => ({
  action: SPAWN_PERSISTENT,
  parent,
  f,
  key,
  name,
  properties
});

const persistentQuery = (parent, f, key, properties) => ({
  action: PERSISTENCE_QUERY,
  parent,
  f,
  key,
  properties
});

module.exports = {
  spawnPersistent,
  configurePersistence,
  persistentQuery,
  SPAWN_PERSISTENT,
  PERSISTENCE_QUERY,
  PERSIST
};

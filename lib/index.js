const { spawn, spawnStateless } = require('./actor');
const { spawnPersistent, configurePersistence } = require('./extensions/persistence');

module.exports = {
  ...require('./system'),
  spawn,
  spawnStateless,
  spawnPersistent,
  configurePersistence
};

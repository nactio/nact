const { spawn, spawnStateless } = require('./actor');

module.exports = {
  ...require('./system'),
  spawn,
  spawnStateless,
  persistence: require('./extensions/persistence')
};

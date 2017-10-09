const { spawn, spawnStateless } = require('./actor');

module.exports = {
  ...require('./system'),
  spawn,
  spawnStateless
};

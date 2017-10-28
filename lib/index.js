const { spawn, spawnStateless } = require('./actor');
const { spawnPersistent, configurePersistence } = require('./extensions/persistence');
const { stop, state$, query, dispatch } = require('./functions');

module.exports = {
  ...require('./system'),
  spawn,
  spawnStateless,
  spawnPersistent,
  configurePersistence,
  query,
  dispatch,
  stop,
  state$
};

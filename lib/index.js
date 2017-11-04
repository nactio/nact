const { spawn, spawnStateless } = require('./actor');
const { stop, state$, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence } = require('./persistence');
module.exports = {
  ...require('./system'),
  spawn,
  spawnStateless,
  query,
  dispatch,
  stop,
  state$,
  spawnPersistent,
  configurePersistence
};

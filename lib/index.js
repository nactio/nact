const { spawn, spawnStateless } = require('./actor');
const { stop, state$, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence } = require('./persistence');
const time = require('./time');
module.exports = {
  ...require('./system'),
  ...time,
  spawn,
  spawnStateless,
  query,
  dispatch,
  stop,
  state$,
  spawnPersistent,
  configurePersistence
};

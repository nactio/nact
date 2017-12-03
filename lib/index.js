const { spawn, spawnStateless } = require('./actor');
const { stop, state$, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence } = require('./persistence');
const utils = require('./utils');
module.exports = {
  ...require('./system'),
  ...utils,
  spawn,
  spawnStateless,
  query,
  dispatch,
  stop,
  state$,
  spawnPersistent,
  configurePersistence
};

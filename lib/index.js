const { spawn, spawnStateless } = require('./actor');
const { stop, state$, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence } = require('./persistence');
const { after } = require('./utils');
module.exports = {
  ...require('./system'),
  spawn,
  after,
  spawnStateless,
  query,
  dispatch,
  stop,
  state$,
  spawnPersistent,
  configurePersistence
};

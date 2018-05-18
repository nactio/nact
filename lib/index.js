const { spawn, spawnStateless } = require('./actor');
const { stop, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence, persistentQuery } = require('./persistence');
const { logNothing, logToConsole } = require('./monitoring');
const { Nobody } = require('./references');
const time = require('./time');

module.exports = {
  ...require('./system'),
  ...time,
  spawn,
  spawnStateless,
  query,
  persistentQuery,
  dispatch,
  stop,
  spawnPersistent,
  configurePersistence,
  logNothing,
  logToConsole,
  Nobody
};

const { spawn, spawnStateless } = require('./actor');
const { stop, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence } = require('./persistence');
const { configureLogging, logNothing, logToConsole } = require('./monitoring');
const time = require('./time');

module.exports = {
  ...require('./system'),
  ...time,
  spawn,
  spawnStateless,
  query,
  dispatch,
  stop,
  spawnPersistent,
  configurePersistence,
  configureLogging,
  logNothing,
  logToConsole
};

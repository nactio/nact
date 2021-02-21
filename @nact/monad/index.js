const { spawn, spawnStateless } = require('./actor');
const { stop, query, dispatch } = require('./functions');
const { spawnPersistent, configurePersistence, persistentQuery } = require('./persistence');
const { io, asyncIO } = require('./io');
const { Nobody } = require('../lib/references');
const { logNothing, logToConsole } = require('./monitoring');

const time = require('../lib/time');

module.exports = {
  ...require('./system'),
  ...time,
  spawn,
  io,
  asyncIO,
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

const { spawn } = require('./actor');
const { spawnPersistent } = require('./persistent-actor');
module.exports = { ...require('./system'), spawn, spawnPersistent };

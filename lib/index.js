const { spawn, spawnFixed } = require('./actor');
const { spawnPersistent } = require('./persistent-actor');
module.exports = { ...require('./system'), spawn, spawnFixed, spawnPersistent };

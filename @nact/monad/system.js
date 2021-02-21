const { start } = require('../lib/system');
const { wrapFunction } = require('./utility');

const ioEffects = require('./effects/ioEffects');
const functionEffects = require('./effects/functionEffects');
const persistentActorEffects = require('./effects/persistentEffects');
const actorEffects = require('./effects/actorEffects');

const allowedEffects = {
  ...actorEffects,
  ...persistentActorEffects,
  ...ioEffects,
  ...functionEffects
};

const startMonad = async (...args) => {
  const f = args[args.length - 1];
  if (!f || String(typeof (f)) !== 'function') {
    throw new Error('The last (and required) argument to start in nact\'s monadic implementation must be a function');
  }
  const system = start(args.slice(0, args.length - 1));
  await wrapFunction(f, allowedEffects)(system);
};

module.exports = {
  start: startMonad
};

const { SPAWN_PERSISTENT, PERSISTENCE_QUERY, PERSIST } = require('../persistence');
const { spawnPersistent, persistentQuery } = require('../../lib/persistence');
const { wrapFunction } = require('../utility');
const ctxHandler = require('./contextHandler');
const { wrapSupervisionPolicy } = require('./supervisionPolicy');

const effects = {
  [SPAWN_PERSISTENT]: ({ parent, f, key, name, properties: { additionalEffects = {}, onCrash, ...properties } = {} }) =>
    spawnPersistent(
      parent,
      wrapActorFunction(f, { ...additionalEffects, ...allowedEffectsForPersistentActor }),
      key,
      name,
      { ...properties, onCrash: onCrash && wrapSupervisionPolicy(onCrash, allowedEffectsForPersistentActor) }
    ),
  [PERSISTENCE_QUERY]: ({ parent, f, key, properties: { additionalEffects = {}, ...properties } = {} }) =>
    persistentQuery(
      parent,
      wrapFunction(f, { ...allowedEffectsForPersistentQuery, ...additionalEffects }),
      key,
      { ...properties }
    ),
  [PERSIST]: ({ ctx, msg, tags }) => ctx.persist(msg, tags)
};

const wrapActorFunction = (f, effects) => {
  const f2 = (state, msg, ctx) => f(state, msg, new Proxy(ctx, ctxHandler));
  return wrapFunction(f2);
};

const allowedEffectsForPersistentActor = {
  ...require('./actorEffects'),
  ...require('./functionEffects'),
  ...require('./ioEffects'),
  ...require('./monitoringEffects').effects,
  ...effects
};

const allowedEffectsForPersistentQuery = {
  ...require('./ioEffects')
};

module.exports = {
  ...effects
};

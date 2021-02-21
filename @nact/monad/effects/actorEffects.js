const { SPAWN, SPAWN_STATELESS } = require('../actor');
const { spawn, spawnStateless } = require('../../lib/actor');
const { wrapFunction } = require('../utility');
const ctxHandler = require('./contextHandler');
const { wrapSupervisionPolicy } = require('./supervisionPolicy');

const wrapActorFunction = (f, effects) => {
  const f2 = (state, msg, ctx) => f(state, msg, new Proxy(ctx, ctxHandler));
  return wrapFunction(f2, effects);
};

const wrapStatelessActorFunction = (f, effects) => {
  const f2 = (msg, ctx) => f(msg, new Proxy(ctx, ctxHandler));
  return wrapFunction(f2, effects);
};

const effects = {
  [SPAWN]: ({ parent, f, name, properties: { additionalEffects = {}, onCrash, ...properties } = {} }) =>
    spawn(
      parent,
      wrapActorFunction(f, { ...allowedEffects, ...additionalEffects }),
      name,
      { ...properties, onCrash: onCrash && wrapSupervisionPolicy(onCrash, allowedEffects) }
    ),
  [SPAWN_STATELESS]: ({ parent, f, name, properties: { additionalEffects = {}, onCrash, ...properties } = {} }) =>
    spawnStateless(
      parent,
      wrapStatelessActorFunction(f, { ...allowedEffects, ...additionalEffects }),
      name,
      { ...properties, onCrash: onCrash && wrapSupervisionPolicy(onCrash, allowedEffects) }
    )
};

const allowedEffects = {
  ...require('./ioEffects'),
  ...require('./functionEffects'),
  ...require('./persistentEffects'),
  ...require('./monitoringEffects').effects,
  ...effects
};

module.exports = {
  ...effects
};

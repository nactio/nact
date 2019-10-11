const { wrapFunction } = require('../utility');
const { contextHandler } = require('./contextHandler');

const wrapSupervisionPolicy = (policy, allowedEffects) =>
  wrapFunction((msg, err, ctx) => policy(msg, err, new Proxy(ctx, contextHandler)), allowedEffects);

module.exports = {
  wrapSupervisionPolicy
};

const { PERSIST } = require('../persistence');
const { logHandler } = require('./monitoringEffects');

const ctxHandler = {
  get: function (ctx, prop) {
    if (prop in ctx) {
      if (prop === 'log') {
        return new Proxy(ctx.log, logHandler);
      } else if (prop === 'persist') {
        return (msg, tags = []) => ({ action: PERSIST, ctx, msg, tags });
      } else {
        return ctx[prop];
      }
    }
  }
};

module.exports = ctxHandler;

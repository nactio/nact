const { LOG } = require('../../lib/monitoring');

const effects = {
  [LOG]: ({ facade, level, args }) => facade[level](...args)
};

const logHandler = {
  get: function (facade, level) {
    if (level in facade) {
      return (...args) => ({ action: LOG, facade, level, args });
    }
  }
};

module.exports = {
  effects,
  logHandler
};

const { IO, ASYNC_IO } = require('../io');

const effects = {
  [IO]: ({f, args}) => f(...args),
  [ASYNC_IO]: ({f, args}) => Promise.resolve(f(...args))
};

module.exports = {
  ...effects
};

const { STOP, DISPATCH, QUERY } = require('../functions');
const { stop, query, dispatch } = require('../../lib/functions');

const effects = {
  [STOP]: ({ actor }) => stop(actor),
  [QUERY]: ({ actor, msg, timeout }) => query(actor, msg, timeout),
  [DISPATCH]: ({ actor, msg, sender }) => dispatch(actor, msg, sender)
};

module.exports = {
  ...effects
};

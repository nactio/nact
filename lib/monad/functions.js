const DISPATCH = Symbol('dispach');
const QUERY = Symbol('query');
const STOP = Symbol('stop');

const stop = (actor) =>
  ({ action: STOP, actor });

const query = (actor, msg, timeout) => {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }

  return ({ action: QUERY, actor, msg, timeout });
};

const dispatch = (actor, msg, sender) =>
  ({ action: DISPATCH, actor, msg, sender });

module.exports = {
  stop,
  query,
  dispatch,
  DISPATCH,
  STOP,
  QUERY
};

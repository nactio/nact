const stop = (actor) => {
  return actor.stop();
};

const query = (actor, msg, timeout, ...args) => {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }
  if (actor.query) {
    return actor.query(msg, timeout, ...args);
  }
};

const dispatch = (actor, ...args) => {
  if (actor.dispatch) {
    return actor.dispatch(...args);
  }
};

const state$ = (actor) => {
  return actor.state$;
};

module.exports = {
  stop,
  query,
  dispatch,
  state$
};

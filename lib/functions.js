
const stop = (actor) => {
  return actor.stop();
};

const query = (actor, ...args) => {
  return actor.query(...args);
};

const dispatch = (actor, ...args) => {
  return actor.dispatch(...args);
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

const systemMap = require('./system-map');

const stop = (actor) => {
  let concreteActor = systemMap.find(actor.system.name, actor);
  concreteActor &&
  concreteActor.stop &&
  concreteActor.stop();
};

const query = (actor, msg, timeout, ...args) => {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }

  let concreteActor = systemMap.find(actor.system.name, actor);

  return (concreteActor && concreteActor.query)
    ? concreteActor.query(msg, timeout, ...args)
    : Promise.reject(new Error('Actor stopped or never existed. Query can never resolve'));
};

const dispatch = (actor, ...args) => {
  let concreteActor = systemMap.find(actor.system.name, actor);
  concreteActor &&
  concreteActor.dispatch &&
  concreteActor.dispatch(...args);
};

const state$ = (actor) => {
  let concreteActor = systemMap.find(actor.system.name, actor);
  return concreteActor && concreteActor.state$;
};

module.exports = {
  stop,
  query,
  dispatch,
  state$
};

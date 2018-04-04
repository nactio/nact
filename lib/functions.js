const systemMap = require('./system-map');

const stop = (actor) => {
  let concreteActor = systemMap.find(actor.system.name, actor);
  concreteActor &&
    concreteActor.stop &&
    concreteActor.stop();
};

const query = (actor, msg, timeout) => {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }

  const concreteActor = systemMap.find(actor.system.name, actor);

  return (concreteActor && concreteActor.query)
    ? concreteActor.query(msg, timeout)
    : Promise.reject(new Error('Actor stopped or never existed. Query can never resolve'));
};

const dispatch = (actor, msg, sender) => {
  let concreteActor = systemMap.find(actor.system.name, actor);
  concreteActor &&
    concreteActor.dispatch &&
    concreteActor.dispatch(msg, sender);
};

module.exports = {
  stop,
  query,
  dispatch
};

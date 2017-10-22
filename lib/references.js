const privateProperties = new WeakMap();
const freeze = require('deep-freeze-node');

const applyOrThrowIfStopped = (reference, f) => {
  const actor = privateProperties.get(reference).actor;
  if (actor) {
    return f(actor);
  }
  throw new Error('Actor stopped');
};

const fallback = {
  dispatch: () => { },
  query: () => Promise.reject(new Error('Actor stopped. Query can never resolve')),
  stopped: true,
  stop: () => {}
};

const actorOrFallback = (self) => (privateProperties.get(self).actor) || fallback;

class TemporaryReference {
  constructor (deferral) {
    privateProperties.set(this, deferral);
  }

  dispatch (message) {
    privateProperties.get(this).resolve(message);
  }
}

class ActorReference {
  constructor (actor) {
    this.path = actor.path;
    this.name = actor.name;
    this.parent = actor.parent.reference;
    freeze(this);
    privateProperties.set(this, { actor, system: actor.system });
  }

  _dereference () {
    const { system } = privateProperties.get(this);
    privateProperties.set(this, { system });
  }

  isStopped () {
    return actorOrFallback(this).stopped;
  }

  children () {
    return new Map(actorOrFallback(this).childReferences);
  }

  dispatch (message, sender) {
    return actorOrFallback(this).dispatch(message, sender);
  }

  query (message = undefined, timeout) {
    return actorOrFallback(this).query(message, timeout);
  }

  stop () {
    return actorOrFallback(this).stop();
  }
}

class ActorSystemReference {
  constructor (system) {
    privateProperties.set(this, { system, actor: system });
    this.path = system.path;
    freeze(this);
  }

  isStopped () {
    return privateProperties.get(this).system.stopped;
  }

  children () {
    return new Map(privateProperties.get(this).system.childReferences);
  }

  stop () {
    return privateProperties.get(this).system.stop();
  }
}

module.exports.ActorSystemReference = ActorSystemReference;
module.exports.ActorReference = ActorReference;
module.exports.applyOrThrowIfStopped = applyOrThrowIfStopped;
module.exports.TemporaryReference = TemporaryReference;

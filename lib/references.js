const privateProperties = new WeakMap();
const freeze = require('deep-freeze-node');
const { Observable } = require('rxjs');

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
  stop: () => {},
  state$: Observable.empty()
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

const dereference = (reference) => {
  const { system } = privateProperties.get(reference);
  privateProperties.set(reference, { system });
};

class ActorReference {
  constructor (actor) {
    this.path = actor.path;
    this.name = actor.name;
    this.parent = actor.parent.reference;
    this.pid = process.pid;
    this.host = actor.system.host;
    this.port = actor.system.port;
    freeze(this);
    privateProperties.set(this, { actor, system: actor.system });
  }

  dispatch (message, sender) {
    return actorOrFallback(this).dispatch(message, sender);
  }

  query (message, timeout) {
    return actorOrFallback(this).query(message, timeout);
  }

  stop () {
    return actorOrFallback(this).stop();
  }

  get state$ () {
    return actorOrFallback(this).state$;
  }
}

class ActorSystemReference {
  constructor (system) {
    privateProperties.set(this, { system, actor: system });
    this.path = system.path;
    freeze(this);
  }

  stop () {
    return privateProperties.get(this).system.stop();
  }
}

module.exports.ActorSystemReference = ActorSystemReference;
module.exports.ActorReference = ActorReference;
module.exports.applyOrThrowIfStopped = applyOrThrowIfStopped;
module.exports.TemporaryReference = TemporaryReference;
module.exports.dereference = dereference;

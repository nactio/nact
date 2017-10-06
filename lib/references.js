const privateProperties = new WeakMap();
const freeze = require('deep-freeze-node');

const fallback = {
  tell: () => { },
  ask: () => Promise.reject(new Error('Actor stopped. Ask can never resolve')),
  stopped: true,
  stop: () => {},
  terminate: () => {}
};

const actorOrFallback = (self) => (privateProperties.get(self).actor) || fallback;

module.exports.TemporaryReference = class {
  constructor (deferral) {
    privateProperties.set(this, deferral);
  }

  tell (message) {
    privateProperties.get(this).resolve(message);
  }
};

module.exports.ActorReference = class {
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

  tell (message, sender) {
    return actorOrFallback(this).tell(message, sender);
  }

  ask (message = undefined, timeout) {
    return actorOrFallback(this).ask(message, timeout);
  }

  stop () {
    return actorOrFallback(this).stop();
  }

  terminate () {
    return actorOrFallback(this).terminate();
  }
};

module.exports.ActorSystemReference = class {
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

  terminate () {
    return privateProperties.get(this).system.terminate();
  }

  tryFindActorFromPath (path) {
    return privateProperties.get(this).system.tryFindActorFromPath(path);
  }
};

const applyOrThrowIfTerminated = (reference, f) => {
  const actor = privateProperties.get(reference).actor;
  if (actor) {
    return f(actor);
  }
  throw new Error('Actor terminated');
};

const { spawn, spawnFixed } = require('./actor');

module.exports.spawn = (reference, f, name) =>
  applyOrThrowIfTerminated(reference, parent => spawn(parent, f, name));

module.exports.spawnFixed = (reference, f, name) =>
  applyOrThrowIfTerminated(reference, parent => spawnFixed(parent, f, name));

const privateProperties = new WeakMap();
const freeze = require('deep-freeze-node');

const fallback = {
  tell: () => { },
  ask: () => Promise.reject(new Error('Actor stopped. Ask can never resolve')),
  spawn: () => { throw new Error('Actor terminated'); },
  spawnFixed: () => { throw new Error('Actor terminated'); },
  stopped: true,
  stop: () => {},
  terminate: () => {}
};

const actorOrFallback = (self) => (privateProperties.get(self).actor) || fallback;

class TemporaryReference {
  constructor (deferral) {
    privateProperties.set(this, deferral);
  }

  tell (message) {
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

  spawn (f, name) {
    return actorOrFallback(this).spawn(f, name);
  }

  spawnFixed (f, name) {
    return actorOrFallback(this).spawnFixed(f, name);
  }
}

class ActorSystemReference {
  constructor (system) {
    privateProperties.set(this, system);
    this.path = system.path;
    freeze(this);
  }

  isStopped () {
    return privateProperties.get(this).stopped;
  }

  children () {
    return new Map(privateProperties.get(this).childReferences);
  }

  stop () {
    return privateProperties.get(this).stop();
  }

  terminate () {
    return privateProperties.get(this).terminate();
  }

  tryFindActorFromPath (path) {
    return privateProperties.get(this).tryFindActorFromPath(path);
  }

  spawn (f, name) {
    return privateProperties.get(this).spawn(f, name);
  }

  spawnFixed (f, name) {
    return privateProperties.get(this).spawnFixed(f, name);
  }
}

module.exports.ActorReference = ActorReference;
module.exports.ActorSystemReference = ActorSystemReference;
module.exports.TemporaryReference = TemporaryReference;

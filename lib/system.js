const { ActorSystemReference } = require('./references');
const { ActorPath } = require('./paths');
const assert = require('assert');
const { stop } = require('./functions');
const systemMap = require('./system-map');

const crypto = require('crypto');
const toBase36 = x => Number(x).toString(36);
const generateSystemId = () => {
  const random = new Array(4).fill(0).map(_ => crypto.randomBytes(4).readUInt32BE()).map(toBase36);
  return random.join('-');
};

class ActorSystem {
  constructor (extensions) {
    let [hd, ...tail] = extensions;
    this.children = new Map();
    this.createLogger = () => undefined;
    this.name = (typeof (hd) === 'object' && hd.name) || generateSystemId();
    this.path = ActorPath.root(this.name);
    this.reference = new ActorSystemReference(this.name, this.path);
    this.childReferences = new Map();
    this.tempReferences = new Map();
    this.stopped = false;
    this.system = this;
    assert(extensions instanceof Array);
    systemMap.add(this);
    ([...(typeof (hd) === 'function') ? [hd] : [], ...tail]).forEach(extension => extension(this));
  }

  addTempReference (reference, deferral) {
    this.tempReferences.set(reference.id, deferral);
  }

  removeTempReference (reference) {
    this.tempReferences.delete(reference.id);
  }

  find (actorRef) {
    switch (actorRef && actorRef.type) {
      case 'actor': {
        let parts =
          actorRef &&
          actorRef.path &&
          actorRef.path.parts;

        return parts && parts.reduce((parent, current) =>
          parent &&
          parent.children.get(current),
          this
        );
      }
      case 'temp': {
        const actor = this.tempReferences.get(actorRef.id);
        return actor && actor.resolve && { dispatch: (...args) => actor.resolve(...args) };
      }
      case 'system':
        return this;
      default: return undefined;
    }
  }

  handleFault (msg, sender, error, child) {
    console.log('Stopping top level actor,', child.name, 'due to a fault');
    stop(child);
  }

  childStopped (child) {
    this.children.delete(child.name);
    this.childReferences.delete(child.name);
  }

  childSpawned (child) {
    this.childReferences.set(child.name, child.reference);
    this.children.set(child.name, child);
  }

  stop () {
    [...this.children.values()].forEach(stop);
    this.stopped = true;
    systemMap.remove(this.name);
  }

  assertNotStopped () { assert(!this.stopped); return true; }
}

const start = function () { return new ActorSystem([...arguments]).reference; };

module.exports = { start };

const { ActorSystemReference } = require('./references');
const { LocalPath } = require('./paths');
const assert = require('assert');

class ActorSystem {
  constructor (extensions) {
    this.children = new Map();
    this.reference = new ActorSystemReference(this);
    this.childReferences = new Map();
    this.path = LocalPath.root();
    this.stopped = false;
    this.system = this.reference;
    Object.assign(this, extensions);
  }

  tryFindActorFromPath (path) {
    if (path instanceof LocalPath) {
      let result = path.localParts.reduce((child, part) => child && child.children.get(part), this);
      return (result || {}).reference;
    }
    throw new TypeError('Only LocalPath is supported in this version of nact');
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
    [...this.children.values()].map(child => child.stop());
    this.stopped = true;
  }

  assertNotStopped () { assert(!this.stopped); return true; }
}

const start = (settings = {}) => new ActorSystem(settings).reference;

module.exports = { start };

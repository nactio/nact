const { ActorSystemReference } = require('./references');
const { LocalPath } = require('./paths');
const assert = require('assert');
const { stop, defaultSupervisionPolicy } = require('./functions');

class ActorSystem {
  constructor (extensions) {
    this.children = new Map();
    this.reference = new ActorSystemReference(this);
    this.childReferences = new Map();
    this.path = LocalPath.root();
    this.stopped = false;
    this.system = this.reference;
    this.whenChildCrashes = defaultSupervisionPolicy;
    assert(extensions instanceof Array);
    extensions.forEach(extension => extension(this));
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
    [...this.children.values()].map(stop);
    this.stopped = true;
  }

  assertNotStopped () { assert(!this.stopped); return true; }
}

const start = function () { return new ActorSystem([...arguments]).reference; };

module.exports = { start };

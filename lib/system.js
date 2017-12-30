const { ActorSystemReference } = require('./references');
const { ActorPath } = require('./paths');
const assert = require('assert');
const { stop } = require('./functions');
const { defaultSupervisionPolicy, SupervisionActions } = require('./supervision');
let systemCount = 0;

class ActorSystem {
  constructor (extensions) {
    this.children = new Map();
    // It is possible to start multiple systems within
    // a single process. The sid is a means of namespacing the system
    // in question.
    this.sid = ++systemCount;
    this.path = ActorPath.root();
    this.reference = new ActorSystemReference(this);
    this.childReferences = new Map();

    this.stopped = false;
    this.system = this.reference;
    this.whenChildCrashes = defaultSupervisionPolicy;
    assert(extensions instanceof Array);
    extensions.forEach(extension => extension(this));
  }

  handleFault (child, msg, sender, error) {
    defaultSupervisionPolicy(msg, error, { child: child.reference, ...SupervisionActions });
    child.stop();
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

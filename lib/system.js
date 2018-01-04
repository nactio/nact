const { ActorSystemReference } = require('./references');
const { ActorPath } = require('./paths');
const assert = require('assert');
const { stop } = require('./functions');
const { defaultSupervisionPolicy, SupervisionActions } = require('./supervision');
const systemMap = require('./system-map');

const crypto = require('crypto');
const toBase36 = x => Number(x).toString(36);
const generateSystemId = () => {
  const random = new Array(4).fill(0).map(_ => crypto.randomBytes(4).readUInt32BE()).map(toBase36);
  return random.join('-');
};

class ActorSystem {
  constructor (extensions) {
    this.children = new Map();

    this.sid = generateSystemId();
    this.path = ActorPath.root();
    this.reference = new ActorSystemReference(this.sid, this.path);
    this.childReferences = new Map();
    this.tempReferences = new Map();
    this.stopped = false;
    this.system = this;
    this.whenChildCrashes = defaultSupervisionPolicy;
    assert(extensions instanceof Array);
    extensions.forEach(extension => extension(this));
    systemMap.add(this);
  }

  addTempReference (reference, deferred) {
    this.tempReferences.set(reference.id, deferred);
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

        return parts &&
          parts.reduce(
            (parent, current) =>
              parent &&
              parent.children.get(current),
            this
          );
      }
      case 'temp': {
        const actor = this.tempReferences.get(actorRef.id);
        return { dispatch: (...args) => actor.resolve(...args) };
      }
      case 'system':
        return this;
      default: return undefined;
    }
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
    systemMap.remove(this.sid);
  }

  assertNotStopped () { assert(!this.stopped); return true; }
}

const start = function () { return new ActorSystem([...arguments]).reference; };

module.exports = { start };

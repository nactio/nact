const { Nobody } = require('./nobody');
const { Deferred } = require('./deferred');
const { ActorReference, TemporaryReference } = require('./references');
const Queue = require('denque');
const assert = require('assert');

const spawnFixedFunction = (f) => () => {
  const wrapper = (msg, ctx) => {
    let result = f.call(ctx, msg, ctx);
    if (result && result.then) {
      return result.then((r) => r !== false ? wrapper : undefined);
    } else if (result !== false) {
      return wrapper;
    } else {
      return undefined;
    }
  };
  return wrapper;
};

const serializeErr = (err) => JSON.stringify(err, Object.getOwnPropertyNames(err));

const getSafeTimeout = (timeoutDuration) => {
  timeoutDuration = timeoutDuration | 0;
  const MAX_TIMEOUT = 2147483647;
  return Math.min(MAX_TIMEOUT, timeoutDuration);
};

class Actor {
  constructor (parent, name, system, f) {
    this.parent = parent;
    if (!name) {
      name = `anonymous-${parent.children.size}`;
    }
    if (name && parent.children.has(name)) {
      throw new Error(`child actor of name ${name} already exists`);
    }
    this.name = name;
    this.path = parent.path.createChildPath(this.name);
    this.reference = new ActorReference(this);
    this.system = system;
    this.f = f();
    this.stopped = false;
    this.children = new Map();
    this.childReferences = new Map();
    this.busy = false;
    this.mailbox = new Queue();
    this.immediate = undefined;

    this.parent.childSpawned(this);
  }

  assertNotStopped () { assert(!this.stopped); }

  tell (message, sender = new Nobody(this.system)) {
    this.assertNotStopped();
    if (!this.busy) {
      this.handleMessage(message, sender);
    } else {
      this.mailbox.push({ message, sender });
    }
  }

  ask (message, timeout) {
    this.assertNotStopped();
    var deffered = new Deferred();

    if (timeout) {
      timeout = getSafeTimeout(timeout);
      const timeoutHandle = setTimeout(() => { deffered.reject(new Error('Ask Timeout')); }, timeout);
      deffered.promise.then(() => clearTimeout(timeoutHandle));
    }

    let tempReference = new TemporaryReference(deffered);
    this.tell(message, tempReference);
    return deffered.promise;
  }

  childStopped (child) {
    this.children.delete(child.name);
    this.childReferences.delete(child.name);
  }

  childSpawned (child) {
    this.children.set(child.name, child);
    this.childReferences.set(child.name, child.reference);
  }

  stop () {
    this.parent.childStopped(this);
    this.reference._dereference();
    delete this.reference;
    delete this.parent;
    [...this.children.values()].map(child => child.stop());
    this.stopped = true;
  }

  terminate () {
    if (this.immediate) {
      clearImmediate(this.immediate);
    }
    this.reference._dereference();
    delete this.reference;
    this.parent.childStopped(this);
    delete this.parent;
    [...this.children.values()].map(child => child.terminate());
    this.stopped = true;
  }

  processNext (next) {
    this.assertNotStopped();
    if (typeof (next) === 'function') {
      this.f = next;
      if (!this.mailbox.isEmpty()) {
        let { message, sender } = this.mailbox.shift();
        this.handleMessage(message, sender);
      } else {
        this.busy = false;
      }
    } else if (!next) {
      this.stop();
    } else {
      throw new TypeError('Unsupported Type');
    }
  }

  signalFault (error) {
    const serializedErr = serializeErr(error);
    console.log(serializedErr);
    // TODO: implement proper error handling
    this.terminate();
  }

  spawn (f, name) {
    return new Actor(this, name, this.system, f).reference;
  }

  spawnFixed (f, name) {
    return this.spawn(spawnFixedFunction(f), name);
  }

  createContext (sender) {
    const spawn = (f, name) => this.spawn(f, name);
    const spawnFixed = (f, name) => this.spawnFixed(f, name);
    const tell = (recipient, message, sender = this.reference) => {
      if (recipient && recipient.tell) {
        recipient.tell(message, sender);
      } else {
        throw new TypeError('Recipient is of an invalid type');
      }
    };

    return ({
      parent: this.parent.reference,
      path: this.path,
      self: this.reference,
      name: this.name,
      children: new Map(this.childReferences),
      sender,
      tell,
      spawn,
      spawnFixed
    });
  }

  handleMessage (message, sender) {
    this.busy = true;
    this.immediate = setImmediate(() => {
      try {
        let ctx = this.createContext(sender);
        let next = this.f.call(ctx, message, ctx);
        if (next && next.then && next.catch) {
          next.then(result => this.processNext(result)).catch(err => this.signalFault(err));
        } else {
          this.processNext(next);
        }
      } catch (e) {
        this.signalFault(e);
      }
    });
  }
}

module.exports.spawnFixedFunction = spawnFixedFunction;
module.exports.ActorReference = ActorReference;
module.exports.Actor = Actor;

const { Nobody } = require('./nobody');
const { Deferred } = require('./deferred');
require('bluebird');
const { ActorReference, TemporaryReference, applyOrThrowIfStopped, dereference } = require('./references');
const Queue = require('denque');
const assert = require('assert');
const freeze = require('deep-freeze-node');
const { Subject } = require('rxjs');

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
    this.f = f;
    this.state = undefined;
    this.stopped = false;
    this.children = new Map();
    this.childReferences = new Map();
    this.busy = false;
    this.subject = new Subject();
    this.mailbox = new Queue();
    this.immediate = undefined;
    this.parent.childSpawned(this);
  }

  static serializeErr (err) {
    return JSON.stringify(err, Object.getOwnPropertyNames(err));
  }

  static getSafeTimeout (timeoutDuration) {
    timeoutDuration = timeoutDuration | 0;
    const MAX_TIMEOUT = 2147483647;
    return Math.min(MAX_TIMEOUT, timeoutDuration);
  }

  assertNotStopped () { assert(!this.stopped); return true; }

  dispatch (message, sender = new Nobody(this.system)) {
    this.assertNotStopped();
    if (!this.busy) {
      this.handleMessage(message, sender);
    } else {
      this.mailbox.push({ message, sender });
    }
  }

  query (message, timeout) {
    this.assertNotStopped();
    var deffered = new Deferred();

    if (timeout) {
      timeout = Actor.getSafeTimeout(timeout);
      const timeoutHandle = setTimeout(() => { deffered.reject(new Error('Query Timeout')); }, timeout);
      deffered.promise.then(() => clearTimeout(timeoutHandle)).catch(() => {});
    }

    let tempReference = new TemporaryReference(deffered);
    this.dispatch(message, tempReference);
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
    if (this.immediate) {
      clearImmediate(this.immediate);
    }
    this.parent.childStopped(this);
    this.reference && dereference(this.reference);
    delete this.reference;
    delete this.parent;
    [...this.children.values()].map(child => child.stop());
    this.stopped = true;
    this.subject.complete();
  }

  get state$ () {
    return this.subject.asObservable();
  }

  processNext (next, allowUndefined = false) {
    if (!this.stopped) {
      if (next !== undefined || allowUndefined) {
        if (this.state !== next) {
          this.subject.next(next);
        }
        this.state = next;
        if (!this.mailbox.isEmpty()) {
          let { message, sender } = this.mailbox.shift();
          this.handleMessage(message, sender);
        } else {
          this.busy = false;
        }
      } else {
        this.stop();
      }
    }
  }

  signalFault (error) {
    const serializedErr = Actor.serializeErr(error);
    console.error(serializedErr);
    this.stop();
  }

  createContext (sender) {
    const dispatch = (recipient, message, sender = this.reference) => {
      if (recipient && recipient.dispatch) {
        recipient.dispatch(message, sender);
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
      dispatch
    });
  }

  handleMessage (message, sender) {
    this.busy = true;
    this.immediate = setImmediate(() => {
      try {
        let ctx = this.createContext(sender);
        let next = this.f.call(ctx, freeze(this.state), message, ctx);
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

const spawn = (parent, f, name) =>
  applyOrThrowIfStopped(parent, p => p.assertNotStopped() && new Actor(p, name, p.system, f).reference);

const spawnStateless = (parent, f, name) =>
  spawn(parent, function (state, msg, ctx) {
    const next = f.call(ctx, msg, ctx);
    return (next && next.then && next.then(() => true)) || true;
  }, name);

module.exports.spawn = spawn;
module.exports.spawnStateless = spawnStateless;
module.exports.Actor = Actor;

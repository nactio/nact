const { Nobody } = require('./nobody');
const { Deferred } = require('./deferred');
require('bluebird');
const { ActorReference, TemporaryReference, applyOrThrowIfStopped, dereference } = require('./references');
const Queue = require('denque');
const assert = require('assert');
const freeze = require('deep-freeze-node');
const { Subject } = require('rxjs');
const { stop, defaultSupervisionPolicy } = require('./functions');

class Actor {
  constructor (parent, name, system, f, { shutdownAfter, whenChildCrashes } = {}) {
    this.parent = parent;
    if (!name) {
      name = `anonymous-${(Math.random() * Number.MAX_SAFE_INTEGER) | 0}`;
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
    this.whenChildCrashes = whenChildCrashes || defaultSupervisionPolicy;

    if (shutdownAfter) {
      if (typeof (shutdownAfter) !== 'number') {
        throw new Error('Shutdown should be specified as a number in milliseconds');
      }
      this.shutdownPeriod = Actor.getSafeTimeout(shutdownAfter);
      this.setTimeout();
    }
  }

  setTimeout () {
    if (this.shutdownPeriod) {
      this.timeout = setTimeout(() => this.stop(), this.shutdownPeriod);
    }
  }

  reset () {
    this.state = undefined;
    [...this.children.entries()].forEach(x => x.reset());
  }

  clearTimeout () {
    clearTimeout(this.timeout);
  }

  clearImmediate () {
    clearImmediate(this.immediate);
  }

  static getSafeTimeout (timeoutDuration) {
    timeoutDuration = timeoutDuration | 0;
    const MAX_TIMEOUT = 2147483647;
    return Math.min(MAX_TIMEOUT, timeoutDuration);
  }

  assertNotStopped () { assert(!this.stopped); return true; }

  dispatch (message, sender = new Nobody(this.system)) {
    this.assertNotStopped();
    this.clearTimeout();
    if (!this.busy) {
      this.handleMessage(message, sender);
    } else {
      this.mailbox.push({ message, sender });
    }
  }

  query (message, timeout) {
    this.assertNotStopped();
    assert(timeout !== undefined && timeout !== null);
    var deffered = new Deferred();

    timeout = Actor.getSafeTimeout(timeout);
    const timeoutHandle = setTimeout(() => { deffered.reject(new Error('Query Timeout')); }, timeout);
    deffered.promise.then(() => clearTimeout(timeoutHandle)).catch(() => { });

    let tempReference = new TemporaryReference(deffered);
    if (typeof (message) === 'function') {
      message = message(tempReference);
    }
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
    this.clearImmediate();
    this.clearTimeout();
    this.parent && this.parent.childStopped(this);
    this.reference && dereference(this.reference);
    delete this.reference;
    delete this.parent;
    [...this.children.values()].map(stop);
    this.stopped = true;
    this.subject.complete();
  }

  get state$ () {
    console.warn('nact deprecation notice: state$ is deprecated');
    return this.subject.asObservable();
  }

  processNext (next, initial = false) {
    if (!this.stopped) {
      if (next !== undefined || initial) {
        if (this.state !== next) {
          this.subject.next(next);
        }
        this.state = next;
        if (!this.mailbox.isEmpty()) {
          let { message, sender } = this.mailbox.shift();
          this.handleMessage(message, sender);
        } else {
          this.busy = false;
          // Counter is now ticking until actor is killed
          this.setTimeout();
        }
      } else {
        this.stop();
      }
    }
  }

  signalFault (msg, sender, error) {
    if (this.parent.createSupervisionContext) {
      const ctx = this.parent.createSupervisionContext(this, msg, sender, error);
      this.parent.whenChildCrashes(this.reference, msg, error, ctx);
    } else {
      this.stop();
    }
  }

  resume () {
    this.processNext(this.state);
  }

  createSupervisionContext (child, msg, sender, error) {
    const ctx = this.createContext(sender);
    const stop = () => child.stop();
    const resume = () => child.resume();
    const stopAll = () => { [...this.children.entries()].forEach(x => x.stop()); };
    const reset = () => child.reset();
    const resetAll = () => { [...this.children.entries()].forEach(x => x.reset()); };
    const escalate = () => this.signalFault(msg, sender, error);
    return { ...ctx, stop, stopAll, reset, resetAll, escalate, resume };
  }

  createContext (sender) {
    return ({
      parent: this.parent.reference,
      path: this.path,
      self: this.reference,
      name: this.name,
      children: new Map(this.childReferences),
      sender
    });
  }

  handleMessage (message, sender) {
    this.busy = true;
    this.immediate = setImmediate(() => {
      try {
        let ctx = this.createContext(sender);
        let next = this.f.call(ctx, freeze(this.state), message, ctx);
        if (next && next.then && next.catch) {
          next.then(result => this.processNext(result)).catch(err => this.signalFault(message, sender, err));
        } else {
          this.processNext(next);
        }
      } catch (e) {
        this.signalFault(message, sender, e);
      }
    });
  }
}

const spawn = (parent, f, name, properties) =>
  applyOrThrowIfStopped(parent, p => p.assertNotStopped() && new Actor(p, name, p.system, f, properties).reference);

const spawnStateless = (parent, f, name, properties) =>
  spawn(parent, function (state, msg, ctx) {
    try {
      f.call(ctx, msg, ctx);
    } catch (e) {
      console.error(e);
    }
    return true;
  }, name, properties);

module.exports.spawn = spawn;
module.exports.spawnStateless = spawnStateless;
module.exports.Actor = Actor;

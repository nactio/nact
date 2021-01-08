
const { Deferral } = require('./deferral');
const systemMap = require('./system-map');
const { ActorReference, TemporaryReference, Nobody } = require('./references');
const Queue = require('denque');
const assert = require('assert');
const { stop } = require('./functions');
const { defaultSupervisionPolicy, SupervisionActions } = require('./supervision');

const unit = x => {};

class Actor {
  constructor (parent, name, system, f, { shutdownAfter, onCrash, initialState, initialStateFunc, afterStop } = {}) {
    this.parent = parent;
    if (!name) {
      name = `anonymous-${Math.abs(Math.random() * Number.MAX_SAFE_INTEGER) | 0}`;
    }
    if (parent.children.has(name)) {
      throw new Error(`child actor of name ${name} already exists`);
    }
    this.name = name;
    this.path = parent.path.createChildPath(this.name);
    this.system = system;
    this.afterStop = afterStop || (() => {});
    this.reference = new ActorReference(this.system.name, this.parent.reference, this.path, this.name);
    this.log = this.system.createLogger(this.reference);
    this.f = f;
    this.stopped = false;
    this.children = new Map();
    this.childReferences = new Map();
    this.busy = false;
    this.mailbox = new Queue();
    this.immediate = undefined;
    this.parent.childSpawned(this);
    this.onCrash = onCrash || defaultSupervisionPolicy;
    this.initialState = initialState;
    this.initialStateFunc = initialStateFunc;
    if (shutdownAfter) {
      if (typeof (shutdownAfter) !== 'number') {
        throw new Error('Shutdown should be specified as a number in milliseconds');
      }
      this.shutdownPeriod = Actor.getSafeTimeout(shutdownAfter);
    } else {
      this.setTimeout = unit;
    }
    this.initializeState();
    this.setTimeout();
  }

  initializeState () {
    if (this.initialStateFunc) {
      try {
        this.state = this.initialStateFunc(this.createContext(undefined));
      } catch (e) {
        this.handleFault(undefined, undefined, e);
      }
    } else {
      this.state = this.initialState;
    }
  }

  setTimeout () {
    this.timeout = setTimeout(() => this.stop(), this.shutdownPeriod);
  }

  reset () {
    [...this.children.values()].forEach(x => x.stop());
    this.initializeState();
    this.resume();
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
  afterMessage () { }

  dispatch (message, sender = new Nobody()) {
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
    const deferred = new Deferral();

    timeout = Actor.getSafeTimeout(timeout);
    const timeoutHandle = setTimeout(() => { deferred.reject(new Error('Query Timeout')); }, timeout);
    const tempReference = new TemporaryReference(this.system.name);
    this.system.addTempReference(tempReference, deferred);
    deferred.promise.then(() => {
      clearTimeout(timeoutHandle);
      this.system.removeTempReference(tempReference);
    }).catch(() => {
      this.system.removeTempReference(tempReference);
    });

    if (typeof (message) === 'function') {
      message = message(tempReference);
    }
    this.dispatch(message, tempReference);
    return deferred.promise;
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
    const context = this.createContextWithMailbox(this);

    this.clearImmediate();
    this.clearTimeout();
    this.parent && this.parent.childStopped(this);
    delete this.parent;
    [...this.children.values()].forEach(stop);
    this.stopped = true;

    setImmediate(() => this.afterStop(this.state, context));
  }

  processNext () {
    if (!this.stopped) {
      const nextMsg = this.mailbox.shift();
      if (nextMsg) {
        this.handleMessage(nextMsg.message, nextMsg.sender);
      } else {
        this.busy = false;
          // Counter is now ticking until actor is killed
        this.setTimeout();
      }
    }
  }

  async handleFault (msg, sender, error, child = undefined) {
    const ctx = this.createSupervisionContext(msg, sender, error);
    const decision = await Promise.resolve(this.onCrash(msg, error, ctx, child));
    switch (decision) {
      // Stop Self
      case SupervisionActions.stop:
        this.stop();
        break;
      // Stop Self and Peers
      case SupervisionActions.stopAll:
        [...this.parent.children.values()].forEach(x => x.stop());
        break;
      // Stop Child
      case SupervisionActions.stopChild:
        this.children.get(child.name).stop();
        break;
      // Stop All Children
      case SupervisionActions.stopAllChildren:
        [...this.children.values()].forEach(x => x.stop());
        break;
      // Resume
      case SupervisionActions.resume:
        this.resume();
        break;
      // Reset Self
      case SupervisionActions.reset:
        this.reset();
        break;
      // Reset Self and Peers
      case SupervisionActions.resetAll:
        [...this.parent.children.values()].forEach(x => x.reset());
        break;
      // Reset Child
      case SupervisionActions.resetChild:
        this.children.get(child.name).reset();
        break;
      // Reset all Children
      case SupervisionActions.resetAllChildren:
        [...this.children.values()].forEach(x => x.reset());
        break;
      // Escalate to Parent
      case SupervisionActions.escalate:
      default:
        this.parent.handleFault(msg, sender, error, this.reference);
        break;
    }
  }

  resume () {
    this.processNext();
  }

  createSupervisionContext (msg, sender, error) {
    const ctx = this.createContextWithMailbox(this);
    return { ...ctx, ...SupervisionActions };
  }

  createContextWithMailbox (sender) {
    const ctx = this.createContext(sender);
    return { ...ctx, mailbox: this.mailbox.toArray() };
  }

  createContext (sender) {
    return {
      parent: this.parent ? this.parent.reference : undefined,
      path: this.path,
      self: this.reference,
      name: this.name,
      children: new Map(this.childReferences),
      sender,
      log: this.log
    };
  }

  handleMessage (message, sender) {
    this.busy = true;
    this.immediate = setImmediate(async () => {
      try {
        let ctx = this.createContext(sender);
        let next = await Promise.resolve(this.f.call(ctx, this.state, message, ctx));
        this.state = next;
        this.afterMessage();
        this.processNext();
      } catch (e) {
        this.handleFault(message, sender, e);
      }
    });
  }
}

const spawn = (parent, f, name, properties) =>
  systemMap.applyOrThrowIfStopped(parent, p => p.assertNotStopped() && new Actor(p, name, p.system, f, properties).reference);

const spawnStateless = (parent, f, name, properties) =>
  spawn(parent, (state, msg, ctx) => f.call(ctx, msg, ctx), name, { ...properties, onCrash: (_, __, ctx) => ctx.resume });

module.exports.spawn = spawn;
module.exports.spawnStateless = spawnStateless;
module.exports.Actor = Actor;

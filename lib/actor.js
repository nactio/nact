
const { Deferral } = require('./deferral');
const systemMap = require('./system-map');
const { ActorReference, TemporaryReference, Nobody } = require('./references');
const Queue = require('denque');
const assert = require('assert');
const freeze = require('./freeze');
const { Subject } = require('rxjs');
const { stop } = require('./functions');
const { defaultSupervisionPolicy, SupervisionActions } = require('./supervision');

class Actor {
  constructor (parent, name, system, f, { shutdownAfter, onCrash } = {}) {
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
    this.reference = new ActorReference(this.system.name, this.parent.reference, this.path, this.name);
    this.log = this.system.createLogger(this.reference);
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

    this.onCrash = onCrash || defaultSupervisionPolicy;

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
    [...this.children.values()].forEach(x => x.reset());
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
    const deffered = new Deferral();

    timeout = Actor.getSafeTimeout(timeout);
    const timeoutHandle = setTimeout(() => { deffered.reject(new Error('Query Timeout')); }, timeout);
    const tempReference = new TemporaryReference(this.system.name);
    this.system.addTempReference(tempReference, deffered);
    deffered.promise.then(() => {
      clearTimeout(timeoutHandle);
      this.system.removeTempReference(tempReference);
    }).catch(() => {
      this.system.removeTempReference(tempReference);
    });

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
    delete this.parent;
    [...this.children.values()].forEach(stop);
    this.stopped = true;
    this.subject.complete();
  }

  get state$ () {
    console.error('nact deprecation notice: state$ is deprecated');
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

  async handleFault (msg, sender, error) {
    const ctx = this.createSupervisionContext(msg, sender, error);
    const decision = await Promise.resolve(this.onCrash(msg, error, ctx));
    switch (decision) {
      case SupervisionActions.stop:
        this.stop();
        break;
      case SupervisionActions.stopAll:
        [...this.parent.children.values()].forEach(x => x.stop());
        break;
      case SupervisionActions.resume:
        this.resume();
        break;
      case SupervisionActions.reset:
        this.reset();
        break;
      case SupervisionActions.resetAll:
        [...this.parent.children.values()].forEach(x => x.reset());
        break;
      case SupervisionActions.escalate:
      default:
        this.parent.handleFault(this, msg, sender, error);
        break;
    }
  }

  resume () {
    this.processNext(this.state, true);
  }

  createSupervisionContext (msg, sender, error) {
    const ctx = this.createContext(this);
    return { ...ctx, ...SupervisionActions };
  }

  createContext (sender) {
    return {
      parent: this.parent.reference,
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
    this.immediate = setImmediate(() => {
      try {
        let ctx = this.createContext(sender);
        let next = this.f.call(ctx, freeze(this.state), message, ctx);
        if (next && next.then && next.catch) {
          next.then(result => this.processNext(result)).catch(err => this.handleFault(message, sender, err));
        } else {
          this.processNext(next);
        }
      } catch (e) {
        this.handleFault(this, message, sender, e);
      }
    });
  }
}

const spawn = (parent, f, name, properties) =>
  systemMap.applyOrThrowIfStopped(parent, p => p.assertNotStopped() && new Actor(p, name, p.system, f, properties).reference);

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

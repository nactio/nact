require('rxjs');
const { Actor } = require('./Actor');
const { applyOrThrowIfTerminated } = require('./references');

class PersistentActor extends Actor {
  constructor (parent, name, system, f, persistenceKey) {
    super(parent, name, system, f);
    if (!persistenceKey) {
      throw new Error(`Persistence key required`);
    }
    super.busy = true;
    this.persistenceKey = persistenceKey;
    this.recover();
  }

  recover () {
    try {
      const recoveryEpic$ = this.system.persistenceEngine.events(this.persistenceKey);
      recoveryEpic$
        .reduce((f, msg) => f(msg, { ...super.createContext(this.reference), recovering: true }), this.f)
        .subscribe(f => this.processNext(f))
        .catch(e => this.signalFault(e));
    } catch (e) {
      this.signalFault(e);
    }
  }

  createContext () {
    const persist = (msg) => Promise.resolve(this.system.persistenceEngine.persist(this.persistenceKey, msg));
    return { ...super.createContext.apply(this, arguments), persist };
  }
}

module.exports.spawnPersistent = (reference, f, persistenceKey, name) =>
  applyOrThrowIfTerminated(reference, parent => new PersistentActor(parent, name, parent.system, f, persistenceKey).reference);

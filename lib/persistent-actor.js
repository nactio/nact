require('rxjs');
const { Actor } = require('./Actor');

const recover = (persistentActor, initialState) => {
  try {
    const recoveryEpic$ = persistentActor.system.persistenceEngine.events(persistentActor.persistenceKey);
    recoveryEpic$
      .reduce((f, msg) => f(msg), this.f)
      .subscribe(f => {
        persistentActor.busy = false;
        persistentActor.processNext(f);
      }).catch(e => persistentActor.signalFault(e));
  } catch (e) {
    persistentActor.signalFault(e);
  }
};

class PersistentActor extends Actor {
  constructor (parent, name, system, f, persistenceKey, initialState) {
    super(parent, name, system, f);
    if (!persistenceKey) {
      throw new Error(`Persistence key required`);
    }
    super.busy = true;
    this.persistenceKey = persistenceKey;
    recover(this, initialState);
  }

  createContext () {
    const persist = (msg) => Promise.resolve(this.system.persistenceEngine.persist(this.persistenceKey, msg));
    return { ...super.createContext.apply(this, arguments), persist };
  }
}

module.exports.PersistentActor = PersistentActor;

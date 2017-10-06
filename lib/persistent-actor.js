require('rxjs');
const { Actor } = require('./Actor');
const { applyOrThrowIfTerminated } = require('./references');
const { AbstractPersistenceEngine, PersistedEvent } = require('./persistence-engine');

class PersistentActor extends Actor {
  constructor (parent, name, system, f, persistenceKey) {
    super(parent, name, system, f);

    if (!persistenceKey) {
      throw new Error('Persistence key required');
    } else if (typeof (persistenceKey) !== 'string') {
      throw new Error('Persistence key must be a string');
    }

    if (!!this.system.persistenceEngine || !(this.system.persistenceEngine instanceof AbstractPersistenceEngine)) {
      throw new TypeError('Provided persistence engine does not extend the AbstractPersistenceEngine or is not provided');
    }

    this.sequenceNumber = 0;
    this.busy = true;
    this.persistenceKey = persistenceKey;
    this.recover();
  }

  recover () {
    try {
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      const recoveryEpic$ = this.system.persistenceEngine.events(this.persistenceKey);
      recoveryEpic$
        .reduce(([f, _], msg, index) => [f(msg.data, { ...super.createContext(this.reference), recovering: true }), index + 1], [this.f, 0])
        .subscribe(([f, seqNum]) => {
          this.seqNum = seqNum;
          this.processNext(f);
        })
        .catch(e => this.signalFault(e));
    } catch (e) {
      this.signalFault(e);
    }
  }

  persist (msg, tags = []) {
    const persistedEvent = new PersistedEvent(msg, ++this.sequenceNumber, this.persistenceKey, tags);
    return Promise.resolve(this.system.persistenceEngine.persist(persistedEvent));
  }

  createContext () {
    return { ...super.createContext.apply(this, arguments), persist: this.persist };
  }
}

const spawnPersistent = (reference, f, persistenceKey, name) =>
  applyOrThrowIfTerminated(reference, parent => new PersistentActor(parent, name, parent.system, f, persistenceKey).reference);

module.exports.spawnPersistent = spawnPersistent;

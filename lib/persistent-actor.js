require('rxjs');
const { PersistedEvent } = require('./persistence-engine');
const { Actor } = require('./actor');

class PersistentActor extends Actor {
  constructor (parent, name, system, f, key, persistenceEngine) {
    super(parent, name, system, f);
    if (!key) {
      throw new Error('Persistence key required');
    }
    if (typeof (key) !== 'string') {
      throw new Error('Persistence key must be a string');
    }

    this.persistenceEngine = persistenceEngine;
    this.sequenceNumber = 0;
    this.busy = true;
    this.key = key;
    this.immediate = setImmediate(this.recover.bind(this));
  }

  recover () {
    try {
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      const initialState = Promise.resolve([(this.f), 0]);
      const recoveryEpic$ =
        this.persistenceEngine.events(this.key)
          .distinct(evt => evt.sequenceNumber)
          .reduce(async (prev, msg, index) => {
            const [f] = await prev;
            // Might not be an async function. Using promise.resolve to force it into that form
            const nextF = await Promise.resolve(
              f(msg.data, { ...this.createContext(this.reference), recovering: true })
            );
            return [nextF, index + 1];
          }, initialState);

      recoveryEpic$.subscribe(async (result) => {
        const [f, seqNum] = await result;
        this.seqNum = seqNum;
        this.processNext(f);
      });
    } catch (e) {
      this.signalFault(e);
    }
  }

  async persist (msg, tags = []) {
    const persistedEvent = new PersistedEvent(msg, ++this.sequenceNumber, this.key, tags);
    return (await (this.persistenceEngine.persist(persistedEvent))).data;
  }

  createContext () {
    return { ...super.createContext.apply(this, arguments), persist: this.persist.bind(this) };
  }
}

const { applyOrThrowIfTerminated } = require('./references');
const spawnPersistent = (reference, f, key, name) =>
  applyOrThrowIfTerminated(
    reference,
    parent => applyOrThrowIfTerminated(
      parent.system,
      system => new PersistentActor(parent, name, parent.system, f, key, system.persistenceEngine)
    ).reference
  );

module.exports.spawnPersistent = spawnPersistent;

require('rxjs');
const { PersistedEvent } = require('./persistence-engine');
const { Actor } = require('../actor');
const { Promise } = require('bluebird');
const freeze = require('deep-freeze-node');

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
    setImmediate(this.recover.bind(this));
  }

  recover () {
    try {
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      const initialState = undefined;

      this.persistenceEngine.events(this.key)
        .distinct(evt => evt.sequenceNumber)
        .reduce(
          async (prev, msg, index) => {
            const [state] = await prev;
            const context = { ...this.createContext(this.reference), recovering: true };
              // Might not be an async function. Using promise.resolve to force it into that form
            const nextState = await Promise.resolve(this.f.call(context, freeze(state), msg.data, context));
            return [nextState, index + 1];
          },
          Promise.resolve([initialState, 0])
        )
        .subscribe(async (result) => {
          const [state, sequenceNumber] = await result;
          this.sequenceNumber = sequenceNumber;
          this.processNext(state, sequenceNumber === 0);
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

const { applyOrThrowIfStopped } = require('../references');
const spawnPersistent = (reference, f, key, name) =>
  applyOrThrowIfStopped(
    reference,
    parent => applyOrThrowIfStopped(
      parent.system,
      system => new PersistentActor(parent, name, parent.system, f, key, system.persistenceEngine)
    ).reference
  );

module.exports.spawnPersistent = spawnPersistent;

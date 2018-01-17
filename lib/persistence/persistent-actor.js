require('rxjs');
const { PersistedEvent, PersistedSnapshot } = require('./persistence-engine');
const { Actor } = require('../actor');
const freeze = require('../freeze');
const { applyOrThrowIfStopped } = require('../system-map');

class PersistentActor extends Actor {
  constructor (parent, name, system, f, key, persistenceEngine, { snapshotEvery, ...properties } = {}) {
    super(parent, name, system, f, properties);
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

    if (snapshotEvery) {
      if (typeof (snapshotEvery) !== 'number') {
        throw new Error('Shutdown should be specified as a number. The value indicates how many persisted messages ');
      }
      this.snapshotMessageInterval = snapshotEvery;
    }

    setImmediate(() => this.recover());
  }

  recover () {
    try {
      this.clearTimeout();
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      this.persistenceEngine.latestSnapshot(this.key).then((snapshot) => {
        let sequenceNumber = 0;
        let initialState;
        if (snapshot) {
          initialState = snapshot.data;
          sequenceNumber = snapshot.sequenceNumber;
        }

        this.persistenceEngine.events(this.key, sequenceNumber)
          .distinct(evt => evt.sequenceNumber)
          .reduce(async (prev, msg, index) => {
            const [state] = await prev;
            const context = { ...this.createContext(this.reference), recovering: true };
            // Might not be an async function. Using promise.resolve to force it into that form
            const nextState = await Promise.resolve(this.f.call(context, freeze(state), msg.data, context));
            return [nextState, msg.sequenceNumber, index];
          }, Promise.resolve([initialState, sequenceNumber, 0]))
          .subscribe(async (result) => {
            // Message count can be different to sequenceNumber if events have been deleted from the database
            const [state, sequenceNumber, messageCount] = await result;
            this.sequenceNumber = sequenceNumber;

            if (this.snapshotMessageInterval) {
              this.messagesToNextSnapshot = this.snapshotMessageInterval - messageCount;
            }

            this.processNext(state, sequenceNumber === 0);
          });
      });
    } catch (e) {
      this.parent.handleFault(this, undefined, undefined, e);
    }
  }

  async takeSnapshot (state, sequenceNumber, key) {
    try {
      const snapshot = new PersistedSnapshot(state, sequenceNumber, key);
      await this.persistenceEngine.takeSnapshot(snapshot);
    } catch (e) {
      console.error(`Failed to take snapshot ${e}`);
    }
  }

  async persist (msg, tags = []) {
    if (this.snapshotMessageInterval) {
      --this.messagesToNextSnapshot;
      if (this.messagesToNextSnapshot <= 0) {
        this.messagesToNextSnapshot = this.snapshotMessageInterval;
        const sequenceNumber = this.sequenceNumber;
        const state = this.state;
        const key = this.key;
        this.takeSnapshot(state, sequenceNumber, key);
      }
    }
    const persistedEvent = new PersistedEvent(msg, ++this.sequenceNumber, this.key, tags);
    return (await (this.persistenceEngine.persist(persistedEvent))).data;
  }

  createContext () {
    return { ...super.createContext.apply(this, arguments), persist: this.persist.bind(this) };
  }
}

const spawnPersistent = (parent, f, key, name, properties) =>
  applyOrThrowIfStopped(
    parent,
    p => (new PersistentActor(p, name, p.system, f, key, p.system.persistenceEngine, properties)).reference
  );

module.exports.spawnPersistent = spawnPersistent;

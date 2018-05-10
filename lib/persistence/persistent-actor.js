const { PersistedEvent, PersistedSnapshot } = require('./persistence-engine');
const { Actor } = require('../actor');
const { applyOrThrowIfStopped } = require('../system-map');
const id = x => x;

class PersistentActor extends Actor {
  constructor (parent, name, system, f, key, persistenceEngine, { snapshotEvery, snapshotEncoder = id, snapshotDecoder = id, encoder = id, decoder = id, ...properties } = {}) {
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
    this.snapshotDecoder = snapshotDecoder;
    this.snapshotEncoder = snapshotEncoder;
    this.decoder = decoder;
    this.encoder = encoder;

    if (snapshotEvery) {
      if (typeof (snapshotEvery) !== 'number') {
        throw new Error('Shutdown should be specified as a number. The value indicates how many persisted messages ');
      }
      this.snapshotMessageInterval = snapshotEvery;
    }

    this.immediate = setImmediate(() => this.recover());
  }

  postMessage () {
    if (this.snapshotMessageInterval && this.messagesToNextSnapshot <= 0) {
      this.messagesToNextSnapshot = this.snapshotMessageInterval;
      const sequenceNumber = this.sequenceNumber;
      const key = this.key;
      this.takeSnapshot(this.state, sequenceNumber, key);
    }
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
          initialState = this.snapshotDecoder(snapshot.data);
          sequenceNumber = snapshot.sequenceNumber;
        }

        this.persistenceEngine
          .events(this.key, sequenceNumber)
          .reduce(async (prev, msg, index) => {
            const [state, prevIndex] = await prev;
            if (msg.isDeleted) {
              return [state, prevIndex, msg.sequenceNumber];
            } else {
              const decodedMsg = this.decoder(msg.data);
              const context = { ...this.createContext(this.reference), recovering: true };
              // Might not be an async function. Using promise.resolve to force it into that form
              const nextState = await Promise.resolve(this.f.call(context, state, decodedMsg, context));
              return [nextState, index, msg.sequenceNumber];
            }
          }, Promise.resolve([initialState, 0, sequenceNumber]))
          .then(async (result) => {
            // Message count can be different to sequenceNumber if events have been deleted from the database
            const [state, messageCount, sequenceNumber] = await result;
            this.sequenceNumber = sequenceNumber;
            this.messagesToNextSnapshot = this.snapshotMessageInterval - messageCount;
            this.state = state;
            this.processNext();
          });
      });
    } catch (e) {
      this.parent.handleFault(this, undefined, undefined, e);
    }
  }

  async takeSnapshot (state, sequenceNumber, key) {
    const snapshotState = this.snapshotEncoder(state);
    try {
      const snapshot = new PersistedSnapshot(snapshotState, sequenceNumber, key);
      await this.persistenceEngine.takeSnapshot(snapshot);
    } catch (e) {
      console.error(`Failed to take snapshot ${e}`);
    }
  }

  reset () {
    this.state = undefined;
    this.busy = true;
    this.sequenceNumber = 0;
    [...this.children.values()].forEach(x => x.stop());
    this.immediate = setImmediate(() => this.recover());
  }

  async persist (msg, tags = []) {
    --this.messagesToNextSnapshot;
    const persistedEvent = new PersistedEvent(this.encoder(msg), ++this.sequenceNumber, this.key, tags);
    await (this.persistenceEngine.persist(persistedEvent));
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

require('rxjs');
const { PersistedEvent, PersistedSnapshot } = require('./persistence-engine');
const { Actor } = require('../actor');
const { Promise } = require('bluebird');
const freeze = require('deep-freeze-node');

class PersistentActor extends Actor {
  constructor (parent, name, system, f, key, persistenceEngine, { snapshot, ...properties } = {}) {
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

    if (snapshot) {
      this.snapshotDuration = snapshot.duration ? Actor.getSafeTimeout(snapshot.duration) : false;
      this.snapshotMessageInterval = snapshot.messageInterval || false;
      if (!this.snapshotMessageInterval && !this.snapshotDuration) {
        throw new Error('Snapshot requires a duration and/or messages field. Correctly specifying the snapshot rule is most easily done using every()');
      }
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

            this.resetSnapshotInterval();
            this.processNext(state, sequenceNumber === 0);
          });
      });
    } catch (e) {
      this.signalFault(e);
    }
  }

  resetSnapshotInterval () {
    if (this.snapshotDuration) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = setInterval(async () => {
        const snapshot = new PersistedSnapshot(this.state, this.sequenceNumber, this.key);
        this.messagesToNextSnapshot = this.snapshotMessageInterval;
        try {
          await this.persistenceEngine.takeSnapshot(snapshot);
        } catch (e) {
          console.error(`Failed to save snapshot ${e}`);
        }
      }, this.snapshotDuration);
    }
  }

  async processNext (next, initial = false) {
    if (!this.stopped && this.snapshotMessageInterval && !initial) {
      --this.messagesToNextSnapshot;
      if (this.messagesToNextSnapshot <= 0) {
        this.resetSnapshotInterval();
        this.messagesToNextSnapshot = this.snapshotMessageInterval;
        await this.takeSnapshot(next);
      }
    }
    super.processNext(next, initial);
  }

  async takeSnapshot (state) {
    try {
      const snapshot = new PersistedSnapshot(state, this.sequenceNumber, this.key);
      await this.persistenceEngine.takeSnapshot(snapshot);
    } catch (e) {
      console.error(`Failed to take snapshot ${e}`);
    }
  }

  async persist (msg, tags = []) {
    const persistedEvent = new PersistedEvent(msg, ++this.sequenceNumber, this.key, tags);
    return (await (this.persistenceEngine.persist(persistedEvent))).data;
  }

  stop () {
    super.stop();
    clearInterval(this.snapshotInterval);
  }

  createContext () {
    return { ...super.createContext.apply(this, arguments), persist: this.persist.bind(this) };
  }
}

const { applyOrThrowIfStopped } = require('../references');
const spawnPersistent = (reference, f, key, name, properties) =>
  applyOrThrowIfStopped(
    reference,
    parent => applyOrThrowIfStopped(
      parent.system,
      system => new PersistentActor(parent, name, parent.system, f, key, system.persistenceEngine, properties)
    ).reference
  );

module.exports.spawnPersistent = spawnPersistent;

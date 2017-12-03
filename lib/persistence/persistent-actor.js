require('rxjs');
const Rx = require('rxjs');
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
      this.snapshotDuration = snapshot.duration || false;
      this.snapshotMessageInterval = snapshot.messageInterval || false;
      if (!this.snapshotMessageInterval && !this.snapshotDuration) {
        throw new Error('Snapshot requires a duration and/or messages field. Correctly specifying the snapshot rule is most easily done using every()');
      }
    }

    setImmediate(() => this.recover());
  }

  recover () {
    try {
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
          .reduce(
          async (prev, msg, index) => {
            const [state] = await prev;
            const context = { ...this.createContext(this.reference), recovering: true };
            // Might not be an async function. Using promise.resolve to force it into that form
            const nextState = await Promise.resolve(this.f.call(context, freeze(state), msg.data, context));
            return [nextState, msg.sequenceNumber, index];
          },
          Promise.resolve([initialState, sequenceNumber, 0])
          )
          .subscribe(async (result) => {
            const [state, sequenceNumber, messageCount] = await result;
            this.sequenceNumber = sequenceNumber;
            if (this.snapshotMessageInterval) {
              this.messagesToNextSnapshot = this.snapshotMessageInterval - messageCount;
            }
            if (this.snapshotDuration) {
              // If instructed to snapshot at regular intervals, create an interval observable which emits until actor is stopped
              this.stop$ = new Rx.Subject();
              Rx.Observable
                .interval(this.snapshotDuration)
                .takeUntil(this.stop$)
                .subscribe(async () => {
                  const sequenceNumber = this.sequenceNumber;
                  const state = this.state;
                  await this.persistenceEngine.takeSnapshot(new PersistedSnapshot(state, sequenceNumber, this.key));
                });
            }
            this.processNext(state, sequenceNumber === 0);
          });
      });
    } catch (e) {
      this.signalFault(e);
    }
  }

  async processNext (next, initial = false) {
    if (!this.stopped && this.snapshotMessageInterval && !initial) {
      --this.messagesToNextSnapshot;
      if (this.messagesToNextSnapshot <= 0) {
        this.messagesToNextSnapshot = this.snapshotMessageInterval;
        const snapshot = new PersistedSnapshot(next, this.sequenceNumber, this.key);
        try {
          await this.persistenceEngine.takeSnapshot(snapshot);
        } catch (e) {
          console.error(`Failed to take snapshot ${e}`);
        }
      }
    }
    super.processNext(next, initial);
  }

  async persist (msg, tags = []) {
    const persistedEvent = new PersistedEvent(msg, ++this.sequenceNumber, this.key, tags);
    return (await (this.persistenceEngine.persist(persistedEvent))).data;
  }

  stop () {
    super.stop();
    if (this.stop$) {
      this.stop$.next(false);
      this.stop$.complete();
    }
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

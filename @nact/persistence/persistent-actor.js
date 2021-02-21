const { PersistedEvent, PersistedSnapshot } = require('./persistence-engine');
const { Actor } = require('../actor');
const { applyOrThrowIfStopped } = require('../system-map');
const { SupervisionActions } = require('../supervision');
const id = x => x;
const unit = x => { };

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
    if (!snapshotEvery) {
      this.afterMessage = unit;
      this.snapshotEvery = Number.POSITIVE_INFINITY;
    } else if (typeof (snapshotEvery) !== 'number') {
      throw new Error('snapshotEvery should be specified as a number. The value indicates how many messages are persisted between snapshots');
    } else {
      this.snapshotEvery = snapshotEvery;
    }
    this.immediate = setImmediate(() => this.recover());
  }

  afterMessage () {
    if (this.messagesToNextSnapshot <= 0) {
      const snapshotState = this.snapshotEncoder(this.state);
      this.messagesToNextSnapshot = this.snapshotEvery;
      const sequenceNumber = this.sequenceNumber;
      const key = this.key;
      const snapshot = new PersistedSnapshot(snapshotState, sequenceNumber, key);
      return this.persistenceEngine.takeSnapshot(snapshot).catch(e => console.log('Failed to take snapshot due to error: ', e));
    }
  }

  async handleFaultedRecovery (msg, sender, error) {
    const ctx = this.createSupervisionContext(msg, sender, error);
    const decision = await Promise.resolve(this.onCrash(msg, error, ctx));
    switch (decision) {
      case SupervisionActions.stop:
        this.stop();
        return false;
      case SupervisionActions.stopAll:
        [...this.parent.children.values()].forEach(x => x.stop());
        return false;
      case SupervisionActions.resume:
        return true;
      case SupervisionActions.reset:
        console.warn('Resetting during recovery is not a recommended supervision policy');
        this.reset();
        return false;
      case SupervisionActions.resetAll:
        console.warn('Resetting during recovery is not a recommended supervision policy');
        [...this.parent.children.values()].forEach(x => x.reset());
        return false;
      case SupervisionActions.escalate:
      default:
        this.parent.handleFault(msg, sender, error, this);
        return false;
    }
  }

  async recover () {
    try {
      this.clearTimeout();
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      let snapshot = await this.persistenceEngine.latestSnapshot(this.key);

      if (snapshot) {
        this.state = this.snapshotDecoder(snapshot.data);
        this.sequenceNumber = snapshot.sequenceNumber;
      }

      let result = await this.persistenceEngine
        .events(this.key, this.sequenceNumber)
        .reduce(async (prev, msg, index) => {
          if (await prev) {
            const [state, prevIndex] = await prev;
            if (msg.isDeleted) {
              return [state, prevIndex, msg.sequenceNumber];
            } else {
              const decodedMsg = this.decoder(msg.data);
              const context = { ...this.createContext(this.reference), recovering: true };
              try {
                // Might not be an async function. Using promise.resolve to force it into that form
                const nextState = await Promise.resolve(this.f.call(context, state, decodedMsg, context));
                return [nextState, index, msg.sequenceNumber];
              } catch (e) {
                let shouldContinue = await this.handleFaultedRecovery(decodedMsg, undefined, e);
                if (shouldContinue) {
                  return [state, prevIndex, msg.sequenceNumber];
                }
              }
            }
          }
        }, Promise.resolve([this.state, 0, this.sequenceNumber]));
      if (result) {
        const [state, messageCount, seq] = result;
        this.sequenceNumber = seq;
        this.messagesToNextSnapshot = this.snapshotEvery - messageCount;
        this.state = state;
        this.afterMessage();
        this.processNext();
      }
    } catch (e) {
      this.handleFault(undefined, undefined, e);
    }
  }

  reset () {
    this.initializeState();
    this.busy = true;
    this.sequenceNumber = 0;
    [...this.children.values()].forEach(x => x.stop());
    this.immediate = setImmediate(() => this.recover());
  }

  async persist (msg, tags = [], ...properties) {
    --this.messagesToNextSnapshot;
    const persistedEvent = new PersistedEvent(this.encoder(msg), ++this.sequenceNumber, this.key, tags);
    await (this.persistenceEngine.persist(persistedEvent, ...properties));
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

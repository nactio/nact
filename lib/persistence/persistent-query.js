const { PersistedSnapshot } = require('./persistence-engine');
const { applyOrThrowIfStopped } = require('../system-map');
const id = x => x;
const unit = x => { };
const unitPromise = x => Promise.resolve();

class PersistentQuery {
  constructor (system, f, key, persistenceEngine, { snapshotKey, snapshotEvery, cacheDuration, snapshotEncoder = id, snapshotDecoder = id, encoder = id, decoder = id, initialState } = {}) {
    if (!key) {
      throw new Error('Persistence key required');
    }
    if (typeof (key) !== 'string') {
      throw new Error('Persistence key must be a string');
    }
    this.persistenceEngine = persistenceEngine;
    this.initialState = initialState;
    this.clearCache();
    this.proxy = new Proxy(unit, {
      apply: () => {
        if (!this.promise) {
          this.promise = this.query();
        } else {
          this.resetTimeout();
        }
        return this.promise;
      }
    });
    this.f = f;
    this.key = key;
    this.snapshotKey = snapshotKey;
    if (!snapshotKey) {
      this.latestSnapshot = () => { this.snapshotRestored = true; return Promise.resolve(); };
    } else if (typeof (snapshotKey) !== 'string') {
      throw new Error('snapshotKey must be of type string');
    }
    this.snapshotDecoder = snapshotDecoder;
    this.snapshotEncoder = snapshotEncoder;
    this.decoder = decoder;
    this.encoder = encoder;
    this.promise = undefined;

    if (!snapshotEvery) {
      this.takeSnapshot = unitPromise;
      this.snapshotEvery = Number.POSITIVE_INFINITY;
    } else if (typeof (snapshotEvery) !== 'number') {
      throw new Error('snapshotEvery should be specified as a number. The value indicates how many messages are persisted between snapshots');
    } else if (!snapshotKey) {
      throw new Error('snapshotKey must be specified in order to enable snapshotting');
    } else {
      this.snapshotEvery = snapshotEvery;
      this.messagesToNextSnapshot = snapshotEvery;
    }
    if (!cacheDuration) {
      this.setTimeout = unit;
    } else if (typeof (cacheDuration) !== 'number') {
      throw new Error('cacheDuration should be specified as a number in milliseconds');
    } else {
      this.cacheDuration = PersistentQuery.getSafeTimeout(cacheDuration);
      this.setTimeout();
    }
  }

  clearCache () {
    this.state = this.initialState;
    this.sequenceNumber = 0;
    this.messagesToNextSnapshot = undefined;
    this.snapshotRestored = false;
    this.promise = undefined;
  }

  static getSafeTimeout (timeoutDuration) {
    timeoutDuration = timeoutDuration | 0;
    const MAX_TIMEOUT = 2147483647;
    return Math.min(MAX_TIMEOUT, timeoutDuration);
  }

  setTimeout () {
    this.timeout = setTimeout(() => this.clearCache(), this.cacheDuration);
  }

  clearTimeout () {
    clearTimeout(this.timeout);
  }

  resetTimeout () {
    this.clearTimeout();
    this.setTimeout();
  }

  async takeSnapshot () {
    if (this.messagesToNextSnapshot <= 0) {
      const snapshotState = this.snapshotEncoder(this.state);
      const sequenceNumber = this.sequenceNumber;
      const key = this.snapshotKey;
      try {
        const snapshot = new PersistedSnapshot(snapshotState, sequenceNumber, key);
        await this.persistenceEngine.takeSnapshot(snapshot);
        this.messagesToNextSnapshot = this.snapshotEvery;
      } catch (e) {
        console.log(`Failed to take snapshot ${e}`);
      }
    }
  }

  async latestSnapshot () {
    if (!this.snapshotRestored) {
      const snapshot = await this.persistenceEngine.latestSnapshot(this.snapshotKey);
      if (snapshot) {
        this.state = this.snapshotDecoder(snapshot.data);
        this.sequenceNumber = snapshot.sequenceNumber;
      }
      this.messagesToNextSnapshot = this.snapshotEvery;
      this.snapshotRestored = true;
    }
  }

  async query () {
    try {
      this.clearTimeout();
      await this.latestSnapshot();
      let result = await this.persistenceEngine
        .events(this.key, this.sequenceNumber)
        .reduce(async (prev, msg, index) => {
          const [state, prevIndex] = await prev;
          if (msg.isDeleted) {
            return [state, prevIndex, msg.sequenceNumber];
          } else {
            const decodedMsg = this.decoder(msg.data);
            // Might not be an async function. Using promise.resolve to force it into that form
            const nextState = await Promise.resolve(this.f.call(undefined, state, decodedMsg));
            return [nextState, index, msg.sequenceNumber];
          }
        }, Promise.resolve([this.state, 0, this.sequenceNumber]));
      const [state, messageCount, seq] = result;
      this.sequenceNumber = seq;
      this.messagesToNextSnapshot -= messageCount;
      this.state = state;
      this.takeSnapshot();
      this.promise = undefined;
      this.resetTimeout();
      return state;
    } catch (e) {
      this.clearCache();
      throw e;
    }
  }
}

const persistentQuery = (parent, f, key, properties) =>
  applyOrThrowIfStopped(
    parent,
    parent => new PersistentQuery(parent.system, f, key, parent.system.persistenceEngine, properties).proxy
  );

module.exports.persistentQuery = persistentQuery;

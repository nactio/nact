/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { MockPersistenceEngine } = require('./mock-persistence-engine');
const { BrokenPersistenceEngine } = require('./broken-persistence-engine');
const { PartiallyBrokenPersistenceEngine } = require('./partially-broken-persistence-engine');
const { start, stop, persistentQuery } = require('../lib');
const { PersistedEvent, PersistedSnapshot, configurePersistence } = require('../lib/persistence');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const delay = (duration) => new Promise((resolve, reject) => setTimeout(() => resolve(), duration));

const ignore = () => { };

const retry = async (assertion, remainingAttempts, retryInterval = 0) => {
  if (remainingAttempts <= 1) {
    return assertion();
  } else {
    try {
      assertion();
    } catch (e) {
      await delay(retryInterval);
      await retry(assertion, remainingAttempts - 1, retryInterval);
    }
  }
};

const concatenativeFunction = (initialState, additionalActions = ignore) =>
  async function (state = initialState, msg) {
    await Promise.resolve(additionalActions(state, msg));
    return state + msg;
  };

describe('PersistentQuery', () => {
  let system;

  afterEach(function () {
    // reset console
    delete console.error;
    system && stop(system);
  });

  it('should return undefined if no previous events', async function () {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      (concatenativeFunction('')),
      'test'
    );
    (await query() === undefined).should.equal(true);
  });

  it('must have a persistentKey of type string', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    (() => persistentQuery(system, ignore, undefined)).should.throw(Error);
    (() => persistentQuery(system, ignore, null)).should.throw(Error);
    (() => persistentQuery(system, ignore, 1)).should.throw(Error);
    (() => persistentQuery(system, ignore, [])).should.throw(Error);
    (() => persistentQuery(system, ignore, {})).should.throw(Error);
    (() => persistentQuery(system, ignore, Symbol('A'))).should.throw(Error);
  });

  it('must have a snapshotKey of type string', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    (() => persistentQuery(system, ignore, 'abc', { snapshotEvery: 1, snapshotKey: undefined })).should.throw(Error);
    (() => persistentQuery(system, ignore, 'abc', { snapshotEvery: 1, snapshotKey: null })).should.throw(Error);
    (() => persistentQuery(system, ignore, 'abc', { snapshotEvery: 1, snapshotKey: 1 })).should.throw(Error);
    (() => persistentQuery(system, ignore, 'abc', { snapshotEvery: 1, snapshotKey: [] })).should.throw(Error);
    (() => persistentQuery(system, ignore, 'abc', { snapshotEvery: 1, snapshotKey: {} })).should.throw(Error);
    (() => persistentQuery(system, ignore, 'abc', { snapshotEvery: 1, snapshotKey: Symbol('A') })).should.throw(Error);
  });

  it('should be able to replay previously persisted events', async () => {
    const expectedResult = '1234567890';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
    const persistenceEngine = new MockPersistenceEngine({ test: events });
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'test'
    );
    (await query()).should.equal(expectedResult);
  });

  it('should be able to skip deleted events', async () => {
    const prevResult = '1234567890';
    const expectedResult = '123456789';
    const events = [...prevResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test', undefined, undefined, evt === '0'));
    const persistenceEngine = new MockPersistenceEngine({ test: events });
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'test'
    );
    (await query()).should.equal(expectedResult);
  });

  it('should signal an error if creating restore stream fails', () => {
    console.error = ignore;
    const persistenceEngine = new BrokenPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    persistentQuery(system, ignore, 'frog')().should.eventually.throw(Error);
  });

  it('should signal an error if restore stream fails midway through recovery', () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new PartiallyBrokenPersistenceEngine({ frog: events }, 5);
    system = start(configurePersistence(persistenceEngine));
    persistentQuery(system, ignore, 'frog')().should.eventually.throw(Error);
  });

  it('should be able to restore a snapshot and replay events exluding those that were persisted before the snapshot', async () => {
    const previousState = 'icelandiscold';
    const expectedState = 'greenlandiscold';
    const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, { iceland2: [new PersistedSnapshot('green', 3, 'iceland2')] });
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'iceland',
      { snapshotKey: 'iceland2' }
    );
    (await query()).should.equal(expectedState);
    (await query()).should.equal(expectedState);
  });

  it('should be able to persist a snapshot after a given number of messages', async () => {
    const expectedResult = 'iceland\'s cold!';
    const previousEvents = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, {});
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'iceland',
      { snapshotEvery: 5, snapshotKey: 'test' }
    );
    (await query()).should.equal(expectedResult);
    await retry(() => {
      const snapshots = persistenceEngine._snapshots['test'];
      snapshots.length.should.equal(1);
      snapshots[0].data.should.equal(expectedResult);
    }, 10);
  });

  it('should not persist a snapshot before a given number of messages', async () => {
    const expectedResult = 'iceland\'s cold!';
    const previousEvents = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, {});
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'iceland',
      { snapshotEvery: expectedResult.length + 1, snapshotKey: 'test' }
    );
    (await query()).should.equal(expectedResult);
    await retry(() => {
      const snapshots = persistenceEngine._snapshots['test'] || [];
      snapshots.length.should.equal(0);
    }, 10);
  });

  it('should be able to replay previously persisted events and then when called again, use new events', async () => {
    const initialResults = '12345678910';
    const additionalResults = '1112131415';
    const events = [...initialResults].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
    const persistenceEngine = new MockPersistenceEngine({ test: events });
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'test'
    );
    (await query()).should.equal(initialResults);
    events.push(...([...additionalResults].map((evt, i) => new PersistedEvent(evt, initialResults.length + i + 1, 'test'))));
    (await query()).should.equal(initialResults + additionalResults);
  });
  it('should be able to continue processing messages even after failing to save a snapshot when snapshotting', async () => {
    console.error = ignore;
    const expectedResult = '12345678910';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: events }, undefined, false);
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'iceland',
      { snapshotEvery: 5, snapshotKey: 'test' }
    );
    (await query()).should.equal(expectedResult);
  });
  it('should set cacheDuration to a safe default if it is very large', async () => {
    const expectedResult = '1234567890';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: events });
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction(''),
      'iceland',
      { snapshotEvery: 5, snapshotKey: 'test', cacheDuration: Number.MAX_SAFE_INTEGER }
    );
    (await query()).should.equal(expectedResult);
  });
  it('should return the same promise if the query has not yet returned', async () => {
    const expectedResult = '1234567890';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: events });
    system = start(configurePersistence(persistenceEngine));
    const query = persistentQuery(
      system,
      concatenativeFunction('', () => delay(1000)),
      'iceland',
      { snapshotEvery: 5, snapshotKey: 'test' }
    );
    (query()).should.equal(query());
  });
  it('should throw an error if snapshotEvery is not a number', () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    (() => persistentQuery(
      system,
      concatenativeFunction('', () => delay(1000)),
      'iceland',
      { snapshotEvery: 'a', snapshotKey: 'test' }
    )).should.throw(Error);
  });

  it('should reject if the query fails', () => {
    const expectedResult = '12345678910';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: events }, undefined, false);
    system = start(configurePersistence(persistenceEngine));
    persistentQuery(
      system,
      concatenativeFunction('', () => { throw new Error('e'); }),
      'iceland'
    )().should.eventually.throw(Error);
  });
  it('should throw an error if cacheDuration is not a number', () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    (() => persistentQuery(
      system,
      concatenativeFunction('', () => delay(1000)),
      'iceland',
      { cacheDuration: {}, snapshotKey: 'test' }
    )).should.throw(Error);
  });
});

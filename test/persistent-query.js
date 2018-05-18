/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { MockPersistenceEngine } = require('./mock-persistence-engine');
// const { BrokenPersistenceEngine } = require('./broken-persistence-engine');
// const { PartiallyBrokenPersistenceEngine } = require('./partially-broken-persistence-engine');
const { start, dispatch, stop, persistentQuery } = require('../lib');
const { configurePersistence } = require('../lib/persistence');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const delay = (duration) => new Promise((resolve, reject) => setTimeout(() => resolve(), duration));

// const { applyOrThrowIfStopped } = require('../lib/system-map');

// const isStopped = (reference) => {
//   try {
//     return applyOrThrowIfStopped(reference).stopped;
//   } catch (e) {
//     return true;
//   }
// };

// Begin helpers
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
  async function (state = initialState, msg, ctx) {
    if (!ctx.recovering) {
      dispatch(ctx.sender, state + msg, ctx.self);
    }
    await Promise.resolve(additionalActions(state, msg, ctx));
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
      concatenativeFunction(''),
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
    (() => persistentQuery(system, ignore, 'abc')).should.throw(Error);
    (() => persistentQuery(system, ignore, null)).should.throw(Error);
    (() => persistentQuery(system, ignore, 1)).should.throw(Error);
    (() => persistentQuery(system, ignore, [])).should.throw(Error);
    (() => persistentQuery(system, ignore, {})).should.throw(Error);
    (() => persistentQuery(system, ignore, Symbol('A'))).should.throw(Error);
  });

  // it('should be able to replay previously persisted events on startup', async () => {
  //   const expectedResult = '1234567890';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
  //   const persistenceEngine = new MockPersistenceEngine({ test: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction(''),
  //     'test'
  //   );
  //   dispatch(actor, '1');
  //   dispatch(actor, '2');
  //   dispatch(actor, '3');

  //   (await query(actor, '', 30)).should.equal(expectedResult + '123');
  // });

  // it('should be able to skip deleted events on startup', async () => {
  //   const prevResult = '1234567890';
  //   const expectedResult = '123456789';
  //   const events = [...prevResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test', undefined, undefined, evt === '0'));
  //   const persistenceEngine = new MockPersistenceEngine({ test: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction(''),
  //     'test'
  //   );
  //   dispatch(actor, '1');
  //   dispatch(actor, '2');
  //   dispatch(actor, '3');

  //   (await query(actor, '', 30)).should.equal(expectedResult + '123');
  // });

  // it('should be able to persist events', async () => {
  //   const persistenceEngine = new MockPersistenceEngine();
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', (state, msg, ctx) => !ctx.recovering && ctx.persist(msg)),
  //     'test'
  //   );
  //   dispatch(actor, 'a');
  //   dispatch(actor, 'b');
  //   dispatch(actor, 'c');
  //   (await query(actor, 'd', 30)).should.equal('abcd');
  //   persistenceEngine._events['test'].map(x => x.data).should.deep.equal(['a', 'b', 'c', 'd']);
  // });

  // it('should signal an error if creating restore stream fails', async () => {
  //   console.error = ignore;
  //   const persistenceEngine = new BrokenPersistenceEngine();
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction(''),
  //     'test'
  //   );
  //   await retry(() => isStopped(actor).should.be.true, 5, 10);
  // });

  // it('should signal an error if restore stream fails midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new PartiallyBrokenPersistenceEngine({ frog: events }, 5);
  //   system = start(configurePersistence(persistenceEngine));
  //   let crashed = false;
  //   spawnPersistent(
  //     system,
  //     concatenativeFunction(''),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.stop; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  // });

  // it('should be able to continue if an exception is thrown midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new MockPersistenceEngine({ frog: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   let crashed = false;
  //   let actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.resume; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  //   (await query(actor, 'a', 30)).should.equal('icelndiscolda');
  // });

  // it('should be able to escalate if an exception is thrown midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new MockPersistenceEngine({ frog: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   let parent = spawn(system, (state, msg, ctx) => state);
  //   let crashed = false;
  //   let actor = spawnPersistent(
  //     parent,
  //     concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.escalate; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  //   await retry(() => isStopped(parent).should.be.true, 5, 10);
  //   await retry(() => isStopped(actor).should.be.true, 5, 10);
  // });

  // it('should be able to reset if an exception is thrown midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new MockPersistenceEngine({ frog: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   let crashed = false;
  //   let actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a' && !crashed) { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.reset; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  //   (await query(actor, 'a', 30)).should.equal('icelandiscolda');
  // });
  // it('should be able to resetAll if an exception is thrown midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new MockPersistenceEngine({ frog: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   let crashed = false;
  //   let actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a' && !crashed) { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.resetAll; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  //   (await query(actor, 'a', 30)).should.equal('icelandiscolda');
  // });
  // it('should be able to stop if an exception is thrown midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new MockPersistenceEngine({ frog: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   let crashed = false;
  //   let actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.stop; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  //   await retry(() => isStopped(actor).should.be.true, 5, 10);
  // });
  // it('should be able to stopAll if an exception is thrown midway through recovery', async () => {
  //   console.error = ignore;
  //   const expectedResult = 'icelandiscold';
  //   const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
  //   const persistenceEngine = new MockPersistenceEngine({ frog: events });
  //   system = start(configurePersistence(persistenceEngine));
  //   let crashed = false;
  //   let actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
  //     'frog',
  //     'frog',
  //     { onCrash: (_, __, ctx) => { crashed = true; return ctx.stopAll; } }
  //   );
  //   await retry(() => crashed.should.be.true, 5, 10);
  //   await retry(() => isStopped(actor).should.be.true, 5, 10);
  // });

  // it('should be able to restore and then persist new events (with correct seqNumbers)', async () => {
  //   const previousState = 'icelandiscold';
  //   const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
  //   const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents });
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', async (state, msg, ctx) => {
  //       if (!ctx.recovering) {
  //         console.log('persisting');
  //         await ctx.persist(msg);
  //       }
  //     }),
  //     'iceland'
  //   );
  //   dispatch(actor, ', very cold indeed');
  //   await retry(() =>
  //     persistenceEngine._events['iceland'].map((evt, i) => evt.sequenceNumber === i + 1)
  //       .should.deep.equal(new Array(previousState.length + 1).fill(true))
  //     , 5, 20);
  // });

  // it('should be able to restore a snapshot and replay events exluding those that were persisted before the snapshot', async () => {
  //   const previousState = 'icelandiscold';
  //   const expectedState = 'greenlandiscold';
  //   const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
  //   const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, { iceland: [new PersistedSnapshot('green', 3, 'iceland')] });
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction(''),
  //     'iceland'
  //   );
  //   (await query(actor, '', 30)).should.equal(expectedState);
  // });

  // it('should be able to restore a snapshot and replay events exluding those that were persisted before the snapshot', async () => {
  //   const previousState = 'icelandiscold';
  //   const expectedState = 'greenlandiscold';
  //   const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
  //   const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, { iceland: [new PersistedSnapshot('green', 3, 'iceland')] });
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction(''),
  //     'iceland'
  //   );
  //   (await query(actor, '', 30)).should.equal(expectedState);
  // });

  // it('should be able to persist a snapshot after a given number of messages', async () => {
  //   const persistenceEngine = new MockPersistenceEngine();
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', async (state, msg, ctx) => { await ctx.persist(msg); }),
  //     'iceland',
  //     'test',
  //     { snapshotEvery: 5 * messages }
  //   );
  //   const expectedResult = 'iceland\'s cold!';
  //   expectedResult.split('').forEach(msg => {
  //     dispatch(actor, msg);
  //   });
  //   (await query(actor, '', 30));
  //   const snapshots = persistenceEngine._snapshots['iceland'];
  //   snapshots.length.should.equal(3);
  //   snapshots[snapshots.length - 1].data.should.equal(expectedResult);
  // });

  // it('should be able to continue processing messages even after failing to save a snapshot when snapshotting', async () => {
  //   console.error = ignore;
  //   const persistenceEngine = new MockPersistenceEngine(undefined, undefined, false); // Disable takeSnapshot
  //   system = start(configurePersistence(persistenceEngine));
  //   const actor = spawnPersistent(
  //     system,
  //     concatenativeFunction('', async (state, msg, ctx) => { await ctx.persist(msg); }),
  //     'iceland',
  //     'test',
  //     { snapshotEvery: 5 * messages }
  //   );
  //   const expectedResult = 'iceland is cold';
  //   expectedResult.split('').forEach(msg => {
  //     dispatch(actor, msg);
  //   });
  //   (await query(actor, '', 30)).should.equal(expectedResult);
  // });

  // it('should throw if snapshot is not a number', async function () {
  //   const persistenceEngine = new MockPersistenceEngine(); // Disable takeSnapshot
  //   system = start(configurePersistence(persistenceEngine));
  //   (() => spawnPersistent(system, ignore, 'test1', undefined, { snapshotEvery: {} })).should.throw(Error);
  // });
});

/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import { MockPersistenceEngine } from './mock-persistence-engine';
import { MockPersistenceEngineProperties } from './mock-persistence-engine-properties';
import { PartiallyBrokenPersistenceEngine } from './partially-broken-persistence-engine';
import chaiAsPromised from 'chai-as-promised';
import { dispatch, applyOrThrowIfStopped, stop } from '@nact/core';
import type { ActorRef, LocalActorSystemRef } from '@nact/core';
import { IPersistedEvent, IPersistedSnapshot, IPersistenceEngine } from './persistence-engine';

chai.should();
chai.use(chaiAsPromised);
const delay = (duration: number) => new Promise<void>((resolve, reject) => setTimeout(() => resolve(), duration));

const isStopped = (reference: ActorRef<any>) => {
  try {
    return applyOrThrowIfStopped(reference, x => x).stopped;
  } catch (e) {
    return true;
  }
};

// Begin helpers
const ignore = () => { };

const retry = async (assertion: () => void, remainingAttempts: number, retryInterval = 0) => {
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

// End helpers

describe('#configurePersistence', () => {
  it('should require that the persistence engine be defined', function () {
    (() => configurePersistence(0)({})).should.throw(Error);
    (() => configurePersistence(undefined)({})).should.throw(Error);
    (() => configurePersistence(null)({})).should.throw(Error);
    (() => configurePersistence()({})).should.throw(Error);
  });
});

describe('PersistentActor', () => {
  let system: LocalActorSystemRef;

  afterEach(function () {
    // reset console
    system && stop(system);
  });

  it('should startup normally if no previous events', async function () {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test'
    );
    dispatch(actor, 'a');
    dispatch(actor, 'b');
    (await query(actor, 'c', 30)).should.equal('abc');
  });

  it('should allow an initial state to be specified', async function () {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test',
      'test',
      { initialState: '123' }
    );
    dispatch(actor, 'a');
    dispatch(actor, 'b');
    (await query(actor, 'c', 30)).should.equal('123abc');
  });

  it('should be able to correctly recover when reset after a failure', async function () {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    let bTriggered = false;
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => {
        ctx.persist(msg);
        if (!bTriggered && msg === 'b') {
          bTriggered = true;
          throw new Error('bad things are on the rise');
        }
      }),
      'test',
      'test',
      {
        onCrash: (msg, error, ctx) => ctx.reset
      }
    );
    dispatch(actor, 'a');
    dispatch(actor, 'b');
    dispatch(actor, 'c');
    (await query(actor, 'd', 100)).should.equal('abcd');
  });

  it('must have a persistentKey of type string', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    (() => spawnPersistent(system, ignore, undefined)).should.throw(Error);
    (() => spawnPersistent(system, ignore, null)).should.throw(Error);
    (() => spawnPersistent(system, ignore, 1)).should.throw(Error);
    (() => spawnPersistent(system, ignore, [])).should.throw(Error);
    (() => spawnPersistent(system, ignore, {})).should.throw(Error);
    (() => spawnPersistent(system, ignore, Symbol('A'))).should.throw(Error);
  });

  it('should be able to replay previously persisted events on startup', async () => {
    const expectedResult = '1234567890';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
    const persistenceEngine = new MockPersistenceEngine({ test: events });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test'
    );
    dispatch(actor, '1');
    dispatch(actor, '2');
    dispatch(actor, '3');

    (await query(actor, '', 30)).should.equal(expectedResult + '123');
  });

  it('should be able to replay previously persisted events on startup with a custom decoder', async () => {
    const source = '12345678';
    const expectedResult = '23456789';
    const events = [...source].map((evt, i) => new PersistedEvent(evt, i + 1, 'test'));
    const persistenceEngine = new MockPersistenceEngine({ test: events });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test',
      'test',
      { decoder: (a) => String.fromCharCode(a.charCodeAt(0) + 1) }
    );
    dispatch(actor, '1');
    dispatch(actor, '2');
    dispatch(actor, '3');
    (await query(actor, '', 30)).should.equal(expectedResult + '123');
  });

  it('should be able to skip deleted events on startup', async () => {
    const prevResult = '1234567890';
    const expectedResult = '123456789';
    const events = [...prevResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'test', undefined, undefined, evt === '0'));
    const persistenceEngine = new MockPersistenceEngine({ test: events });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test'
    );
    dispatch(actor, '1');
    dispatch(actor, '2');
    dispatch(actor, '3');

    (await query(actor, '', 30)).should.equal(expectedResult + '123');
  });

  it('should be able to persist events', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => !ctx.recovering && ctx.persist(msg)),
      'test'
    );
    dispatch(actor, 'a');
    dispatch(actor, 'b');
    dispatch(actor, 'c');
    (await query(actor, 'd', 30)).should.equal('abcd');
    persistenceEngine._events['test'].map(x => x.data).should.deep.equal(['a', 'b', 'c', 'd']);
  });

  it('should be able to persist events with a custom encoder', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => !ctx.recovering && ctx.persist(msg)),
      'test',
      'test',
      { encoder: (a) => String.fromCharCode(a.charCodeAt(0) + 1) }
    );
    dispatch(actor, 'a');
    dispatch(actor, 'b');
    dispatch(actor, 'c');
    (await query(actor, 'd', 30)).should.equal('abcd');
    persistenceEngine._events['test'].map(x => x.data).should.deep.equal(['b', 'c', 'd', 'e']);
  });

  it('should be able to persist events with additional properties', async () => {
    const persistenceEngine = new MockPersistenceEngineProperties();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => !ctx.recovering && ctx.persist(msg, [], { [msg]: msg }, { [msg]: msg })),
      'test'
    );
    dispatch(actor, 'a');
    dispatch(actor, 'b');
    dispatch(actor, 'c');
    (await query(actor, 'd', 30)).should.equal('abcd');
    persistenceEngine._events['test'].map(x => x.data).should.deep.equal(['a', 'b', 'c', 'd']);
    persistenceEngine._annotations.should.deep.equal([{ 'a': 'a' }, { 'b': 'b' }, { 'c': 'c' }, { 'd': 'd' }]);
    persistenceEngine._metadata.should.deep.equal([{ 'a': 'a' }, { 'b': 'b' }, { 'c': 'c' }, { 'd': 'd' }]);
  });

  it('should signal an error if creating restore stream fails', async () => {
    console.error = ignore;
    const persistenceEngine = new BrokenPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test'
    );
    await retry(() => isStopped(actor).should.be.true, 5, 10);
  });

  it('should signal an error if restore stream fails midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new PartiallyBrokenPersistenceEngine({ frog: events }, 5);
    system = start(configurePersistence(persistenceEngine));
    let crashed = false;
    spawnPersistent(
      system,
      concatenativeFunction(''),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.stop; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
  });

  it('should be able to continue if an exception is thrown midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new MockPersistenceEngine({ frog: events });
    system = start(configurePersistence(persistenceEngine));
    let crashed = false;
    let actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.resume; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
    (await query(actor, 'a', 30)).should.equal('icelndiscolda');
  });

  it('should be able to escalate if an exception is thrown midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new MockPersistenceEngine({ frog: events });
    system = start(configurePersistence(persistenceEngine));
    let parent = spawn(system, (state, msg, ctx) => state);
    let crashed = false;
    let actor = spawnPersistent(
      parent,
      concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.escalate; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
    await retry(() => isStopped(parent).should.be.true, 5, 10);
    await retry(() => isStopped(actor).should.be.true, 5, 10);
  });

  it('should be able to reset if an exception is thrown midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new MockPersistenceEngine({ frog: events });
    system = start(configurePersistence(persistenceEngine));
    let crashed = false;
    let actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a' && !crashed) { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.reset; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
    (await query(actor, 'a', 30)).should.equal('icelandiscolda');
  });

  it('should be able to be reset and use initial state', async function () {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const reset = (msg, err, ctx) => ctx.reset;
    const createSupervisor = (parent, name) => spawn(parent, (state, msg, ctx) => state, name);
    const parent = createSupervisor(system, 'test1');
    const child = spawnPersistent(parent, (state, msg, ctx) => {
      if (state + 1 === 3 && msg !== 'msg3') {
        throw new Error('Very bad thing');
      }
      dispatch(ctx.sender, state + 1);
      return state + 1;
    }, 'test', 'test', { onCrash: reset, initialState: 1 });

    const grandchild = spawn(child, (state = 0, msg, ctx) => {
      dispatch(ctx.sender, state + 1);
      return state + 1;
    });

    dispatch(grandchild, 'msg0');

    dispatch(child, 'msg0');
    dispatch(grandchild, 'msg1');
    dispatch(child, 'msg1');
    dispatch(grandchild, 'msg2');
    dispatch(child, 'msg2');
    let result = await query(child, 'msg3', 300);
    result.should.equal(3);
    isStopped(grandchild).should.be.true;
  });

  it('should be able to resetAll if an exception is thrown midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new MockPersistenceEngine({ frog: events });
    system = start(configurePersistence(persistenceEngine));
    let crashed = false;
    let actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a' && !crashed) { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.resetAll; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
    (await query(actor, 'a', 30)).should.equal('icelandiscolda');
  });

  it('should be able to stop if an exception is thrown midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new MockPersistenceEngine({ frog: events });
    system = start(configurePersistence(persistenceEngine));
    let crashed = false;
    let actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.stop; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
    await retry(() => isStopped(actor).should.be.true, 5, 10);
  });

  it('should be able to stopAll if an exception is thrown midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new MockPersistenceEngine({ frog: events });
    system = start(configurePersistence(persistenceEngine));
    let crashed = false;
    let actor = spawnPersistent(
      system,
      concatenativeFunction('', (state, msg, ctx) => { if (msg === 'a') { throw new Error('"a" error'); } else if (!ctx.recovering) { ctx.persist(msg); } }),
      'frog',
      'frog',
      { onCrash: (_, __, ctx) => { crashed = true; return ctx.stopAll; } }
    );
    await retry(() => crashed.should.be.true, 5, 10);
    await retry(() => isStopped(actor).should.be.true, 5, 10);
  });

  it('should be able to restore and then persist new events (with correct seqNumbers)', async () => {
    const previousState = 'icelandiscold';
    const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', async (state, msg, ctx) => {
        if (!ctx.recovering) {
          console.log('persisting');
          await ctx.persist(msg);
        }
      }),
      'iceland'
    );
    dispatch(actor, ', very cold indeed');
    await retry(() =>
      persistenceEngine._events['iceland'].map((evt, i) => evt.sequenceNumber === i + 1)
        .should.deep.equal(new Array(previousState.length + 1).fill(true))
      , 5, 20);
  });

  it('should be able to restore a snapshot and replay events exluding those that were persisted before the snapshot', async () => {
    const previousState = 'icelandiscold';
    const expectedState = 'greenlandiscold';
    const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, { iceland: [new PersistedSnapshot('green', 3, 'iceland')] });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'iceland'
    );
    (await query(actor, '', 30)).should.equal(expectedState);
  });

  it('should be able to restore a snapshot with a custom decoder and replay events exluding those that were persisted before the snapshot', async () => {
    const previousState = 'icelandiscold';
    const expectedState = 'greenlandiscold';
    const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, { iceland: [new PersistedSnapshot('ice', 3, 'iceland')] });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'iceland',
      'iceland',
      { snapshotDecoder: (state) => 'green' }
    );
    (await query(actor, '', 30)).should.equal(expectedState);
  });

  it('should be able to restore a snapshot and replay events exluding those that were persisted before the snapshot', async () => {
    const previousState = 'icelandiscold';
    const expectedState = 'greenlandiscold';
    const previousEvents = [...previousState].map((evt, i) => new PersistedEvent(evt, i + 1, 'iceland'));
    const persistenceEngine = new MockPersistenceEngine({ iceland: previousEvents }, { iceland: [new PersistedSnapshot('green', 3, 'iceland')] });
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'iceland'
    );
    (await query(actor, '', 30)).should.equal(expectedState);
  });

  it('should be able to persist a snapshot after a given number of messages', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', async (state, msg, ctx) => { await ctx.persist(msg); }),
      'iceland',
      'test',
      { snapshotEvery: 5 * messages }
    );
    const expectedResult = 'iceland\'s cold!';
    expectedResult.split('').forEach(msg => {
      dispatch(actor, msg);
    });
    (await query(actor, '', 30));
    const snapshots = persistenceEngine._snapshots['iceland'];
    snapshots.length.should.equal(3);
    snapshots[snapshots.length - 1].data.should.equal(expectedResult);
  });

  it('should be able to persist a snapshot after a given number of messages with a custom encoder', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', async (state, msg, ctx) => { await ctx.persist(msg); }),
      'iceland',
      'test',
      { snapshotEvery: 5 * messages, snapshotEncoder: (snapshot) => snapshot + ' But also beautiful.' }
    );
    const expectedResult = 'iceland\'s cold!';
    expectedResult.split('').forEach(msg => {
      dispatch(actor, msg);
    });
    (await query(actor, '', 30));
    const snapshots = persistenceEngine._snapshots['iceland'];
    snapshots.length.should.equal(3);
    snapshots[snapshots.length - 1].data.should.equal(expectedResult + ' But also beautiful.');
  });

  it('should be able to continue processing messages even after failing to save a snapshot when snapshotting', async () => {
    console.error = ignore;
    const persistenceEngine = new MockPersistenceEngine(undefined, undefined, false); // Disable takeSnapshot
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', async (state, msg, ctx) => { await ctx.persist(msg); }),
      'iceland',
      'test',
      { snapshotEvery: 5 * messages }
    );
    const expectedResult = 'iceland is cold';
    expectedResult.split('').forEach(msg => {
      dispatch(actor, msg);
    });
    (await query(actor, '', 30)).should.equal(expectedResult);
  });

  it('should be able to continue processing messages even after failing to save a snapshot when snapshotting', async () => {
    console.error = ignore;
    const persistenceEngine = new MockPersistenceEngine(undefined, undefined, false); // Disable takeSnapshot
    system = start(configurePersistence(persistenceEngine));
    const actor = spawnPersistent(
      system,
      concatenativeFunction('', async (state, msg, ctx) => { await ctx.persist(msg); }),
      'iceland',
      'test',
      { snapshotEvery: 5 * messages }
    );
    const expectedResult = 'iceland is cold';
    expectedResult.split('').forEach(msg => {
      dispatch(actor, msg);
    });
    (await query(actor, '', 30)).should.equal(expectedResult);
  });

  it('should throw if snapshot is not a number', async function () {
    const persistenceEngine = new MockPersistenceEngine(); // Disable takeSnapshot
    system = start(configurePersistence(persistenceEngine));
    (() => spawnPersistent(system, ignore, 'test1', undefined, { snapshotEvery: {} })).should.throw(Error);
  });
});
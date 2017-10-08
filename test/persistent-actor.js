/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { MockPersistenceEngine } = require('./mock-persistence-engine');
const { BrokenPersistenceEngine } = require('./broken-persistence-engine');
const { PartiallyBrokenPersistenceEngine } = require('./partially-broken-persistence-engine');
const { start, spawnPersistent } = require('../lib');
const { PersistedEvent } = require('../lib/persistence-engine');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { Promise } = require('bluebird');
const delay = Promise.delay;

// Begin helpers
const ignore = () => {};

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

const concatenativeFunction = (initialState) => {
  const f = (state) => (msg, ctx) => {
    ctx.tell(ctx.sender, state + msg);
    return f(state + msg);
  };
  return () => f(initialState);
};

const persistentConcatenativeFunction = (initialState, additionalActions) => {
  const f = (state) => async (msg, ctx) => {
    if (!ctx.recovering) {
      ctx.tell(ctx.sender, state + msg);
    }
    additionalActions && (await Promise.resolve(additionalActions(msg, ctx)));
    return f(state + msg);
  };
  return () => f(initialState);
};
// End helpers

describe('PersistentActor', () => {
  let system;

  afterEach(function () {
    // reset console
    delete console.error;
    system && system.stop();
  });

  it('should startup normally if no previous events', async function () {
    const persistenceEngine = new MockPersistenceEngine();
    system = start({ persistenceEngine });
    const actor = spawnPersistent(
      system,
      concatenativeFunction(''),
      'test'
    );
    actor.tell('a');
    actor.tell('b');
    (await actor.ask('c')).should.equal('abc');
  });

  it('must have a persistentKey of type string', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start({ persistenceEngine });
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
    system = start({ persistenceEngine });
    const actor = spawnPersistent(
        system,
        persistentConcatenativeFunction(''),
        'test'
      );
    actor.tell('1');
    actor.tell('2');
    actor.tell('3');
    (await actor.ask('')).should.equal(expectedResult + '123');
  });

  it('should be able to persist events', async () => {
    const persistenceEngine = new MockPersistenceEngine();
    system = start({ persistenceEngine });
    const actor = spawnPersistent(
        system,
        persistentConcatenativeFunction('', (msg, ctx) => !ctx.recovering && ctx.persist(msg)),
        'test'
      );
    actor.tell('a');
    actor.tell('b');
    actor.tell('c');
    (await actor.ask('d')).should.equal('abcd');
    persistenceEngine._events.get('test').map(x => x.data).should.deep.equal(['a', 'b', 'c', 'd']);
  });

  it('should signal an error if creating restore stream fails', async () => {
    console.error = ignore;
    const persistenceEngine = new BrokenPersistenceEngine();
    system = start({ persistenceEngine });
    const actor = spawnPersistent(
        system,
        persistentConcatenativeFunction(''),
        'test'
      );
    await retry(() => actor.isStopped().should.be.true, 5, 10);
  });

  it('should signal an error if restore stream fails midway through recovery', async () => {
    console.error = ignore;
    const expectedResult = 'icelandiscold';
    const events = [...expectedResult].map((evt, i) => new PersistedEvent(evt, i + 1, 'frog'));
    const persistenceEngine = new PartiallyBrokenPersistenceEngine({ frog: events }, 5);
    system = start({ persistenceEngine });
    const actor = spawnPersistent(
      system,
      persistentConcatenativeFunction(''),
      'frog'
    );
    await retry(() => actor.isStopped().should.be.true, 5, 10);
  });
});

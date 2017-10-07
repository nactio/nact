/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { MockPersistenceEngine } = require('./mock-persistence-engine');
const { start, spawnPersistent } = require('../lib');
const { PersistedEvent } = require('../lib/persistence-engine');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

// Begin helpers
const ignore = () => {};
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

  afterEach(() => system.stop());

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
    (await actor.ask('')).should.equal(expectedResult);
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
});

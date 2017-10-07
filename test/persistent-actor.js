/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();
const { MockPersistenceEngine } = require('./mock-persistence-engine');
const { start, spawnPersistent } = require('../lib');

const concatinativeFunction = (initialState) => {
  const f = (state) => (msg, ctx) => {
    ctx.tell(ctx.sender, state + msg);
    return f(state + msg);
  };
  return () => f(initialState);
};

describe('PersistentActor', function () {
  it('should startup normally if no previous events', function () {
    const persistenceEngine = new MockPersistenceEngine();
    const system = start({ persistenceEngine });
    const actor = spawnPersistent(
      system,
      concatinativeFunction(''),
      'test'
    );
    actor.tell('a');
    actor.tell('b');
    actor.ask('c').should.eventually.equal('abc');
  });
});

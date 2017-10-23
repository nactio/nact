/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
// onCompleted
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();
const { start, spawn, spawnStateless } = require('../lib');
const { Promise } = require('bluebird');
const { LocalPath } = require('../lib/paths');
const delay = Promise.delay;
const { applyOrThrowIfStopped } = require('../lib/references');

const spawnChildrenEchoer = (parent, name) =>
  spawnStateless(
    parent,
    function (msg) { this.dispatch(this.sender, [...this.children.keys()]); },
    name
  );

const isStopped = (reference) => {
  try {
    return applyOrThrowIfStopped(reference, (ref) => ref.stopped);
  } catch (e) {
    return true;
  }
};

const children = (reference) => {
  try {
    return applyOrThrowIfStopped(reference, ref => new Map(ref.childReferences));
  } catch (e) {
    return new Map();
  }
};

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

describe('ActorReference', function () {
  let system;
  beforeEach(() => { system = start(); });
  afterEach(() => system.stop());

  it('should have name, path, parent, properties', function () {
    let child = spawnStateless(system, ignore);
    let grandchild = spawnStateless(child, ignore);
    child.parent.should.equal(system);
    grandchild.parent.should.equal(child);
    child.name.should.be.a('string');
    child.path.should.be.instanceOf(LocalPath);
  });
});

describe('Actor', function () {
  describe('actor-function', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      system.stop();
      // reset console
      delete console.error;
    });

    it('allows promises to resolve inside actor', async function () {
      const getMockValue = () => Promise.resolve(2);
      let child = spawnStateless(
        system,
        async function (msg) {
          let result = await getMockValue();
          this.dispatch(this.sender, result);
        }
      );

      let result = await child.query();
      result.should.equal(2);
    });

    it('allows stateful behaviour', async function () {
      let actor = spawn(
        system,
         function (state = '', msg) {
           if (msg.type === 'query') {
             this.dispatch(this.sender, state);
             return state;
           } else if (msg.type === 'append') {
             return state + msg.payload;
           }
         }
      );

      actor.dispatch({ payload: 'Hello ', type: 'append' });
      actor.dispatch({ payload: 'World. ', type: 'append' });
      actor.dispatch({ payload: 'The time has come!!', type: 'append' });
      let result = await actor.query({ type: 'query' });
      result.should.equal('Hello World. The time has come!!');
    });

    it('evalutes in order when returning a promise from the actor function', async function () {
      let child = spawnStateless(
        system,
        async function (msg) {
          if (msg === 2) {
            await delay(10);
          }
          this.dispatch(this.sender, msg);
        },
        'testActor'
      );

      let result1 = await child.query(1);
      let result2 = await child.query(2);
      let result3 = await child.query(3);
      result1.should.equal(1);
      result2.should.equal(2);
      result3.should.equal(3);
    });

    it('should automatically stop if error is thrown', async function () {
      console.error = ignore;
      let child = spawnStateless(system, (msg) => { throw new Error('testError'); });
      child.dispatch();
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });

    it('should automatically stop if rejected promise is thrown', async function () {
      console.error = ignore;
      let child = spawnStateless(system, (msg) => Promise.reject(new Error('testError')));
      child.dispatch();
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });
  });

  describe('#stop()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      system.stop();
      // reset console
      delete console.error;
    });

    it('should prevent children from being spawned after being called', function () {
      let child = spawnStateless(system, ignore);
      child.stop();
      (() => spawnStateless(child, ignore)).should.throw(Error);
      (() => spawnStateless(child, () => ignore)).should.throw(Error);
    });

    it('stops children when parent is stopped', async function () {
      let actor = spawnChildrenEchoer(system);
      let child1 = spawnChildrenEchoer(actor, 'child1');
      let child2 = spawnChildrenEchoer(actor, 'child2');
      let grandchild1 = spawnStateless(child1, ignore, 'grandchild1');
      let grandchild2 = spawnStateless(child1, ignore, 'grandchild2');

      child1.stop();
      isStopped(child1).should.be.true;
      isStopped(grandchild1).should.be.true;
      isStopped(grandchild2).should.be.true;

      system.stop();
      children(system).should.be.empty;
      isStopped(actor).should.be.true;
      isStopped(child2).should.be.true;
    });

    it('is invoked automatically when the next state is not returned', async function () {
      let child = spawn(system, ignore, 'testActor');
      child.dispatch();
      await retry(() => isStopped(child).should.be.true, 12, 10);
      children(system).should.not.include('testActor');
    });

    it('should be able to be invoked multiple times', async function () {
      let child = spawn(system, ignore);
      child.stop();
      await retry(() => isStopped(child).should.be.true, 12, 10);
      child.stop();
      isStopped(child).should.be.true;
    });

    it('should ignore subsequent dispatchs', async function () {
      let child = spawnStateless(system, () => { throw new Error('Should not be triggered'); });
      child.stop();
      await retry(() => isStopped(child).should.be.true, 12, 10);
      child.dispatch('test');
    });
  });

  describe('#spawn()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      system.stop();
      // reset console
      delete console.error;
    });

    it('automatically names an actor if a name is not provided', async function () {
      let child = spawnStateless(system, (msg) => msg);
      children(system).size.should.equal(1);
      child.name.should.not.be.undefined;
    });

    it('should prevent a child with the same name from being spawned', function () {
      let child = spawnStateless(system, ignore);
      spawnStateless(child, ignore, 'grandchild');
      (() => spawnStateless(child, ignore, 'grandchild')).should.throw(Error);
    });

    it('correctly registers children upon startup', async function () {
      let child = spawnChildrenEchoer(system, 'testChildActor');
      children(system).should.have.keys('testChildActor');
      let childReferences = await child.query();
      childReferences.should.be.empty;

      spawnStateless(child, ignore, 'testGrandchildActor');
      children(child).should.have.keys('testGrandchildActor');
      childReferences = await child.query();
      childReferences.should.have.members(['testGrandchildActor']);

      spawnStateless(child, ignore, 'testGrandchildActor2');
      childReferences = await child.query();
      children(child).should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      childReferences.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);
    });

    it('can be invoked from within actor', async function () {
      let actor = spawnStateless(system, function (msg) {
        if (msg === 'spawn') {
          spawnStateless(this.self, ignore, 'child1');
          spawn(this.self, ignore, 'child2');
        } else {
          this.dispatch(this.sender, [...this.children.keys()]);
        }
      }, 'test');
      actor.dispatch('spawn');
      let childrenMap = await actor.query('query');
      childrenMap.should.have.members(['child1', 'child2']);
      children(actor).should.have.keys('child1', 'child2');
    });
  });

  describe('#query()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => system.stop());

    it(`should reject a promise if actor has already stopped`, async function () {
      let actor = spawnStateless(system, ignore);
      actor.stop();
      await delay(5).then(() => actor.query()).should.be.rejectedWith(Error, 'Actor stopped. Query can never resolve');
    });

    it(`should reject a promise if the actor hasn't responded with the given timespan`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { await delay(10); ctx.dispatch(ctx.sender, 'done'); },
        'test'
      );
      (await (actor.query('test', 1).catch(x => x))).should.be.instanceOf(Error);
    });

    it(`should resolve the promise if the actor has responded with the given timespan, clearing the timeout`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { await delay(10); ctx.dispatch(ctx.sender, 'done'); },
        'test'
      );
      (await actor.query('test', 50)).should.equal('done');
    });
  });

  describe('#dispatch()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => system.stop());

    it('dispatching inside actor with non addressable recipient type should throw error', async function () {
      let child = spawnStateless(system, function (msg) {
        try {
          this.dispatch({}, 'test');
        } catch (e) {
          this.dispatch(this.sender, e);
        }
      });
      let result = await child.query();
      result.should.be.an('error');
    });

    it('should be able to dispatch other actors', async function () {
      let child1 = spawnStateless(system, function (msg) { this.dispatch(msg, this.sender); });
      let child2 = spawnStateless(system, function (msg) { this.dispatch(msg, 'hello from child2'); });
      let result = await child1.query(child2);
      result.should.equal('hello from child2');
    });
  });

  describe('#state$', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => system.stop());

    it('should allow subscription to state changes', async function () {
      let actor = spawn(system, (state, msg) => msg);
      let arr = [];
      actor.state$.subscribe(value => {
        arr = [...arr, value];
      });
      actor.dispatch(1);
      actor.dispatch(2);
      actor.dispatch(3);
      await retry(() => arr.should.deep.equal([1, 2, 3]), 5, 10);
    });

    it('should allow only emit when state has changed', async function () {
      let state1 = { hello: 'world' };
      let state2 = { it_has: 'been fun' };

      let actor = spawn(system, (state, msg) => msg);
      let arr = [];
      actor.state$.subscribe(value => {
        arr = [...arr, value];
      });
      actor.dispatch(state1);
      actor.dispatch(state1);
      actor.dispatch(state2);
      await retry(() => arr.should.deep.equal([state1, state2]), 5, 10);
    });

    it('should emit done when the actor is stopped', async function () {
      let actor = spawn(system, (state, msg) => msg);
      let observableClosed = false;
      actor.state$.last().subscribe(x => { observableClosed = true; });
      actor.dispatch(1);
      actor.dispatch(2);
      actor.stop();
      await retry(() => observableClosed.should.be.true, 5, 10);
    });
  });
});

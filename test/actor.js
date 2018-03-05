/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();
const { start, spawn, spawnStateless, dispatch, stop, query, state$, milliseconds } = require('../lib');
const delay = (duration) => new Promise((resolve, reject) => setTimeout(() => resolve(), duration));
const { ActorPath } = require('../lib/paths');
const { applyOrThrowIfStopped } = require('../lib/system-map');

const spawnChildrenEchoer = (parent, name) =>
  spawnStateless(
    parent,
    function (msg) { dispatch(this.sender, [...this.children.keys()], this.self); },
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
      await Promise.resolve(assertion());
    } catch (e) {
      await delay(retryInterval);
      await retry(assertion, remainingAttempts - 1, retryInterval);
    }
  }
};

describe('ActorReference', function () {
  let system;
  beforeEach(() => { system = start(); });
  afterEach(() => stop(system));

  it('should have name, path, parent, properties', function () {
    let child = spawnStateless(system, ignore);
    let grandchild = spawnStateless(child, ignore);
    child.parent.should.equal(system);
    grandchild.parent.should.equal(child);
    child.name.should.be.a('string');
    child.path.should.be.instanceOf(ActorPath);
  });
});

describe('Actor', function () {
  describe('actor-function', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete console.error;
    });

    it('allows promises to resolve inside actor', async function () {
      const getMockValue = () => Promise.resolve(2);
      let child = spawn(
        system,
        async function (state = {}, msg) {
          let result = await getMockValue();
          dispatch(this.sender, result, this.self);
          return state;
        }
      );

      let result = await query(child, {}, 30);
      result.should.equal(2);
    });

    it('allows stateful behaviour', async function () {
      let actor = spawn(
        system,
        function (state = '', msg) {
          if (msg.type === 'query') {
            dispatch(this.sender, state, this.self);
            return state;
          } else if (msg.type === 'append') {
            return state + msg.payload;
          }
        }
      );

      dispatch(actor, { payload: 'Hello ', type: 'append' });
      dispatch(actor, { payload: 'World. ', type: 'append' });
      dispatch(actor, { payload: 'The time has come!!', type: 'append' });
      let result = await query(actor, { type: 'query' }, 30);
      result.should.equal('Hello World. The time has come!!');
    });

    it('evalutes in order when returning a promise from a stateful actor function', async function () {
      let child = spawn(
        system,
        async function (state = {}, msg) {
          if (msg.number === 2) {
            await delay(30);
          }
          dispatch(msg.listener, { number: msg.number });
          return state;
        },
        'testActor'
      );

      let listener = spawn(
        system,
        async function (state = [], msg) {
          if (msg.number) {
            return [...state, msg.number];
          } else {
            dispatch(this.sender, state);
          }
          return state;
        },
        'listener'
      );

      dispatch(child, { listener, number: 1 });
      dispatch(child, { listener, number: 2 });
      dispatch(child, { listener, number: 3 });
      await retry(async () => (await query(listener, {}, 30)).should.deep.equal([1, 2, 3]), 5, 10);
    });

    it('evalutes out of order when returning a promise from a stateless actor function', async function () {
      let child = spawnStateless(
        system,
        async function (msg) {
          if (msg.number === 2) {
            await delay(30);
          }
          dispatch(msg.listener, { number: msg.number });
        },
        'testActor'
      );

      let listener = spawn(
        system,
        async function (state = [], msg) {
          if (msg.number) {
            return [...state, msg.number];
          } else {
            dispatch(this.sender, state);
          }
          return state;
        },
        'listener'
      );

      dispatch(child, { listener, number: 1 });
      dispatch(child, { listener, number: 2 });
      dispatch(child, { listener, number: 3 });
      await retry(async () => (await query(listener, {}, 30)).should.deep.equal([1, 3, 2]), 5, 10);
    });

    it('should not automatically stop if error is thrown and actor is stateless', async function () {
      console.error = ignore;
      let child = spawnStateless(system, (msg) => { throw new Error('testError'); });
      dispatch(child);
      await delay(50);
      isStopped(child).should.not.be.true;
    });

    it('should automatically stop if error is thrown', async function () {
      console.error = ignore;
      let child = spawn(system, (msg) => { throw new Error('testError'); });
      dispatch(child);
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });

    it('should automatically stop if error is thrown and no supervision policy is specified on the parent', async function () {
      console.error = ignore;
      const parent = spawn(system, (state = true, msg) => { return state; });
      let child = spawn(parent, (msg) => { throw new Error('testError'); });
      dispatch(child);
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });

    it('should automatically stop if rejected promise is thrown', async function () {
      console.error = ignore;
      let child = spawn(system, (state = {}, msg) => Promise.reject(new Error('testError')));
      dispatch(child, {});
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });
  });

  describe('shutdownAfter', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete console.error;
    });

    it('should automatically stop after timeout if timeout is specified', async function () {
      console.error = ignore;
      let child = spawnStateless(system, (msg) => { }, 'test', { shutdownAfter: 100 * milliseconds });
      await delay(110);
      isStopped(child).should.be.true;
    });

    it('should automatically renew timeout after message', async function () {
      let child = spawnStateless(system, ignore, 'test1', { shutdownAfter: 60 * milliseconds });
      await delay(30);
      dispatch(child, {});
      await delay(40);
      isStopped(child).should.not.be.true;
    });

    it('should throw if timeout is not a number', async function () {
      (() => spawnStateless(system, ignore, 'test1', { shutdownAfter: {} })).should.throw(Error);
    });
  });

  describe('#stop()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete console.error;
    });

    it('should prevent children from being spawned after being called', function () {
      let child = spawnStateless(system, ignore);
      stop(child);
      (() => spawnStateless(child, ignore)).should.throw(Error);
      (() => spawnStateless(child, () => ignore)).should.throw(Error);
    });

    it('should not process any more messages after being stopped', async function () {
      let child = spawn(system, async (state = {}, msg, ctx) => {
        if (msg === 1) {
          await delay(20);
        } else {
          dispatch(ctx.sender, msg);
        }
        return state;
      });
      dispatch(child, 1);
      let resultPromise = query(child, 2, 100);
      await delay(20);
      stop(child);
      return resultPromise.should.be.rejectedWith(Error);
    });

    it('stops children when parent is stopped', async function () {
      let actor = spawnChildrenEchoer(system);
      let child1 = spawnChildrenEchoer(actor, 'child1');
      let child2 = spawnChildrenEchoer(actor, 'child2');
      let grandchild1 = spawnStateless(child1, ignore, 'grandchild1');
      let grandchild2 = spawnStateless(child1, ignore, 'grandchild2');

      stop(child1);
      isStopped(child1).should.be.true;
      isStopped(grandchild1).should.be.true;
      isStopped(grandchild2).should.be.true;

      stop(system);
      children(system).should.be.empty;
      isStopped(actor).should.be.true;
      isStopped(child2).should.be.true;
    });

    it('is invoked automatically when the next state is not returned', async function () {
      let child = spawn(system, ignore, 'testActor');
      dispatch(child, {});
      await retry(() => isStopped(child).should.be.true, 12, 10);
      children(system).should.not.include('testActor');
    });

    it('should be able to be invoked multiple times', async function () {
      let child = spawn(system, ignore);
      stop(child);
      await retry(() => isStopped(child).should.be.true, 12, 10);
      stop(child);
      isStopped(child).should.be.true;
    });

    it('should ignore subsequent dispatches', async function () {
      let child = spawnStateless(system, () => { throw new Error('Should not be triggered'); });
      stop(child);
      await retry(() => isStopped(child).should.be.true, 12, 10);
      dispatch(child, 'test');
    });
  });

  describe('#spawn()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
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
      let childReferences = await query(child, {}, 30);
      childReferences.should.be.empty;

      spawnStateless(child, ignore, 'testGrandchildActor');
      children(child).should.have.keys('testGrandchildActor');
      childReferences = await query(child, {}, 30);
      childReferences.should.have.members(['testGrandchildActor']);

      spawnStateless(child, ignore, 'testGrandchildActor2');
      childReferences = await query(child, {}, 30);
      children(child).should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      childReferences.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);
    });

    it('can be invoked from within actor', async function () {
      let actor = spawnStateless(system, function (msg) {
        if (msg === 'spawn') {
          spawnStateless(this.self, ignore, 'child1');
          spawn(this.self, ignore, 'child2');
        } else {
          dispatch(this.sender, [...this.children.keys()], this.self);
        }
      }, 'test');
      dispatch(actor, 'spawn');
      let childrenMap = await query(actor, 'query', 30);
      childrenMap.should.have.members(['child1', 'child2']);
      children(actor).should.have.keys('child1', 'child2');
    });
  });

  describe('#query()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    it(`should throw if a timeout is not provided`, async function () {
      let actor = spawnStateless(system, ignore);
      (() => query(actor, {})).should.throw(Error, 'A timeout is required to be specified');
    });

    it(`should reject a promise if actor has already stopped`, async function () {
      let actor = spawnStateless(system, ignore);
      stop(actor);
      await delay(5).then(() => query(actor, {}, 30)).should.be.rejectedWith(Error, 'Actor stopped or never existed. Query can never resolve');
    });

    it(`should reject a promise if the actor hasn't responded with the given timespan`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { await delay(10); dispatch(ctx.sender, 'done', ctx.self); },
        'test'
      );
      (await (query(actor, 'test', 1).catch(x => x))).should.be.instanceOf(Error);
    });

    it(`should resolve the promise if the actor has responded with the given timespan, clearing the timeout`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { await delay(10); dispatch(ctx.sender, 'done', ctx.self); },
        'test'
      );
      (await query(actor, 'test', 50)).should.equal('done');
    });

    it(`should accept a message function which takes in the temporary actor reference`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { dispatch(msg, 'done', ctx.self); },
        'test'
      );
      (await query(actor, (sender) => sender, 50)).should.equal('done');
    });
  });

  describe('#onCrash', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    const createSupervisor = (parent, name) => spawn(parent, (state = true, msg, ctx) => state, name);

    it('should be able to continue processing messages without loss of state', async function () {
      const resume = (msg, err, ctx) => ctx.resume;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg, ctx) => {
        if (state + 1 === 3 && msg !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(ctx.sender, state + 1);
        return state + 1;
      }, 'test', { onCrash: resume });
      dispatch(child, 'msg0');
      dispatch(child, 'msg1');
      dispatch(child, 'msg2');
      let result = await query(child, 'msg3', 300);
      result.should.equal(3);
    });

    it('should be able to be reset', async function () {
      const reset = (msg, err, ctx) => ctx.reset;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg, ctx) => {
        if (state + 1 === 3 && msg !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(ctx.sender, state + 1);
        return state + 1;
      }, 'test', { onCrash: reset });

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
      let result2 = await query(grandchild, 'msg3', 300);
      result.should.equal(1);
      result2.should.equal(1);
    });

    it('should be able to stop', async function () {
      const stop = (msg, err, ctx) => ctx.stop;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg, ctx) => {
        if (state + 1 === 3 && msg !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(ctx.sender, state + 1);
        return state + 1;
      }, 'test', { onCrash: stop });
      dispatch(child, 'msg0');
      dispatch(child, 'msg1');
      dispatch(child, 'msg2');
      await delay(100);
      isStopped(child).should.be.true;
    });

    it('should be able to escalate', async function () {
      const escalate = (msg, err, ctx) => ctx.escalate;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg, ctx) => {
        if (state + 1 === 3 && msg !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(ctx.sender, state + 1);
        return state + 1;
      }, 'test', { onCrash: escalate });
      dispatch(child, 'msg0');
      dispatch(child, 'msg1');
      dispatch(child, 'msg2');
      await delay(100);
      isStopped(child).should.be.true;
      isStopped(parent).should.be.true;
    });

    it('should be able to stop all children', async function () {
      const stopAll = (msg, err, ctx) => ctx.stopAll;
      const parent = createSupervisor(system, 'test1');
      const child1 = spawn(parent, (state = 0, msg, ctx) => {
        if (state + 1 === 3 && msg !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(ctx.sender, state + 1);
        return state + 1;
      }, 'test', { onCrash: stopAll });
      const child2 = spawn(parent, (state = 0, msg, ctx) => {
        dispatch(ctx.sender, state + 1);
        return state + 1;
      });
      dispatch(child1, 'msg0');
      dispatch(child1, 'msg1');
      dispatch(child1, 'msg2');
      await delay(100);
      isStopped(child1).should.be.true;
      isStopped(child2).should.be.true;
    });

    it('should be able to reset all children', async function () {
      const resetAll = (msg, err, ctx) => ctx.resetAll;
      const parent = createSupervisor(system, 'test1');
      const child1 = spawn(parent, (state = 0, msg, ctx) => {
        if (state + 1 === 3 && msg !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(ctx.sender, state + 1);
        return state + 1;
      }, 'test', { onCrash: resetAll });
      const child2 = spawn(parent, (state = 0, msg, ctx) => {
        dispatch(ctx.sender, state + 1);
        return state + 1;
      });
      dispatch(child2, 'msg0');
      dispatch(child1, 'msg0');
      dispatch(child2, 'msg1');
      dispatch(child1, 'msg1');
      dispatch(child2, 'msg2');
      dispatch(child1, 'msg2');
      await delay(100);
      let result = await query(child1, 'msg3', 300);
      let result2 = await query(child2, 'msg3', 300);
      result.should.equal(1);
      result2.should.equal(1);
    });
  });

  describe('#state$', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    it('should allow subscription to state changes', async function () {
      let actor = spawn(system, (state, msg) => msg);
      let arr = [];
      state$(actor).subscribe(value => {
        arr = [...arr, value];
      });
      dispatch(actor, 1);
      dispatch(actor, 2);
      dispatch(actor, 3);
      await retry(() => arr.should.deep.equal([1, 2, 3]), 5, 10);
    });

    it('should allow only emit when state has changed', async function () {
      let state1 = { hello: 'world' };
      let state2 = { it_has: 'been fun' };

      let actor = spawn(system, (state, msg) => msg);
      let arr = [];
      state$(actor).subscribe(value => {
        arr = [...arr, value];
      });
      dispatch(actor, state1);
      dispatch(actor, state1);
      dispatch(actor, state2);

      await retry(() => arr.should.deep.equal([state1, state2]), 5, 10);
    });

    it('should emit done when the actor is stopped', async function () {
      let actor = spawn(system, (state, msg) => msg);
      let observableClosed = false;
      state$(actor).last().subscribe(x => { observableClosed = true; });
      dispatch(actor, 1);
      dispatch(actor, 2);
      await delay(10);
      stop(actor);
      await retry(() => observableClosed.should.be.true, 5, 10);
    });
  });
});

/* eslint-env jest */
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SupervisionContext } from './actor';
import { start, spawn, spawnStateless, dispatch, stop, query, milliseconds, ActorContext, applyOrThrowIfStopped } from './index';
import { LocalActorRef, LocalActorSystemRef, nobody } from './references';

chai.use(chaiAsPromised);
chai.should();
const delay = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));

const spawnChildrenEchoer = (parent: LocalActorSystemRef | LocalActorRef<any>, name: string) =>
  spawnStateless(
    parent,
    function (msg, ctx) { dispatch(msg.sender, [...ctx.children.keys()]); },
    { name }
  );

const isStopped = (reference: LocalActorRef<any>) => {
  try {
    return applyOrThrowIfStopped(reference, (ref) => ref.stopped);
  } catch (e) {
    return true;
  }
};

const children = (reference: LocalActorRef<any> | LocalActorSystemRef) => {
  try {
    return applyOrThrowIfStopped(reference, ref => ref.childReferences);
  } catch (e) {
    return new Map();
  }
};

const ignore = () => { };

const retry = async (assertion: () => void, remainingAttempts: number, retryInterval = 0) => {
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

describe('LocalActorRef', function () {
  let system: LocalActorSystemRef;
  beforeEach(() => { system = start(); });
  afterEach(() => stop(system));

  it('should have path and system properties', function () {
    let child = spawnStateless(system, ignore);
    let grandchild = spawnStateless(child, ignore);
    child.path.system!.should.equal(system.path.system);
    grandchild.path.parts.slice(0, child.path.parts.length - 2).should.deep.equal(child.path.parts);
  });
});

describe('Actor', function () {
  describe('actor-function', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete (console as any).error;
    });

    it('allows promises to resolve inside actor', async function () {
      const getMockValue = () => Promise.resolve(2);
      let child = spawn(
        system,
        async function (state = {}, msg) {
          let result = await getMockValue();
          dispatch(msg.sender, result);
          return state;
        }
      );

      let result = await query(child, x => ({ sender: x }), 30);
      result.should.equal(2);
    });

    it('allows stateful behaviour', async function () {
      let actor = spawn(
        system,
        function (state = '', msg) {
          if (msg.type === 'query') {
            dispatch(msg.sender, state);
            return state;
          } else if (msg.type === 'append') {
            return state + msg.payload;
          }
        }
      );

      dispatch(actor, { payload: 'Hello ', type: 'append' });
      dispatch(actor, { payload: 'World. ', type: 'append' });
      dispatch(actor, { payload: 'The time has come!!', type: 'append' });
      let result = await query(actor, x => ({ type: 'query', sender: x }), 30);
      result.should.equal('Hello World. The time has come!!');
    });

    it('allows an initial state to be specified', async function () {
      let actor = spawn(
        system,
        function (state, msg) {
          if (msg.type === 'query') {
            dispatch(msg.sender, state);
            return state;
          } else if (msg.type === 'append') {
            return state + msg.payload;
          }
        },
        { name: 'test', initialState: 'A joyous ' }
      );

      dispatch(actor, { payload: 'Hello ', type: 'append' });
      dispatch(actor, { payload: 'World. ', type: 'append' });
      dispatch(actor, { payload: 'The time has come!!', type: 'append' });
      let result = await query(actor, x => ({ type: 'query', sender: x }), 30);
      result.should.equal('A joyous Hello World. The time has come!!');
    });

    it('allows an initial state function to be specified', async function () {
      let actor = spawn(
        system,
        function (state, msg) {
          if (msg.type === 'query') {
            dispatch(msg.sender, state);
            return state;
          } else if (msg.type === 'append') {
            return state + msg.payload;
          }
        },
        { name: 'Nact', initialStateFunc: (ctx) => `Hello ${ctx.name}! Is today not a joyous occasion?` }
      );

      dispatch(actor, { payload: ' It is indeed', type: 'append' });
      let result = await query(actor, x => ({ type: 'query', sender: x }), 30);
      result.should.equal('Hello Nact! Is today not a joyous occasion? It is indeed');
    });

    it('correctly handles an initial state function which throws an error', async function () {
      let handled = false;
      let actor = spawn(
        system,
        function (state, msg) {
          if (msg.type === 'query') {
            dispatch(msg.sender, state);
            return state;
          } else if (msg.type === 'append') {
            return state + msg.payload;
          }
        },
        { name: 'Nact', initialStateFunc: () => { throw new Error('A bad moon is on the rise'); }, onCrash: (_, __, ctx) => { handled = true; return ctx.stop; } }
      );
      await retry(() => isStopped(actor).should.be.true, 12, 10);
      handled.should.be.true;
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
        { name: 'testActor' }
      );

      let listener = spawn(
        system,
        async function (state = [], msg) {
          if (msg.number) {
            return [...state, msg.number];
          } else {
            dispatch(msg.sender, state);
          }
          return state;
        },
        { name: 'listener' }
      );

      dispatch(child, { listener, number: 1 });
      dispatch(child, { listener, number: 2 });
      dispatch(child, { listener, number: 3 });
      await retry(async () => (await query(listener, x => ({ sender: x }), 30)).should.deep.equal([1, 2, 3]), 5, 10);
    });

    it('should not automatically stop if error is thrown and actor is stateless', async function () {
      console.error = ignore;
      let child = spawnStateless(system, () => { throw new Error('testError'); });
      dispatch(child, 'hello');
      await delay(50);
      isStopped(child).should.not.be.true;
    });

    it('should automatically stop if error is thrown', async function () {
      console.error = ignore;
      let child = spawn(system, () => { throw new Error('testError'); });
      dispatch(child, 'hello');
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });

    it('should automatically stop if error is thrown and no supervision policy is specified on the parent', async function () {
      console.error = ignore;
      const parent = spawn(system, (state = true) => { return state; });
      let child = spawn(parent, () => { throw new Error('testError'); });
      dispatch(child, 'hello');
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });

    it('should automatically stop if rejected promise is thrown', async function () {
      console.error = ignore;
      let child = spawn(system, () => Promise.reject(new Error('testError')));
      dispatch(child, {});
      await retry(() => isStopped(child).should.be.true, 12, 10);
    });
  });

  describe('shutdownAfter', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete (console as any).error;
    });

    it('should automatically stop after timeout if timeout is specified', async function () {
      console.error = ignore;
      let child = spawnStateless(system, () => { }, { name: 'test', shutdownAfter: 100 * milliseconds });
      await delay(110);
      isStopped(child).should.be.true;
    });

    it('should automatically renew timeout after message', async function () {
      let child = spawnStateless(system, ignore, { name: 'test1', shutdownAfter: 60 * milliseconds });
      await delay(30);
      dispatch(child, {});
      await delay(40);
      isStopped(child).should.not.be.true;
    });

    it('should throw if timeout is not a number', async function () {
      (() => spawnStateless(system, ignore, { name: 'test1', shutdownAfter: {} as any })).should.throw(Error);
    });
  });

  describe('#stop()', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete (console as any).error;
    });

    it('should prevent children from being spawned after being called', function () {
      let child = spawnStateless(system, ignore);
      stop(child);
      (() => spawnStateless(child, ignore)).should.throw(Error);
      (() => spawnStateless(child, () => ignore)).should.throw(Error);
    });

    it('should not process any more messages after being stopped', async function () {
      let child = spawn(system, async (state = {}, msg) => {
        if (msg.value === 1) {
          await delay(20);
        } else {
          dispatch(msg.sender, msg.value);
        }
        return state;
      });
      dispatch(child, { value: 1 });
      let resultPromise = query(child, x => ({ value: 2, sender: x }), 100);
      await delay(20);
      stop(child);
      return resultPromise.should.be.rejectedWith(Error);
    });

    it('stops children when parent is stopped', async function () {
      let actor = spawnChildrenEchoer(system, 'parent');
      let child1 = spawnChildrenEchoer(actor, 'child1');
      let child2 = spawnChildrenEchoer(actor, 'child2');
      let grandchild1 = spawnStateless(child1, ignore, { name: 'grandchild1' });
      let grandchild2 = spawnStateless(child1, ignore, { name: 'grandchild2' });

      stop(child1);
      isStopped(child1).should.be.true;
      isStopped(grandchild1).should.be.true;
      isStopped(grandchild2).should.be.true;

      stop(system);
      children(system).should.be.empty;
      isStopped(actor).should.be.true;
      isStopped(child2).should.be.true;
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
      dispatch(child, { name: 'test' });
    });
  });

  describe('#spawn()', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete (console as any).error;
    });

    it('automatically names an actor if a name is not provided', async function () {
      let child = spawnStateless(system, (msg) => msg);
      children(system).size.should.equal(1);
      child.path.parts[child.path.parts.length - 1].should.not.be.undefined;
    });

    it('should prevent a child with the same name from being spawned', function () {
      let child = spawnStateless(system, ignore);
      spawnStateless(child, ignore, { name: 'grandchild' });
      (() => spawnStateless(child, ignore, { name: 'grandchild' })).should.throw(Error);
    });

    it('correctly registers children upon startup', async function () {
      let child = spawnChildrenEchoer(system, 'testChildActor');
      children(system).should.have.keys('testChildActor');
      let childReferences = await query(child, x => ({ sender: x }), 30);
      childReferences.should.be.empty;

      spawnStateless(child, ignore, { name: 'testGrandchildActor' });
      children(child).should.have.keys('testGrandchildActor');
      childReferences = await query(child, x => ({ sender: x }), 30);
      childReferences.should.have.members(['testGrandchildActor']);

      spawnStateless(child, ignore, { name: 'testGrandchildActor2' });
      childReferences = await query(child, x => ({ sender: x }), 30);
      children(child).should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      childReferences.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);
    });

    it('can be invoked from within actor', async function () {
      let actor = spawnStateless(system, function (msg) {
        if (msg.value === 'spawn') {
          spawnStateless(this.self, ignore, { name: 'child1' });
          spawn(this.self, ignore, { name: 'child2' });
        } else {
          dispatch(msg.sender, [...this.children.keys()]);
        }
      }, { name: 'test' });
      dispatch(actor, { value: 'spawn' });
      let childrenMap = await query(actor, x => ({ value: 'query', sender: x }), 30);
      childrenMap.should.have.members(['child1', 'child2']);
      children(actor).should.have.keys('child1', 'child2');
    });
  });

  describe('#query()', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    it(`should throw if a timeout is not provided`, async function () {
      let actor = spawnStateless(system, ignore);
      (() => (query as any)(actor, (x: any) => ({ sender: x }))).should.throw(Error, 'A timeout is required to be specified');
    });

    it(`should reject a promise if actor has already stopped`, async function () {
      let actor = spawnStateless(system, ignore);
      stop(actor);
      await delay(5).then(() => query(actor, x => ({ sender: x }), 30)).should.be.rejectedWith(Error, 'Actor stopped or never existed. Query can never resolve');
    });

    it(`should reject a promise if the actor hasn't responded with the given timespan`, async function () {
      let actor = spawnStateless(
        system,
        async (msg) => { await delay(10); dispatch(msg.sender, 'done'); },
        { name: 'test' }
      );
      (await (query(actor, x => ({ sender: x, value: 'test' }), 1).catch(x => x))).should.be.instanceOf(Error);
    });

    it(`should resolve the promise if the actor has responded with the given timespan, clearing the timeout`, async function () {
      let actor = spawnStateless(
        system,
        async (msg) => { await delay(10); dispatch(msg.sender, 'done'); },
        { name: 'test' }
      );
      (await query(actor, x => ({ sender: x, value: 'test' }), 50)).should.equal('done');
    });

    it(`should accept a message function which takes in the temporary actor reference`, async function () {
      let actor = spawnStateless(
        system,
        async (msg) => { dispatch(msg, 'done'); },
        { name: 'test' }
      );
      (await query(actor, (sender) => sender, 50)).should.equal('done');
    });
  });

  describe('#onCrash', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    const createSupervisor = (parent: LocalActorRef<any> | LocalActorSystemRef, properties = {}) =>
      spawn(parent, (state) => state, { initialState: true, ...properties });

    it('should be able to continue processing messages without loss of state', async function () {
      const resume = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.resume;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: resume });
      dispatch(child, 'msg0');
      dispatch(child, 'msg1');
      dispatch(child, 'msg2');
      let result = await query(child, x => ({ value: 'msg3', sender: x }), 300);
      result.should.equal(3);
    });

    it('should be able to be reset', async function () {
      const reset = (_msg: unknown, _err: unknown, ctx: SupervisionContext<any, any>) => ctx.reset;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: reset });

      const grandchild = spawn(child, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });

      const nobodyRef = nobody();
      dispatch(grandchild, { sender: nobodyRef, value: 'msg0' });
      dispatch(child, { sender: nobodyRef, value: 'msg0' });
      dispatch(grandchild, { sender: nobodyRef, value: 'msg1' });
      dispatch(child, { sender: nobodyRef, value: 'msg1' });
      dispatch(grandchild, { sender: nobodyRef, value: 'msg2' });
      dispatch(child, { sender: nobodyRef, value: 'msg2' });
      let result = await query(child, x => ({ sender: x, value: 'msg3' }), 300);
      result.should.equal(1);
      isStopped(grandchild).should.be.true;
    });

    it('should be able to be reset and use initial state', async function () {
      const reset = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.reset;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: reset, initialState: 1 });

      const grandchild = spawn(child, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });

      const nobodyRef = nobody();
      dispatch(grandchild, { sender: nobodyRef, value: 'msg0' });
      dispatch(child, { sender: nobodyRef, value: 'msg0' });
      dispatch(grandchild, { sender: nobodyRef, value: 'msg1' });
      dispatch(child, { sender: nobodyRef, value: 'msg1' });
      dispatch(grandchild, { sender: nobodyRef, value: 'msg2' });
      dispatch(child, { sender: nobodyRef, value: 'msg2' });
      let result = await query(child, x => ({ sender: x, value: 'msg3' }), 300);
      result.should.equal(3);
      isStopped(grandchild).should.be.true;
    });

    it('should be able to stop', async function () {
      const stop = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.stop;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: stop });

      const nobodyRef = nobody();
      dispatch(child, { value: 'msg0', sender: nobodyRef });
      dispatch(child, { value: 'msg1', sender: nobodyRef });
      dispatch(child, { value: 'msg2', sender: nobodyRef });
      await delay(100);
      isStopped(child).should.be.true;
    });

    it('should be able to escalate', async function () {
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });

      const nobodyRef = nobody();
      dispatch(child, { sender: nobodyRef, value: 'msg0' });
      dispatch(child, { sender: nobodyRef, value: 'msg1' });
      dispatch(child, { sender: nobodyRef, value: 'msg2' });
      await delay(100);
      isStopped(child).should.be.true;
      isStopped(parent).should.be.true;
    });

    it('should be able to access other messages in the queue', async function () {
      const onCrash = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => {
        ctx.mailbox.length.should.equal(2);
        ctx.mailbox.get(0)!.message.value.should.equal('msg1');
        ctx.mailbox.get(1)!.message.value.should.equal('msg2');
        return ctx.escalate;
      };
      const parent = createSupervisor(system, 'test1');
      const child = spawn(parent, async (state = 0, msg) => {
        // Wait for messages to queue up, then fail on msg0
        if (state + 1 === 1) {
          await delay(50);
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash });
      const nobodyRef = nobody();
      dispatch(child, { sender: nobodyRef, value: 'msg0' });
      dispatch(child, { sender: nobodyRef, value: 'msg1' });
      dispatch(child, { sender: nobodyRef, value: 'msg2' });
      await delay(100);
      isStopped(child).should.be.true;
      isStopped(parent).should.be.true;
    });

    it('should be able to escalate to system (which stops child by default)', async function () {
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const child = spawn(system, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });

      const nobodyRef = nobody();
      dispatch(child, { sender: nobodyRef, value: 'msg0' });
      dispatch(child, { sender: nobodyRef, value: 'msg1' });
      dispatch(child, { sender: nobodyRef, value: 'msg2' });
      await delay(100);
      isStopped(child).should.be.true;
    });

    it('should be able to escalate to parent (which escalates to system)', async function () {
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const parent = spawn(system, () => {
        throw new Error('Very bad thing');
      }, { name: 'parent-of-test' });
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });

      dispatch(child, { value: 'msg0' });
      dispatch(child, { value: 'msg1' });
      dispatch(child, { value: 'msg2' });
      await delay(100);
      isStopped(child).should.be.true;
      isStopped(parent).should.be.true;
    });

    it('should be able to escalate to parent (which stops child and resumes or escalates)', async function () {
      const stopChildAndResumeOrEscalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>, child: undefined | LocalActorRef<any>) => {
        if (child) {
          stop(child);
          return ctx.resume;
        } else {
          return ctx.escalate;
        }
      };
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const parent = spawn(system, () => {
        throw new Error('Very bad thing');
      }, { name: 'parent-of-test', onCrash: stopChildAndResumeOrEscalate });
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });
      const sibling = spawn(parent, () => {
        throw new Error('Very bad thing');
      }, { onCrash: escalate, name: 'sibling-of-test' });
      dispatch(child, { value: 'msg0' });
      dispatch(child, { value: 'msg1' });
      dispatch(child, { value: 'msg2' });
      await delay(100);
      isStopped(child).should.be.true;
      isStopped(parent).should.be.false;
      isStopped(sibling).should.be.false;
      dispatch(parent, { value: 'parent-msg0' });
      await delay(100);
      isStopped(parent).should.be.true;
      isStopped(sibling).should.be.true;
    });

    it('should be able to escalate to parent (which resumes child and resumes)', async function () {
      const resumeChildAndResumeOrEscalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>, child: undefined | LocalActorRef<any>) => {
        if (child) {
          return ctx.resume;
        } else {
          return ctx.escalate;
        }
      };
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const parent = spawn(system, () => {
        throw new Error('Very bad thing');
      }, { name: 'parent-of-test', onCrash: resumeChildAndResumeOrEscalate });
      const child = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });
      dispatch(child, 'msg0');
      dispatch(child, 'msg1');
      dispatch(child, 'msg2');
      await delay(100);
      isStopped(child).should.be.false;
      isStopped(parent).should.be.false;
      dispatch(child, 'msg3');
    });

    it('should be able to stop self, all peers, and children', async function () {
      const stopAll = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.stopAll;
      const parent = createSupervisor(system, 'test1');
      const child1 = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: stopAll });
      const childOfChild1 = spawn(child1, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      const child2 = spawn(parent, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      const childOfChild2 = spawn(child2, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      dispatch(child1, { value: 'msg0' });
      dispatch(child1, { value: 'msg1' });
      dispatch(child1, { value: 'msg2' });
      await delay(100);
      isStopped(child1).should.be.true;
      isStopped(childOfChild1).should.be.true;
      isStopped(child2).should.be.true;
      isStopped(childOfChild2).should.be.true;
      isStopped(parent).should.be.false;
    });

    it('should be able to stop all children', async function () {
      const stopAllChildren = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.stopAllChildren;
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;

      const parent = createSupervisor(system, { name: 'test1', onCrash: stopAllChildren });
      const child1 = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });
      const child2 = spawn(parent, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test2' });
      dispatch(child1, { value: 'msg0' });
      dispatch(child1, { value: 'msg1' });
      dispatch(child1, { value: 'msg2' });
      await delay(100);
      isStopped(child1).should.be.true;
      isStopped(child2).should.be.true;
      isStopped(parent).should.be.false;
    });

    it('should be able to stop faulted child', async function () {
      const stopChild = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.stopChild;
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;

      const parent = createSupervisor(system, { name: 'test1', onCrash: stopChild });
      const child1 = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        return state + 1;
      }, { name: 'test', onCrash: escalate });
      const child2 = spawn(parent, (state = 0) => {
        return state + 1;
      }, { name: 'test2' });
      dispatch(child1, { value: 'msg0' });
      dispatch(child1, { value: 'msg1' });
      dispatch(child1, { value: 'msg2' });
      await delay(100);
      isStopped(child1).should.be.true;
      isStopped(child2).should.be.false;
      isStopped(parent).should.be.false;
    });

    it('should be able to reset all peers and stop children', async function () {
      const resetAll = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.resetAll;
      const parent = createSupervisor(system, 'test1');
      const child1 = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: resetAll });
      const childOfChild1 = spawn(child1, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      const child2 = spawn(parent, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      const childOfChild2 = spawn(child2, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      dispatch(child2, { value: 'msg0' });
      dispatch(childOfChild2, { value: 'msg0' });
      dispatch(child1, { value: 'msg0' });
      dispatch(childOfChild1, { value: 'msg0' });
      dispatch(child2, { value: 'msg1' });
      dispatch(childOfChild2, { value: 'msg1' });
      dispatch(child1, { value: 'msg1' });
      dispatch(childOfChild1, { value: 'msg0' });
      dispatch(child2, { value: 'msg2' });
      dispatch(childOfChild2, { value: 'msg2' });
      dispatch(child1, { value: 'msg2' });
      dispatch(childOfChild1, { value: 'msg2' });
      await delay(100);
      let result = await query(child1, x => ({ value: 'msg3', sender: x }), 300);
      let result2 = await query(child2, x => ({ value: 'msg3', sender: x }), 300);

      result.should.equal(1);
      result2.should.equal(1);
      isStopped(childOfChild1).should.be.true;
      isStopped(childOfChild2).should.be.true;
    });

    it('should be able to reset all children', async function () {
      const resetAllChildren = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.resetAllChildren;
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const parent = createSupervisor(system, { name: 'test1', onCrash: resetAllChildren });
      const child1 = spawn(parent, (state = 0, msg,) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });
      const child2 = spawn(parent, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      console.log('dispatching messages');
      dispatch(child2, { value: 'msg0' });
      dispatch(child1, { value: 'msg0' });
      dispatch(child2, { value: 'msg1' });
      dispatch(child1, { value: 'msg1' });
      dispatch(child2, { value: 'msg2' });
      dispatch(child1, { value: 'msg2' });
      await delay(100);
      let result = await query(child1, x => ({ value: 'msg3', sender: x }), 300);
      let result2 = await query(child2, x => ({ value: 'msg3', sender: x }), 300);
      result.should.equal(1);
      result2.should.equal(1);
    });

    it('should be able to reset child', async function () {
      const resetChild = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.resetChild;
      const escalate = (_msg: any, _err: any, ctx: SupervisionContext<any, any>) => ctx.escalate;
      const parent = createSupervisor(system, { name: 'test1', onCrash: resetChild });
      const child1 = spawn(parent, (state = 0, msg) => {
        if (state + 1 === 3 && msg.value !== 'msg3') {
          throw new Error('Very bad thing');
        }
        dispatch(msg.sender, state + 1);
        return state + 1;
      }, { name: 'test', onCrash: escalate });
      const child2 = spawn(parent, (state = 0, msg) => {
        dispatch(msg.sender, state + 1);
        return state + 1;
      });
      dispatch(child2, { value: 'msg0' });
      dispatch(child1, { value: 'msg0' });
      dispatch(child2, { value: 'msg1' });
      dispatch(child1, { value: 'msg1' });
      dispatch(child2, { value: 'msg2' });
      dispatch(child1, { value: 'msg2' });
      await delay(100);
      let result = await query(child1, x => ({ sender: x, value: 'msg3' }), 300);
      let result2 = await query(child2, x => ({ sender: x, value: 'msg3' }), 300);
      result.should.equal(1);
      result2.should.equal(4);
    });
  });

  describe('#afterStop', function () {
    let system: LocalActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => {
      stop(system);
      // reset console
      delete (console as any).error;
    });

    it('should be able to act on context after stop', function (done) {
      const afterStop = (_state: any, ctx: ActorContext<any, any>) => {
        ctx.mailbox.length.should.equal(1);
        ctx.mailbox.shift().message.should.equal(2);

        ctx.parent.should.equal(system);
        done();
      };

      const child = spawn(system, async (state = {}, _msg, _ctx) => {
        await delay(100);
        return state;
      }, { name: 'test', afterStop });

      dispatch(child, 1);
      dispatch(child, 2);
      stop(child);
    });
  });
});

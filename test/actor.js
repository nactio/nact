/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();
const { start, spawn, spawnStateless } = require('../lib');
const { Promise } = require('bluebird');
const { LocalPath } = require('../lib/paths');
const delay = Promise.delay;

const spawnChildrenEchoer = (parent, name) =>
  spawnStateless(
    parent,
    function (msg) { this.tell(this.sender, [...this.children.keys()]); },
    name
  );

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
          this.tell(this.sender, result);
        }
      );

      let result = await child.ask();
      result.should.equal(2);
    });

    it('allows stateful behaviour', async function () {
      let actor = spawn(
        system,
         function (state = '', msg) {
           if (msg.type === 'query') {
             this.tell(this.sender, state);
             return state;
           } else if (msg.type === 'append') {
             return state + msg.payload;
           }
         }
      );

      actor.tell({ payload: 'Hello ', type: 'append' });
      actor.tell({ payload: 'World. ', type: 'append' });
      actor.tell({ payload: 'The time has come!!', type: 'append' });
      let result = await actor.ask({ type: 'query' });
      result.should.equal('Hello World. The time has come!!');
    });

    it('evalutes in order when returning a promise from the actor function', async function () {
      let child = spawnStateless(
        system,
        async function (msg) {
          if (msg === 2) {
            await delay(10);
          }
          this.tell(this.sender, msg);
        },
        'testActor'
      );

      let result1 = await child.ask(1);
      let result2 = await child.ask(2);
      let result3 = await child.ask(3);
      result1.should.equal(1);
      result2.should.equal(2);
      result3.should.equal(3);
    });

    it('should automatically stop if error is thrown', async function () {
      console.error = ignore;
      let child = spawnStateless(system, (msg) => { throw new Error('testError'); });
      child.tell();
      await retry(() => child.isStopped().should.be.true, 12, 10);
    });

    it('should automatically stop if rejected promise is thrown', async function () {
      console.error = ignore;
      let child = spawnStateless(system, (msg) => Promise.reject(new Error('testError')));
      child.tell();
      await retry(() => child.isStopped().should.be.true, 12, 10);
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
      child1.isStopped().should.be.true;
      grandchild1.isStopped().should.be.true;
      grandchild2.isStopped().should.be.true;

      system.stop();
      system.children().should.be.empty;
      actor.isStopped().should.be.true;
      child2.isStopped().should.be.true;
    });

    it('is invoked automatically when the next state is not returned', async function () {
      let child = spawn(system, ignore, 'testActor');
      child.tell();
      await retry(() => child.isStopped().should.be.true, 12, 10);
      system.children().should.not.include('testActor');
    });

    it('should be able to be invoked multiple times', async function () {
      let child = spawn(system, ignore);
      child.stop();
      await retry(() => child.isStopped().should.be.true, 12, 10);
      child.stop();
      child.isStopped().should.be.true;
    });

    it('should ignore subsequent tells', async function () {
      let child = spawnStateless(system, () => { throw new Error('Should not be triggered'); });
      child.stop();
      await retry(() => child.isStopped().should.be.true, 12, 10);
      child.tell('test');
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

    it('automatically names an actor if a name is not provided', function () {
      let child = spawnStateless(system, (msg) => msg);
      system.children().size.should.equal(1);
      child.name.should.not.be.undefined;
    });

    it('should prevent a child with the same name from being spawned', function () {
      let child = spawnStateless(system, ignore);
      spawnStateless(child, ignore, 'grandchild');
      (() => spawnStateless(child, ignore, 'grandchild')).should.throw(Error);
    });

    it('correctly registers children upon startup', async function () {
      let child = spawnChildrenEchoer(system, 'testChildActor');
      system.children().should.have.keys('testChildActor');
      let children = await child.ask();
      children.should.be.empty;

      spawnStateless(child, ignore, 'testGrandchildActor');
      child.children().should.have.keys('testGrandchildActor');
      children = await child.ask();
      children.should.have.members(['testGrandchildActor']);

      spawnStateless(child, ignore, 'testGrandchildActor2');
      children = await child.ask();
      child.children().should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      children.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);
    });

    it('can be invoked from within actor', async function () {
      let actor = spawnStateless(system, function (msg) {
        if (msg === 'spawn') {
          spawnStateless(this.self, ignore, 'child1');
          spawn(this.self, ignore, 'child2');
        } else {
          this.tell(this.sender, [...this.children.keys()]);
        }
      }, 'test');
      actor.tell('spawn');
      let children = await actor.ask('query');
      children.should.have.members(['child1', 'child2']);
      actor.children().should.have.keys('child1', 'child2');
    });
  });

  describe('#ask()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => system.stop());

    it(`should reject a promise if actor has already stopped`, async function () {
      let actor = spawnStateless(system, ignore);
      actor.stop();
      await delay(5).then(() => actor.ask()).should.be.rejectedWith(Error, 'Actor stopped. Ask can never resolve');
    });

    it(`should reject a promise if the actor hasn't responded with the given timespan`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { await delay(10); ctx.tell(ctx.sender, 'done'); },
        'test'
      );
      (await (actor.ask('test', 1).catch(x => x))).should.be.instanceOf(Error);
    });

    it(`should resolve the promise if the actor has responded with the given timespan, clearing the timeout`, async function () {
      let actor = spawnStateless(
        system,
        async (msg, ctx) => { await delay(10); ctx.tell(ctx.sender, 'done'); },
        'test'
      );
      (await actor.ask('test', 50)).should.equal('done');
    });
  });

  describe('#tell()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => system.stop());

    it('telling inside actor with non addressable recipient type should throw error', async function () {
      let child = spawnStateless(system, function (msg) {
        try {
          this.tell({}, 'test');
        } catch (e) {
          this.tell(this.sender, e);
        }
      });
      let result = await child.ask();
      result.should.be.an('error');
    });

    it('should be able to tell other actors', async function () {
      let child1 = spawnStateless(system, function (msg) { this.tell(msg, this.sender); });
      let child2 = spawnStateless(system, function (msg) { this.tell(msg, 'hello from child2'); });
      let result = await child1.ask(child2);
      result.should.equal('hello from child2');
    });
  });
});

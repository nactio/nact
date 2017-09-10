const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const should = chai.should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;

const spawnChildrenEchoer = (parent, name) => parent.spawnFixed((msg, { sender, children, tell }) => {
  tell(sender, [...children.keys()]);
}, name);

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
}

describe('Actor', function () {

  describe('#stop()', function () {

    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it('stops children when parent is stopped', async function () {
      let actor = spawnChildrenEchoer(system);
      let child1 = spawnChildrenEchoer(actor, 'child1');
      let child2 = spawnChildrenEchoer(actor, 'child2');
      let grandchild1 = child1.spawnFixed(ignore, 'grandchild1');
      let grandchild2 = child1.spawnFixed(ignore, 'grandchild2');

      // Wait for actors to start up correctly      
      child1.stop();
      child1.isStopped().should.be.true;
      grandchild1.isStopped().should.be.true;
      grandchild2.isStopped().should.be.true;

      system.stop();
      system.children().should.be.empty;
      actor.isStopped().should.be.true;
      child2.isStopped().should.be.true;
    });

    it('is invoked automatically when a fixed function returns false', async function () {
      let child = system.spawnFixed(() => false, 'testActor');
      child.tell();
      await retry(() => child.isStopped().should.be.true, 12, 10);
      system.children().should.not.include('testActor');
    }).timeout(3000);

    it('is invoked automatically when a function is not returned', async function () {
      let child = system.spawn(() => (msg) => { }, 'testActor');
      child.tell();
      await retry(() => child.isStopped().should.be.true, 12, 10);
      system.children().should.not.include('testActor');
    }).timeout(3000);

  });

  describe('#terminate()', function () {
    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it('terminates children when parent is terminated', async function () {
      let actor = spawnChildrenEchoer(system);
      let child1 = spawnChildrenEchoer(actor, 'child1');
      let child2 = spawnChildrenEchoer(actor, 'child2');
      let grandchild1 = child1.spawnFixed(ignore, 'grandchild1');
      let grandchild2 = child1.spawnFixed(ignore, 'grandchild2');

      child1.terminate();

      child1.isStopped().should.be.true;
      grandchild1.isStopped().should.be.true;
      grandchild2.isStopped().should.be.true;

      system.terminate();
      system.children().should.be.empty;
      actor.isStopped().should.be.true;
      child2.isStopped().should.be.true;
    });

  });

  describe('#spawn()', function () {

    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it('automatically names an actor if a name is not provided', function () {
      let child = system.spawnFixed((msg) => msg);
      system.children().size.should.equal(1);
      child.name.should.not.be.undefined;
    });


    it('correctly registers children upon startup', async function () {
      let child = spawnChildrenEchoer(system, 'testChildActor');
      system.children().should.have.keys('testChildActor');
      let children = await child.ask();
      children.should.be.empty;

      let grandchild = child.spawnFixed(ignore, 'testGrandchildActor');
      child.children().should.have.keys('testGrandchildActor');
      children = await child.ask();
      children.should.have.members(['testGrandchildActor']);

      let grandchild2 = child.spawnFixed(ignore, 'testGrandchildActor2');
      children = await child.ask();      
      child.children().should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      children.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);      
    });

    it('can be invoked from within actor', async function () {
      let actor = system.spawnFixed((msg, ctx) => {
        if (msg === 'spawn') {          
            ctx.spawnFixed((msg) => { }, 'child1');          
        } else {
          ctx.tell(ctx.sender, [...ctx.children.keys()]);
        }
      }, 'test');
      actor.tell('spawn');
      let children = await actor.ask('query');
      children.should.have.members(['child1']);
      actor.children().should.have.keys('child1');
    }).timeout(6000);
  });

  describe('#ask()', function () {
    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it(`should reject a promise if the actor hasn't responded with the given timespan`, function () {
      let actor = system.spawnFixed(
        async (msg, ctx) => { await delay(10); ctx.tell(ctx.sender, 'done'); },
        'test'
      );
      return actor.ask('test', 1).should.be.rejectedWith(Error, 'Ask Timeout');

    });
  });

  describe('#tell()', function () {
    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it('should allow statful behaviour via trampolining', async function () {
      let actor = system.spawn(() => {
        let initialState = '';
        let f = (state) => (msg, { tell, sender }) => {
          if (msg.type === 'query') {
            tell(sender, state);
            return f(state);
          } else if (msg.type === 'append') {
            return f(state + msg.payload);
          }
        };
        return f(initialState);
      });

      actor.tell({ payload: 'Hello ', type: 'append' });
      actor.tell({ payload: 'World. ', type: 'append' });
      actor.tell({ payload: 'The time has come!!', type: 'append' });
      let result = await actor.ask({ type: 'query' });
      result.should.equal('Hello World. The time has come!!');
    });

    it('should be able to message other actors', async function () {
      let child1 = system.spawnFixed(function (msg) { this.tell(msg, this.sender); });
      let child2 = system.spawnFixed(function (msg) { this.tell(msg, 'hello from child2'); });
      let result = await child1.ask(child2);
      result.should.equal('hello from child2');
    });

    it('allows promises to resolve inside actor', async function () {
      const getMockValue = () => Promise.resolve(2);
      let child = system.spawnFixed(async function (msg) {
        let result = await getMockValue();
        this.tell(this.sender, result);
      }, 'testActor', {  });

      let result = await child.ask();
      result.should.equal(2);
    });

    it('evalutes in order when returning a promise from the actor function', async function () {
      let child = system.spawnFixed(async function(msg) {
        if (msg === 2) {
          await delay(10);
        }
        this.tell(this.sender, msg);
      }, 'testActor');

      let result1 = await child.ask(1);
      let result2 = await child.ask(2);
      let result3 = await child.ask(3);
      result1.should.equal(1);
      result2.should.equal(2);
      result3.should.equal(3);
    });

  });

});
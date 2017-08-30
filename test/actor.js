const { should } = require('chai').should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;

const spawnChildrenEchoer = (parent, name) => parent.spawnFixed(() => tell(sender, [...children.keys()]), name);
const ignore = () => { };

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
      await delay(300);
      child1.stop();
      await delay(300);

      child1.isStopped.should.be.true;
      grandchild1.isStopped.should.be.true;
      grandchild2.isStopped.should.be.true;

      system.stop();
      await delay(300);
      system.children.should.be.empty;
      actor.isStopped.should.be.true;
      child2.isStopped.should.be.true;
    });

    it('is invoked automatically when a fixed function returns false', async function () {
      let child = system.spawnFixed((msg) => msg, 'testActor');
      child.tell(true);
      await delay(500);
      child.isStopped.should.be.false;
      child.tell(false);
      await delay(500);
      child.isStopped.should.be.true;
      system.children.should.not.include('testActor');
    });

    it('is invoked automatically when a function is not returned', async function () {
      let child = system.spawn(() => (msg) => { }, 'testActor');
      child.tell();
      await delay(500);
      child.isStopped.should.be.true;
      system.children.should.not.include('testActor');
    });

  });

  describe('#terminate()', function () {
    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());


    it('kills a runaway infinitely looping process', async function () {
      let runAwayActor = system.spawnFixed((msg) => {

        function fibonacci(num) {
          var a = 1, b = 0, temp;
          while (num >= 0) {
            temp = a;
            a = a + b;
            b = temp;
            num--;
          }
          return b;
        }
        let i = 0;
        tell(sender, 'start fib');
        while (true) {
          i++;
          fibonacci(i);
        }
      }, 'testActor');

      await runAwayActor.ask();
      await delay(100);
      runAwayActor.terminate();
      await delay(100);
      runAwayActor.isStopped.should.be.true;
    });

    it('terminates children when parent is terminated', async function () {
      let actor = spawnChildrenEchoer(system);
      let child1 = spawnChildrenEchoer(actor, 'child1');
      let child2 = spawnChildrenEchoer(actor, 'child2');
      let grandchild1 = child1.spawnFixed(ignore, 'grandchild1');
      let grandchild2 = child1.spawnFixed(ignore, 'grandchild2');

      // Wait for actors to start up correctly
      await delay(300);
      child1.terminate();
      await delay(300);

      child1.isStopped.should.be.true;
      grandchild1.isStopped.should.be.true;
      grandchild2.isStopped.should.be.true;

      system.terminate();
      await delay(300);
      system.children.should.be.empty;
      actor.isStopped.should.be.true;
      child2.isStopped.should.be.true;
    });

  });

  describe('#spawn()', function () {

    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it('automatically names an actor if a name is not provided', async function () {
      let child = system.spawnFixed((msg) => msg);
      await delay(200);
      system.children.size.should.equal(1);
      child.name.should.not.be.undefined;
    });


    it('correctly registers children upon startup', async function () {
      let child = spawnChildrenEchoer(system, 'testChildActor');
      system.children.should.have.keys('testChildActor');

      let children = await child.ask();
      children.should.be.empty;

      let grandchild = child.spawnFixed(ignore, 'testGrandchildActor');
      await delay(100);
      children = await child.ask();

      children.should.have.members(['testGrandchildActor']);
      child.children.should.have.keys('testGrandchildActor');

      let grandchild2 = child.spawnFixed(ignore, 'testGrandchildActor2');
      await delay(100);
      children = await child.ask();
      child.children.should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      children.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);
    });

  });

  describe('#ask()', function () {

  });

  describe('#<effect>()', function () {

    let system = undefined;
    beforeEach(() => system = start());
    afterEach(() => system.terminate());

    it('can be resolved when returning a value', async function () {
      let child = system.spawnFixed(async (msg) => {
        let result = await getMockValue();
        tell(sender, result);
      }, 'testActor', { getMockValue: { f: () => 2, async: true } });

      let result = await child.ask();
      result.should.equal(2);
    });

    it('can be resolved when returning a promise', async function () {
      let child = system.spawnFixed(async (msg) => {
        let result = await getMockValue();
        tell(sender, result);
      }, 'testActor', { getMockValue: { f: () => Promise.resolve(2), async: true } });

      let result = await child.ask();
      result.should.equal(2);
    });


    it('is evaluted in order when returning a promise from the actor function', async function () {
      let child = system.spawnFixed(async (msg) => {
        if (msg === 2) {
          await delayExecution(200);
        }
        tell(sender, msg);
      }, 'testActor', { delayExecution: { f: (d) => delay(d), async: true } });

      let result1 = await child.ask(1);
      let result2 = await child.ask(2);
      let result3 = await child.ask(3);
      result1.should.equal(1);
      result2.should.equal(2);
      result3.should.equal(3);
    });

  });

});
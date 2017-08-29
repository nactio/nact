const { should } = require('chai').should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;

describe('Actor', function () {

  describe('lifecycle', function () {
    let system = undefined;

    beforeEach(function () {
      system = start();
    });

    afterEach(function () {
      system.terminate();
    });

    it('automatically names an actor if a name is not provided', async function () {
      let child = system.spawnFixed((msg) => msg);      
      await delay(200);
      system.children.size.should.equal(1);
      child.name.should.not.be.undefined;
    });
    
    it('shutdowns automatically when a fixed function returns false', async function () {
      let child = system.spawnFixed((msg) => msg, 'testActor');
      child.tell(true);
      await delay(500);
      child.isStopped.should.be.false;
      child.tell(false);
      await delay(500);
      child.isStopped.should.be.true;
      system.children.should.not.include('testActor');
    });

    it('shutdowns automatically when a function is not returned', async function () {
      let child = system.spawn(() => (msg) => { }, 'testActor');
      child.tell();
      await delay(500);
      child.isStopped.should.be.true;
      system.children.should.not.include('testActor');
    });

    it('stops children when parents are stopped and correctly registers them upon startup', async function () {
      let child = system.spawnFixed(() => tell(sender, [...children.keys()]), 'testChildActor');            
      system.children.should.have.keys('testChildActor');

      let children = await child.ask();
      children.should.be.empty;

      let grandchild = child.spawnFixed(() => { }, 'testGrandchildActor');
      await delay(100);
      children = await child.ask();
      
      children.should.have.members(['testGrandchildActor']);
      child.children.should.have.keys('testGrandchildActor');

      let grandchild2 = child.spawnFixed(() => { }, 'testGrandchildActor2');
      await delay(100);
      children = await child.ask();
      child.children.should.have.keys('testGrandchildActor2', 'testGrandchildActor');
      children.should.have.members(['testGrandchildActor2', 'testGrandchildActor']);

      grandchild.stop();
      await delay(100);
      children = await child.ask();
      children.should.have.members(['testGrandchildActor2']);
      child.children.should.have.keys('testGrandchildActor2');

      child.stop();
      await delay(100);
      grandchild.isStopped.should.be.true;
      system.children.should.not.have.keys('testChildActor');
    });

  });

  
});
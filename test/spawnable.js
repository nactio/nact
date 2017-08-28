const { should } = require('chai').should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;

describe('Spawnable', function () {
  let system = start();

  describe('#spawn()', function () {
    it('Should correctly register children when spawned', async function () {
      let child = system.spawnSimple(() => (msg) => { tell(sender, children); }, 'testChildActor');
      system.children.should.have.key('testChildActor');      
      let children = await child.ask();      
      console.log(JSON.stringify(children));
      Object.keys(children).should.have.length(0);
      let grandchild = child.spawn(() => { }, 'testGrandchildActor');
      children = await child.ask();
      children.should.have.key('testGrandchildActor');
      child.stop();
      await delay(100);
      system.children.should.not.have.key('testChildActor');
      
    });

  });



  // describe.skip('#spawnSimple()');
});
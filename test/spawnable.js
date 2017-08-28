const { should } = require('chai').should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;

describe('Spawnable', function () {
  let system = start();

  describe('#spawn()', function () {
    it('Should correctly register children when spawned', function () {
      let child = system.spawnSimple(() => (msg) => { tell(sender, children); }, 'testChildActor');
      system.children.should.have.key('testChildActor');
      
      return child.ask()
        .then((children) => {          
          console.log('chillren'+JSON.stringify(children));
          Object.keys(children).should.have.length(0);
          let grandchild = child.spawn(() => { }, 'testGrandchildActor');
          return child.ask();
        })
        .then((children) => {
          children.should.have.key('testGrandchildActor');
          child.stop();
          return delay(100);
        }).done(()=> system.children.should.not.have.key('testChildActor'));
    });

  });



  // describe.skip('#spawnSimple()');
});
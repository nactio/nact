import { should as createShould } from 'chai';
import { start } from '../lib';
import { Promise } from 'bluebird';
const delay = Promise.delay;
const should = createShould();

describe('Spawnable', function () {
  let system = start();

  describe('#spawn()', function () {
    it('Should correctly register children when spawned', function () {
      let child = system.spawnSimple(() => (msg) => { tell(sender, children); }, 'testActor');
      system.children.should.have.key('testActor');
      return child
        .ask()
        .then((children) => {
          children.should.have.length(0);
          let grandchild = child.spawn(() => { });
          return child.ask();
        })
        .then((children) => {
          children.should.have.length(1);
          child.stop();
          return delay(100);
        }).then(()=> system.children.should.have.length(0));




    });

  });



  // describe.skip('#spawnSimple()');
});
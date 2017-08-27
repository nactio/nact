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
      child.ask({}).then((children)=>{
        
      });

      let grandchild = child.spawn(()=>{})
      
      
      child.stop();
      return delay(100).then(() => system.children.should.not.have.key('testActor'));      
    });

  });



  // describe.skip('#spawnSimple()');
});
const { should } = require('chai').should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;

describe('Actor', function () {
  describe('effect system', function () {
    let system = undefined;

    beforeEach(function () {
      system = start();
    });

    afterEach(function () {
      system.terminate();
    });

    it('allows synchonous effects to be resolved within actor', async function () {
      let child = system.spawnFixed(async (msg) => {
        let result = await getMockValue();
        tell(sender, result);
      }, 'testActor', { getMockValue: { f: () => 2, async: true } });

      let result = await child.ask();
      result.should.equal(2);
    });

    it('allows asynchonous effects to be resolved within actor', async function () {
      let child = system.spawnFixed(async (msg) => {
        let result = await getMockValue();
        tell(sender, result);
      }, 'testActor', { getMockValue: { f: () => Promise.resolve(2), async: true } });

      let result = await child.ask();
      result.should.equal(2);
    });


    it('asynchonous effects occur in order', async function () {
      let child = system.spawnFixed(async (msg) => {
        if(msg==2){
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
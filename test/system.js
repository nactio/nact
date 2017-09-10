const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const should = chai.should();
const { start } = require('../lib');
const { Promise } = require('bluebird');
const delay = Promise.delay;


describe('Actor', function () {
    describe('#stop()', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());
        
        it('should prevent children from being spawned after being called', function(){
            system.stop();
            (() => system.spawnFixed(()=>console.log('spawning'))).should.throw(Error);
            (() => system.spawn(()=>()=>console.log('spawning'))).should.throw(Error);
        });
    });

    describe('#terminate()', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());
        
        it('should prevent children from being spawned after being called', function(){
            system.terminate();
            (() => system.spawnFixed(()=>console.log('spawning'))).should.throw(Error);
            (() => system.spawn(()=>()=>console.log('spawning'))).should.throw(Error);
        });
    });
});
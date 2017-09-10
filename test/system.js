const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const should = chai.should();
const { start } = require('../lib');
const { Nobody } = require('../lib/nobody');
const { Promise } = require('bluebird');
const delay = Promise.delay;


describe('System', function () {
    describe('#deadLetter', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());

        it('currently does nothing', function () {
            new Nobody(system).tell('test');
        });
    });

    describe('#spawn()', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());

        it('should prevent a child with the same name from being spawned', function () {
            system.spawnFixed(()=>console.log('hello'), 'child1');
            (()=>system.spawnFixed(()=>console.log('hello'), 'child1')).should.throw(Error);
        });
    });
    
    describe('#stop()', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());

        it('should prevent children from being spawned after being called', function () {
            system.stop();
            (() => system.spawnFixed(() => console.log('spawning'))).should.throw(Error);
            (() => system.spawn(() => () => console.log('spawning'))).should.throw(Error);
        });
    });

    describe('#terminate()', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());

        it('should prevent children from being spawned after being called', function () {
            system.terminate();
            (() => system.spawnFixed(() => console.log('spawning'))).should.throw(Error);
            (() => system.spawn(() => () => console.log('spawning'))).should.throw(Error);
        });
    });
});
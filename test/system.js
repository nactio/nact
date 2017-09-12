const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const should = chai.should();
const { start } = require('../lib');
const { LocalPath } = require('../lib/paths');
const { Nobody } = require('../lib/nobody');
const { Promise } = require('bluebird');
const delay = Promise.delay;

const ignore = () => { };

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
            system.spawnFixed(() => console.log('hello'), 'child1');
            (() => system.spawnFixed(() => console.log('hello'), 'child1')).should.throw(Error);
        });
    });

    describe('#resolveActorFromPath()', function () {
        let system = undefined;
        beforeEach(() => system = start());
        afterEach(() => system.terminate());

        it('should correctly resolve existing actor from a LocalPath', function () {
            let child1 = system.spawnFixed(ignore, 'child1');
            let child2 = child1.spawnFixed(ignore, 'child2');
            let child3 = child2.spawnFixed(ignore, 'child3');
            system.resolveActorFromPath(new LocalPath(['child1', 'child2', 'child3'])).should.equal(child3);
        });

        it('should return undefined if the actor at the given path does not exist', function () {
            let child1 = system.spawnFixed(ignore, 'child1');
            let child2 = child1.spawnFixed(ignore, 'child2');
            let child3 = child2.spawnFixed(ignore, 'child3');
            should.not.exist(system.resolveActorFromPath(new LocalPath(['child1', 'child2', 'child3', 'child4'])));
        });

        it('should throw a TypeError if the path is not of a supported type', function () {
            let child1 = system.spawnFixed(ignore, 'child1');
            let child2 = child1.spawnFixed(ignore, 'child2');
            let child3 = child2.spawnFixed(ignore, 'child3');
            (() => system.resolveActorFromPath({ localParts: ['child1', 'child2', 'child3', 'child4'] })).should.throw(TypeError);
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
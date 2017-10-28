/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { start, spawnStateless, spawn, stop } = require('../lib');
const { applyOrThrowIfStopped } = require('../lib/references');

const isStopped = (reference) => {
  try {
    return applyOrThrowIfStopped(reference).stopped;
  } catch (e) {
    return true;
  }
};

const ignore = () => {};

describe('System', function () {
  describe('#spawn()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    it('should prevent a child with the same name from being spawned', function () {
      spawnStateless(system, () => console.log('hello'), 'child1');
      (() => spawnStateless(system, () => console.log('hello'), 'child1')).should.throw(Error);
    });
  });

  describe('#stop()', function () {
    let system;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    it('should prevent children from being spawned after being called', function () {
      stop(system);
      (() => spawnStateless(system, () => console.log('spawning'))).should.throw(Error);
      (() => spawn(system, ignore)).should.throw(Error);
    });

    it('should register as being stopped', function () {
      stop(system);
      isStopped(system).should.be.true;
    });
  });
});

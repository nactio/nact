/* eslint-env jest */
/* eslint-disable no-unused-expressions */
import { start, dispatch, query, spawnStateless, spawn, stop } from './index';
import { applyOrThrowIfStopped } from './system-map';
import chai from 'chai';
import { ActorRef, ActorSystemRef } from './references';
chai.should();

const isStopped = (reference: ActorSystemRef | ActorRef<any, any>) => {
  try {
    return applyOrThrowIfStopped(reference, a => a.stopped);
  } catch (e) {
    return true;
  }
};

const ignore = () => { };

describe('System', function () {
  it('should sucessfully be able to start multiple systems without conflict', async function () {
    const system1 = start();
    const system2 = start();

    const actor1 = spawnStateless(system1, (msg) => dispatch(msg.sender, msg.value * 2), 'child1');
    const actor2 = spawnStateless(system2, (msg) => dispatch(msg.sender, msg.value), 'child1');
    const result1 = await query(actor1, x => ({ value: 5, sender: x }), 30);
    const result2 = await query(actor2, x => ({ value: 5, sender: x }), 30);
    result1.should.equal(10);
    result2.should.equal(5);
  });

  it('should be able to have a custom name specified', async function () {
    const system = start({ name: 'henry' });
    system.system.name!.should.equal('henry');
  });

  describe('#spawn()', function () {
    let system: ActorSystemRef;
    beforeEach(() => { system = start(); });
    afterEach(() => stop(system));

    it('should prevent a child with the same name from being spawned', function () {
      spawnStateless(system, () => console.log('hello'), 'child1');
      (() => spawnStateless(system, () => console.log('hello'), 'child1')).should.throw(Error);
    });
  });

  describe('#stop()', function () {
    let system: ActorSystemRef;
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

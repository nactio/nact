/* eslint-env jest */
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import { ActorPath } from './paths';
import { ActorRef, ActorSystemRef } from './references';
import { ActorSystem } from './system';
import { add, find, remove, applyOrThrowIfStopped } from './system-map';
const expect = chai.expect;
chai.should();

describe('#add()', function () {
  it('be able to add a system to the system map', function () {
    const systemName = 'hello5'
    const system = { name: systemName, find: () => undefined as any };
    const actorSystemRef = new ActorSystemRef(systemName, ActorPath.root(systemName));

    add(system);
    find<ActorSystem>(actorSystemRef)?.should.equal(system);
  });
});

describe('#find()', function () {
  it('be able to resolve a system', function () {
    const systemName = 'hello4'
    const system = { name: systemName, find: () => undefined as any };
    const actorSystemRef = new ActorSystemRef(systemName, ActorPath.root(systemName));


    add(system);
    find<ActorSystem>(actorSystemRef)?.should.equal(system);
  });

  it('be able to resolve an actor', function () {
    const actor = {};
    const systemName = 'hello3'
    let system = { name: systemName, find: (ref: ActorRef<any, any>) => ref.name === 'actor' && actor };
    add(system);
    const actorSystemRef = new ActorSystemRef(systemName, ActorPath.root(systemName));

    const actorRef = new ActorRef<any, any>(systemName, actorSystemRef, actorSystemRef.path.createChildPath('actor'), 'actor');

    find<any>(actorRef)?.should.equal(actor);
  });
});

describe('#remove()', function () {
  it('be able to remove a system from the system map', function () {
    const actor = {};
    const systemName = 'hello2'
    let system = { name: systemName, find: (ref: ActorRef<any, any>) => ref.name === 'actor' && actor };
    add(system);
    const actorSystemRef = new ActorSystemRef(systemName, ActorPath.root(systemName));
    remove('hello2');
    expect(find(actorSystemRef)).to.equal(undefined);
  });
});

describe('#applyOrThrowIfStopped()', function () {
  it('be able to apply the system to the function if the system can be found', function () {
    const actor = {};
    const systemName = 'hello2'
    let system = { name: systemName, find: (ref: ActorRef<any, any>) => ref.name === 'actor' && actor };
    add(system);
    const actorSystemRef = new ActorSystemRef(systemName, ActorPath.root(systemName));
    applyOrThrowIfStopped(actorSystemRef, s => s).should.equal(true);
  });

  it('be able to apply the actor to the function if the actor can be found', function () {
    const actor = {};
    const systemName = 'hello1'
    let system = { name: systemName, find: (ref: ActorRef<any, any>) => ref.name === 'actor' && actor };
    add(system);
    const actorSystemRef = new ActorSystemRef(systemName, ActorPath.root(systemName));
    const actorRef = new ActorRef<any, any>(systemName, actorSystemRef, actorSystemRef.path.createChildPath('actor'), 'actor');

    applyOrThrowIfStopped(actorRef, s => s).should.equal(true);
  });
});

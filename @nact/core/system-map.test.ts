/* eslint-env jest */
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import { spawnStateless } from './actor';
import { LocalActorRef, LocalActorSystemRef } from './references';
import { ActorSystem, start } from './system';
import { add, find, remove, applyOrThrowIfStopped } from './system-map';
const expect = chai.expect;
chai.should();

describe('#add()', function () {
  it('be able to add a system to the system map', function () {
    const systemName = 'hello5'
    const actorSystemRef: LocalActorSystemRef = { path: { parts: [], system: systemName } } as unknown as LocalActorSystemRef;

    const system = { reference: actorSystemRef, name: systemName, find: () => undefined as any };

    add(system);
    find<ActorSystem>(actorSystemRef)?.should.equal(system);
  });
});

describe('#find()', function () {
  it('be able to resolve a system', function () {
    const systemName = 'hello4'
    const actorSystemRef: LocalActorSystemRef = { path: { parts: [], system: systemName } } as unknown as LocalActorSystemRef;
    const system = { name: systemName, find: () => undefined as any, reference: actorSystemRef };
    add(system);
    find<ActorSystem>(actorSystemRef)?.should.equal(system);
  });

  it('be able to resolve an actor', function () {
    const actor = {};
    const systemName = 'hello3'
    const actorSystemRef: LocalActorSystemRef = { path: { parts: [], system: systemName } } as unknown as LocalActorSystemRef;

    const system = {
      name: systemName,
      reference: actorSystemRef,
      find: ((ref: LocalActorRef<any> | LocalActorSystemRef) => ref.path.parts[0] === 'actor' && actor),
    };

    add(system);

    const actorRef: LocalActorRef<any> = { path: { parts: ['actor'], system: systemName } } as unknown as LocalActorRef<any>;

    find<any>(actorRef)?.should.equal(actor);
  });
});

describe('#remove()', function () {
  it('be able to remove a system from the system map', function () {
    const actor = {};
    const systemName = 'hello2';
    const actorSystemRef: LocalActorSystemRef = { path: { parts: [], system: systemName } } as unknown as LocalActorSystemRef;

    let system = { name: systemName, find: (ref: LocalActorRef<any>) => ref.path.parts[0] === 'actor' && actor, reference: actorSystemRef };
    add(system);

    remove('hello2');
    expect(find(actorSystemRef)).to.equal(undefined);
  });
});

describe('#applyOrThrowIfStopped()', function () {
  it('be able to apply the system to the function if the system can be found', function () {
    const systemName = 'hello2'
    let systemRef = start({ name: systemName });
    applyOrThrowIfStopped(systemRef, s => !!s).should.equal(true);
  });

  it('be able to apply the actor to the function if the actor can be found', function () {
    const systemName = 'hello1'
    let systemRef = start({ name: systemName });
    const actorRef = spawnStateless(systemRef, () => true, 'actor');
    applyOrThrowIfStopped(actorRef, s => !!s).should.equal(true);
  });
});

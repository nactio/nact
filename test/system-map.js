/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const expect = chai.expect;
chai.should();
const { add, find, remove, applyOrThrowIfStopped } = require('../lib/system-map');

describe('#add()', function () {
  it('be able to add a system to the system map', function () {
    let system = { name: 'hello5' };
    add(system);
    find('hello5').should.equal(system);
  });
});

describe('#find()', function () {
  it('be able to resolve a system', function () {
    let system = { name: 'hello4' };
    add(system);
    find('hello4').should.equal(system);
  });

  it('be able to resolve an actor', function () {
    let actor = {};
    let system = { name: 'hello3', find: (ref) => ref === 'actor' && actor };
    add(system);
    find('hello3', 'actor').should.equal(actor);
  });
});

describe('#remove()', function () {
  it('be able to remove a system from the system map', function () {
    let system = { name: 'hello2' };
    add(system);
    remove('hello2');
    expect(find('hello2')).to.equal(undefined);
  });
});

describe('#applyOrThrowIfStopped()', function () {
  it('be able to apply the system to the function if the system can be found', function () {
    let system = { name: 'hello1', find: (ref) => ref.type === 'system' };
    add(system);
    applyOrThrowIfStopped({ type: 'system', system: { name: 'hello1' } }, s => s).should.equal(true);
  });

  it('be able to apply the actor to the function if the actor can be found', function () {
    let system = { name: 'hello1', find: (ref) => ref.type === 'actor' };
    add(system);
    applyOrThrowIfStopped({ type: 'actor', system: { name: 'hello1' } }, s => s).should.equal(true);
  });
});

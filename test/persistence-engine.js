/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { PersistedEvent, PersistedSnapshot, AbstractPersistenceEngine } = require('../lib/persistence');

describe('PersistedSnapshot', function () {
  it('should be immutable', function () {
    const event = new PersistedSnapshot('123', 1, 'test-key');
    event.sequenceNumber = 2;
    event.sequenceNumber.should.equal(1);
    event.data = '234';
    event.data.should.equal('123');
    event.key = 'another-test-key';
    event.key.should.equal('test-key');
  });

  describe('#data', function () {
    it('should disallow null values', function () {
      (() => new PersistedSnapshot(null, 1, 'test-key')).should.throw(Error);
    });
    it('should disallow undefined data values', function () {
      (() => new PersistedSnapshot(undefined, 1, 'test-key')).should.throw(Error);
    });
    it('should disallow non-number sequenceNums', function () {
      (() => new PersistedSnapshot({ msg: 'test' }, '1', 'test-key')).should.throw(Error);
    });
  });

  describe('#createdAt', function () {
    it('should be able to be explicitely set', function () {
      new PersistedSnapshot({ msg: 'test' }, 1, 'test-key', 123456).createdAt.should.equal(123456);
    });

    it('should default to the current time', function () {
      const oldGetTime = global.Date.prototype.getTime;
      global.Date.prototype.getTime = () => 123456;
      new PersistedSnapshot({ msg: 'test' }, 1, 'test-key').createdAt.should.equal(123456);
      global.Date.prototype.getTime = oldGetTime;
    });
  });
});

describe('PersistedEvent', function () {
  it('should be immutable', function () {
    const event = new PersistedEvent({ msg: '123' }, 1, 'test-key', ['tag', 'tag2']);
    event.sequenceNumber = 2;
    event.sequenceNumber.should.equal(1);
    event.data = { msg: '234' };
    event.data.msg.should.equal('123');
    event.key = 'another-test-key';
    event.key.should.equal('test-key');
    event.tags = [...event.tags, 'tag3'];
    event.tags.should.deep.equal(['tag', 'tag2']);
  });

  describe('#data', function () {
    it('should disallow null values', function () {
      (() => new PersistedEvent(null, 1, 'test-key', [])).should.throw(Error);
    });
    it('should disallow undefined data values', function () {
      (() => new PersistedEvent(undefined, 1, 'test-key', [])).should.throw(Error);
    });
    it('should disallow non-number sequenceNums', function () {
      (() => new PersistedEvent({ msg: 'test' }, '1', 'test-key', [])).should.throw(Error);
    });
  });

  describe('#tags', function () {
    it('should throw when the tags arg is not an array', function () {
      (() => new PersistedEvent({ msg: 'test' }, 1, 'test-key', 'tag')).should.throw(Error);
      (() => new PersistedEvent({ msg: 'test' }, '1', 'test-key', null)).should.throw(Error);
    });

    it('should disallow tag values which are not strings', function () {
      (() => new PersistedEvent({ msg: 'test' }, 1, 'test-key', ['tag', 1, 'tag2'])).should.throw(Error);
    });

    it('should default to an empty array', function () {
      new PersistedEvent({ msg: 'test' }, 1, 'test-key').tags.should.deep.equal([]);
    });
  });

  describe('#createdAt', function () {
    it('should be able to be explicitely set', function () {
      new PersistedEvent({ msg: 'test' }, 1, 'test-key', [], 123456).createdAt.should.equal(123456);
    });

    it('should default to the current time', function () {
      const oldGetTime = global.Date.prototype.getTime;
      global.Date.prototype.getTime = () => 123456;
      new PersistedEvent({ msg: 'test' }, 1, 'test-key', []).createdAt.should.equal(123456);
      global.Date.prototype.getTime = oldGetTime;
    });
  });
});

describe('AbstractPersistenceEngine', function () {
  it('should throw when functions are invoked', function () {
    const event = new PersistedEvent({ msg: '234' }, 1, 'test-key', []);
    const snapshot = new PersistedSnapshot('234', 1, 'test-key');
    const abstractEngine = new AbstractPersistenceEngine();
    (() => abstractEngine.events('123', 1)).should.throw(Error);
    (() => abstractEngine.persist(event)).should.throw(Error);
    (() => abstractEngine.latestSnapshot('123')).should.throw(Error);
    (() => abstractEngine.takeSnapshot(snapshot)).should.throw(Error);
  });
});

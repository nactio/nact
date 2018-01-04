/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
require('chai').should();
const { ActorPath } = require('../lib/paths');

describe('Path', function () {
  describe('#isValidName()', function () {
    it('should disallow non alphanumeric character (and dashes)', function () {
      ActorPath.isValidName('$').should.be.false;
      ActorPath.isValidName('frog%').should.be.false;
    });

    it('should disallow empty names', function () {
      ActorPath.isValidName('').should.be.false;
    });

    it('should disallow names which are not strings', function () {
      ActorPath.isValidName({}).should.be.false;
    });

    it('should disallow undefined or null names', function () {
      ActorPath.isValidName(null).should.be.false;
      ActorPath.isValidName(undefined).should.be.false;
    });

    it('should disallow whitespace', function () {
      ActorPath.isValidName(' ').should.be.false;
      ActorPath.isValidName('a ').should.be.false;
      ActorPath.isValidName(' a').should.be.false;
      ActorPath.isValidName('a a').should.be.false;
    });

    it('should allow names containing only alphanumeric characters and dashes', function () {
      ActorPath.isValidName('frog').should.be.true;
      ActorPath.isValidName('123').should.be.true;
      ActorPath.isValidName('123-abc').should.be.true;
      ActorPath.isValidName('-').should.be.true;
      ActorPath.isValidName('-a-').should.be.true;
    });
  });

  describe('#createChildPath()', function () {
    it('should append name to end of parts array if name is valid', function () {
      let path1 = ActorPath.root().createChildPath('a');
      path1.parts.should.deep.equal(['a']);

      let path2 = path1.createChildPath('b');
      path2.parts.should.deep.equal(['a', 'b']);

      let path3 = path2.createChildPath('c1234-d4');
      path3.parts.should.deep.equal(['a', 'b', 'c1234-d4']);
    });

    it('should throw an exception if the child name is invalid', function () {
      (() => ActorPath.root().createChildPath('$')).should.throw(Error);
      (() => ActorPath.root().createChildPath('a').createChildPath(' ')).should.throw(Error);
      (() => ActorPath.root().createChildPath('a').createChildPath('')).should.throw(Error);
      (() => ActorPath.root().createChildPath(undefined)).should.throw(Error);
      (() => ActorPath.root().createChildPath(null)).should.throw(Error);
      (() => ActorPath.root().createChildPath(123)).should.throw(Error);
      (() => ActorPath.root().createChildPath('.')).should.throw(Error);
    });
  });
});

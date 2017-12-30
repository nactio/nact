/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
require('chai').should();
const { Path } = require('../lib/paths');

describe('Path', function () {
  describe('#isValidName()', function () {
    it('should disallow non alphanumeric character (and dashes)', function () {
      Path.isValidName('$').should.be.false;
      Path.isValidName('frog%').should.be.false;
    });

    it('should disallow empty names', function () {
      Path.isValidName('').should.be.false;
    });

    it('should disallow names which are not strings', function () {
      Path.isValidName({}).should.be.false;
    });

    it('should disallow undefined or null names', function () {
      Path.isValidName(null).should.be.false;
      Path.isValidName(undefined).should.be.false;
    });

    it('should disallow whitespace', function () {
      Path.isValidName(' ').should.be.false;
      Path.isValidName('a ').should.be.false;
      Path.isValidName(' a').should.be.false;
      Path.isValidName('a a').should.be.false;
    });

    it('should allow names containing only alphanumeric characters and dashes', function () {
      Path.isValidName('frog').should.be.true;
      Path.isValidName('123').should.be.true;
      Path.isValidName('123-abc').should.be.true;
      Path.isValidName('-').should.be.true;
      Path.isValidName('-a-').should.be.true;
    });
  });

  describe('#createChildPath()', function () {
    it('should append name to end of localParts array if name is valid', function () {
      let path1 = Path.root().createChildPath('a');
      path1.localParts.should.deep.equal(['a']);

      let path2 = path1.createChildPath('b');
      path2.localParts.should.deep.equal(['a', 'b']);

      let path3 = path2.createChildPath('c1234-d4');
      path3.localParts.should.deep.equal(['a', 'b', 'c1234-d4']);
    });

    it('should throw an exception if the child name is invalid', function () {
      (() => Path.root().createChildPath('$')).should.throw(Error);
      (() => Path.root().createChildPath('a').createChildPath(' ')).should.throw(Error);
      (() => Path.root().createChildPath('a').createChildPath('')).should.throw(Error);
      (() => Path.root().createChildPath(undefined)).should.throw(Error);
      (() => Path.root().createChildPath(null)).should.throw(Error);
      (() => Path.root().createChildPath(123)).should.throw(Error);
      (() => Path.root().createChildPath('.')).should.throw(Error);
    });
  });
});

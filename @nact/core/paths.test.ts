/* eslint-env jest */
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import { ActorPath } from './paths';
chai.should();

describe('Path', function () {
  describe('#isValidName()', function () {
    // https://tools.ietf.org/html/rfc1738
    it('should disallow national, punctuation, reserved, hex, escape characters', function () {
      ActorPath.isValidName(';').should.be.false;
      ActorPath.isValidName('/').should.be.false;
      ActorPath.isValidName('{').should.be.false;
      ActorPath.isValidName('}').should.be.false;
      ActorPath.isValidName('\\').should.be.false;
      ActorPath.isValidName('^').should.be.false;
      ActorPath.isValidName('`').should.be.false;
      ActorPath.isValidName('~').should.be.false;
      ActorPath.isValidName('[').should.be.false;
      ActorPath.isValidName(']').should.be.false;
      ActorPath.isValidName('<').should.be.false;
      ActorPath.isValidName('>').should.be.false;
      ActorPath.isValidName('#').should.be.false;
      ActorPath.isValidName('%').should.be.false;
      ActorPath.isValidName('"').should.be.false;
      ActorPath.isValidName('?').should.be.false;
      ActorPath.isValidName('&').should.be.false;
    });

    it('should disallow empty names', function () {
      ActorPath.isValidName('').should.be.false;
    });

    it('should disallow names which are not strings', function () {
      ActorPath.isValidName({} as any).should.be.false;
    });

    it('should disallow undefined or null names', function () {
      ActorPath.isValidName(null as any).should.be.false;
      ActorPath.isValidName(undefined as any).should.be.false;
    });

    it('should disallow whitespace', function () {
      ActorPath.isValidName(' ').should.be.false;
      ActorPath.isValidName('a ').should.be.false;
      ActorPath.isValidName(' a').should.be.false;
      ActorPath.isValidName('a a').should.be.false;
    });

    it('should allow names containing only alpha, digit, safe, extra characters', function () {
      ActorPath.isValidName('frog').should.be.true;
      ActorPath.isValidName('123').should.be.true;
      ActorPath.isValidName('123-abc').should.be.true;
      ActorPath.isValidName('-').should.be.true;
      ActorPath.isValidName('-a-').should.be.true;
      ActorPath.isValidName('frog.path').should.be.true;
      ActorPath.isValidName('frog(path)').should.be.true;
    });
  });

  describe('#createChildPath()', function () {
    it('should append name to end of parts array if name is valid', function () {
      let path1 = ActorPath.createChildPath(ActorPath.root('root'), 'a');
      path1.parts.should.deep.equal(['a']);

      let path2 = ActorPath.createChildPath(path1, 'b');
      path2.parts.should.deep.equal(['a', 'b']);

      let path3 = ActorPath.createChildPath(path2, 'c1234-d4');
      path3.parts.should.deep.equal(['a', 'b', 'c1234-d4']);
    });

    it('should throw an exception if the child name is invalid', function () {
      (() => ActorPath.createChildPath(ActorPath.root('root'), '?')).should.throw(Error);
      (() => ActorPath.createChildPath(ActorPath.createChildPath(ActorPath.root('root'), 'a'), ' ')).should.throw(Error);
      (() => ActorPath.createChildPath(ActorPath.createChildPath(ActorPath.root('root'), 'a'), '')).should.throw(Error);
      (() => ActorPath.createChildPath(ActorPath.root('root'), undefined as any)).should.throw(Error);
      (() => ActorPath.createChildPath(ActorPath.root('root'), null as any)).should.throw(Error);
      (() => ActorPath.createChildPath(ActorPath.root('root'), 123 as any)).should.throw(Error);
      (() => ActorPath.createChildPath(ActorPath.root('root'), '&')).should.throw(Error);
    });
  });
});

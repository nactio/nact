const { should } = require('chai').should();
const { expect } = require('chai');
const { LocalPath } = require('../lib/paths');

describe('LocalPath', function () {
    describe('#isValidName()', function () {
        it('should disallow non alphanumeric character (and dashes)', function () {
            LocalPath.isValidName('$').should.be.false;
            LocalPath.isValidName('frog%').should.be.false;
        });

        it('should disallow empty names', function () {
            LocalPath.isValidName('').should.be.false;
        });

        it('should disallow names which are not strings', function () {
            LocalPath.isValidName({}).should.be.false;
        });

        it('should disallow undefined or null names', function () {
            LocalPath.isValidName(null).should.be.false;
            LocalPath.isValidName(undefined).should.be.false;
        });

        it('should disallow whitespace', function () {
            LocalPath.isValidName(' ').should.be.false;
            LocalPath.isValidName('a ').should.be.false;
            LocalPath.isValidName(' a').should.be.false;
            LocalPath.isValidName('a a').should.be.false;
        });

        it('should allow names containing only alphanumeric characters and dashes', function () {
            LocalPath.isValidName('frog').should.be.true;
            LocalPath.isValidName('123').should.be.true;
            LocalPath.isValidName('123-abc').should.be.true;
            LocalPath.isValidName('-').should.be.true;
            LocalPath.isValidName('-a-').should.be.true;
        });
    });

    describe('#createChildPath()', function () {
        it('should append name to end of localParts array if name is valid', function () {
            let path1 = LocalPath.root().createChildPath('a');
            path1.localParts.should.deep.equal(['a']);
            

            let path2 = path1.createChildPath('b');
            path2.localParts.should.deep.equal(['a', 'b']);

            let path3 = path2.createChildPath('c1234-d4');
            path3.localParts.should.deep.equal(['a', 'b', 'c1234-d4']);            
        });

        it('should throw an exception if the child name is invalid', function () {
            (() => LocalPath.root().createChildPath('$')).should.throw(Error);
            (() => LocalPath.root().createChildPath('a').createChildPath(' ')).should.throw(Error);
            (() => LocalPath.root().createChildPath('a').createChildPath('')).should.throw(Error);
            (() => LocalPath.root().createChildPath(undefined)).should.throw(Error);
            (() => LocalPath.root().createChildPath(null)).should.throw(Error);
            (() => LocalPath.root().createChildPath(123)).should.throw(Error);
            (() => LocalPath.root().createChildPath('.')).should.throw(Error);
        })
    });
});

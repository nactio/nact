const { should } = require('chai').should();
const { expect } = require('chai');
const { LocalPath, TempPath } = require('../lib/paths');

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

    describe('#isLocalPath()', function () {
        it(`should detect an object as a LocalPath if it:
            - has the localParts property of type Array
            - has a type field with value 'path'
            - does not have a remoteParts property`,
            function () {
                LocalPath.isLocalPath({ localParts: [], type: 'path' }).should.be.true;
                LocalPath.isLocalPath({ localParts: ['a', 'b'], type: 'path', frog: 2 }).should.be.true;
                LocalPath.isLocalPath({ type: 'temp', localParts: [] }).should.be.false;
                LocalPath.isLocalPath({ type: 'path' }).should.be.false;
                LocalPath.isLocalPath({ localParts: {}, type: 'path' }).should.be.false;
                LocalPath.isLocalPath({ localParts: null, type: 'path' }).should.be.false;
                LocalPath.isLocalPath({ localParts: undefined, type: 'path' }).should.be.false;
                LocalPath.isLocalPath({ localParts: 'a', type: 'path' }).should.be.false;
                LocalPath.isLocalPath({ localParts: new Map(), type: 'path' }).should.be.false;
            }
        );

        it('should always reject objects as paths if they contain a reference to remoteParts', function () {
            LocalPath.isLocalPath({ remoteParts: [], localParts: [], type: 'path' }).should.be.false;
        });
    });

    describe('#createChildPath()', function () {
        it('should append name to end of localParts array if name is valid',function(){
            let path1 = LocalPath.root().createChildPath('a');
            path1.localParts.should.deep.equal(['a']);
            LocalPath.isLocalPath(path1).should.be.true;

            let path2 = path1.createChildPath('b');
            path2.localParts.should.deep.equal(['a', 'b']);
            LocalPath.isLocalPath(path2).should.be.true;            

            let path3 = path2.createChildPath('c1234-d4');
            path3.localParts.should.deep.equal(['a', 'b', 'c1234-d4']);
            LocalPath.isLocalPath(path3).should.be.true;            
        });

        it('should throw an exception if the child name is invalid', function(){            
            (()=>LocalPath.root().createChildPath('$')).should.throw(Error);            
            (()=>LocalPath.root().createChildPath('a').createChildPath(' ')).should.throw(Error);            
            (()=>LocalPath.root().createChildPath('a').createChildPath('')).should.throw(Error);            
            (()=>LocalPath.root().createChildPath(undefined)).should.throw(Error);            
            (()=>LocalPath.root().createChildPath(null)).should.throw(Error);
            (()=>LocalPath.root().createChildPath(123)).should.throw(Error);
            (()=>LocalPath.root().createChildPath('.')).should.throw(Error);                        
        })
    });
});

describe('TempPath', function () {
    describe('#isTempPath()', function () {
        it(`should detect objects as a TempPaths if:
        - has an id field of type number
        - has a type field with value 'temp'`,
            function () {
                TempPath.isTempPath({ id: 1234, type: 'temp' }).should.be.true;
                TempPath.isTempPath({ id: '1234', type: 'temp' }).should.be.false;
                TempPath.isTempPath({ id: '1234', type: 'path' }).should.be.false;
                TempPath.isTempPath({ id: null, type: 'temp' }).should.be.false;
                TempPath.isTempPath({ id: undefined, type: 'temp' }).should.be.false;                
                TempPath.isTempPath({ id: {}, type: 'temp' }).should.be.false;                
                TempPath.isTempPath({ id: new Map(), type: 'temp' }).should.be.false;                
                TempPath.isTempPath({ type: 'temp' }).should.be.false;
                TempPath.isTempPath({ type: 'temp', id: 1234, localParts: [] }).should.be.true;
            }
        );
    });
});
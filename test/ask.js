const should = require('chai').should();

try {
    const start = require('../lib/').start;
} catch(e) {
    console.log(e.toString());
}

describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {      
        [1,2,3].indexOf(4).should.equal(-1);        
        // assert.equal(-1, [1,2,3].indexOf(4));
    });
  });
});
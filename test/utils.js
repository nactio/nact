/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { after } = require('../lib');

describe('#after', function () {
  it('should correctly calculate milliseconds', function () {
    after(100).milliseconds.duration.should.equal(100);
    after(1).millisecond.duration.should.equal(1);
    after(0).milliseconds.duration.should.equal(0);
  });
  it('should correctly calculate seconds', function () {
    after(1).second.duration.should.equal(1000);
    after(0).seconds.duration.should.equal(0);
    after(10).seconds.duration.should.equal(10000);
    after(1.5).seconds.duration.should.equal(1500);
  });

  it('should correctly calculate minutes', function () {
    after(1).minute.duration.should.equal(60000);
    after(0).minutes.duration.should.equal(0);
  });

  it('should correctly calculate hours', function () {
    after(1).hour.duration.should.equal(3600000);
    after(0).hours.duration.should.equal(0);
  });
});

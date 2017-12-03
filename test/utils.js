/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const { after, every } = require('../lib');

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

  it('should correctly calculat duration when using and operator', function () {
    after(1).hours.and(5).milliseconds.duration.should.equal(3600005);
    after(0).hours.and(3).minutes.duration.should.equal(180000);
  });

  it('should correctly set messages', function () {
    after(1).message.messageInterval.should.equal(1);
    every(10).messages.messageInterval.should.equal(10);
  });

  it('should allow the combination of duration and messages', function () {
    let value = every(1).hours.or(5).messages;
    value.duration.should.equal(3600000);
    value.messageInterval.should.equal(5);
  });
});

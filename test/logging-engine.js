/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const {
  LogLevel,
  logLevelToString,
  LogEvent,
  AbstractLoggingEngine,
  NoopLoggingEngine,
  ConsoleLoggingEngine
} = require('../lib/monitoring');

describe('LogLevel', function () {
  it('log levels should be sorted', function () {
    LogLevel.OFF.should.be.lessThan(LogLevel.TRACE);
    LogLevel.TRACE.should.be.lessThan(LogLevel.DEBUG);
    LogLevel.DEBUG.should.be.lessThan(LogLevel.INFO);
    LogLevel.INFO.should.be.lessThan(LogLevel.WARNING);
    LogLevel.WARNING.should.be.lessThan(LogLevel.ERROR);
    LogLevel.ERROR.should.be.lessThan(LogLevel.CRITICAL);
  });
});

describe('logLevelToString', function () {
  it('should print log levels as string', function () {
    chai.expect(logLevelToString(LogLevel.OFF)).to.equal('OFF');
    chai.expect(logLevelToString(LogLevel.TRACE)).to.equal('TRACE');
    chai.expect(logLevelToString(LogLevel.DEBUG)).to.equal('DEBUG');
    chai.expect(logLevelToString(LogLevel.INFO)).to.equal('INFO');
    chai.expect(logLevelToString(LogLevel.WARNING)).to.equal('WARNING');
    chai.expect(logLevelToString(LogLevel.ERROR)).to.equal('ERROR');
    chai.expect(logLevelToString(LogLevel.CRITICAL)).to.equal('CRITICAL');
    chai.expect(logLevelToString(100.0)).to.equal('???');
  });
});

describe('LogEvent', function () {
  it('should capture all constructor arguments', function () {
    const level = LogLevel.WARNING;
    const category = 'Event-Category';
    const message = 'Event-Message';
    const properties = { authenticated: true };
    const metrics = { duration: 23 };
    const event = new LogEvent(level, category, message, properties, metrics);
    event.level.should.be.equal(level);
    event.category.should.be.equal(category);
    event.message.should.be.equal(message);
    event.properties.should.be.equal(properties);
    event.metrics.should.be.equal(metrics);
  });
});

describe('AbstractLoggingEngine', function () {
  it('should throw when functions are invoked', function () {
    const engine = new AbstractLoggingEngine();
    (() => engine.log(new LogEvent(100, 'category', 'message'))).should.throw(Error);
    (() => engine.off('message')).should.throw(Error);
    (() => engine.trace('message')).should.throw(Error);
    (() => engine.debug('message')).should.throw(Error);
    (() => engine.info('message')).should.throw(Error);
    (() => engine.warning('message')).should.throw(Error);
    (() => engine.error('message')).should.throw(Error);
    (() => engine.critical('message')).should.throw(Error);
    (() => engine.event('request-end')).should.throw(Error);
    (() => engine.metrics('queue-length')).should.throw(Error);
  });
});

describe('NoopLoggingEngine', function () {
  describe('When a no-op logging engine is created', function () {
    const engine = new NoopLoggingEngine();

    it('it should be able to receive log events', function () {
      engine.trace('A trace');
    });
  });
});

describe('ConsoleLoggingEngine', function () {
  describe('When a console logging engine is created', function () {
    const channel = (...args) => {};
    const consoleMock = {
      trace: channel,
      debug: channel,
      info: channel,
      warn: channel,
      error: channel
    };
    const engine = new ConsoleLoggingEngine(consoleMock);

    it('off should not call any console channel', function () {
      engine.off('A message that wont show');
    });

    it('should call console trace channel', function () {
      engine.trace('A trace');
    });

    it('should call console debug channel', function () {
      engine.debug('A debug');
    });

    it('should call console info channel', function () {
      engine.info('A info');
    });

    it('should call console warning channel', function () {
      engine.warning('A warning');
    });

    it('should call console error channel', function () {
      engine.error('A error');
    });

    it('should call console critical channel', function () {
      engine.critical('A critical');
    });

    it('unknown level should not call any console channel', function () {
      engine.log(new LogEvent(100, '', ''));
    });
  });
});

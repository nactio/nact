/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.should();
chai.use(sinonChai);

const {
  LogLevel,
  LogEvent,
  logToConsole
} = require('../lib/monitoring');

const {
  logLevelToString,
  AbstractLoggingEngine,
  NoopLoggingEngine,
  logNothing
} = require('../lib/monitoring/logging-engine');

describe('LogLevel', () => {
  it('log levels should be sorted', () => {
    LogLevel.OFF.should.be.lessThan(LogLevel.TRACE);
    LogLevel.TRACE.should.be.lessThan(LogLevel.DEBUG);
    LogLevel.DEBUG.should.be.lessThan(LogLevel.INFO);
    LogLevel.INFO.should.be.lessThan(LogLevel.WARNING);
    LogLevel.WARNING.should.be.lessThan(LogLevel.ERROR);
    LogLevel.ERROR.should.be.lessThan(LogLevel.CRITICAL);
  });
});

describe('logLevelToString', () => {
  it('should print log levels as string', () => {
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

describe('LogEvent', () => {
  it('should capture all constructor arguments', () => {
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

describe('AbstractLoggingEngine', () => {
  it('should throw when functions are invoked', () => {
    const engine = new AbstractLoggingEngine();
    (() => engine.log(new LogEvent(100, 'category', 'message'))).should.throw(
      Error
    );
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

describe('NoopLoggingEngine', () => {
  describe('When a no-op logging engine is created', () => {
    const engine = new NoopLoggingEngine();

    it('it should be able to receive log events', () => {
      engine.trace('A trace');
    });
  });
});

describe('logNothing', () => {
  it('it should be instance of NoopLoggingEngine', () => {
    logNothing.should.be.instanceOf(NoopLoggingEngine);
  });

  it('it should be able to receive log events', () => {
    logNothing.trace('A trace');
  });
});

describe('logToConsole', () => {
  describe('When a console logging engine is created', () => {
    let consoleMock = null;
    let engine = null;

    beforeEach(() => {
      consoleMock = {
        trace: sinon.spy(),
        debug: sinon.spy(),
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy()
      };
      engine = logToConsole(consoleMock);
    });

    const testCalled = (positives, negatives) => {
      positives.forEach(spy => spy.should.have.been.called);
      negatives.forEach(spy => spy.should.have.not.been.called);
    };

    it('it should return a logging engine', () => {
      engine.should.be.instanceOf(AbstractLoggingEngine);
    });

    it('off should not call any console channel', () => {
      engine.off('A message that wont show');
      testCalled(
        [],
        [
          consoleMock.trace,
          consoleMock.debug,
          consoleMock.info,
          consoleMock.warn,
          consoleMock.error
        ]
      );
    });

    it('should call console trace channel', () => {
      engine.trace('A trace');
      testCalled(
        [consoleMock.trace],
        [
          consoleMock.debug,
          consoleMock.info,
          consoleMock.warn,
          consoleMock.error
        ]
      );
    });

    it('should call console debug channel', () => {
      engine.debug('A debug');
      testCalled(
        [consoleMock.debug],
        [
          consoleMock.trace,
          consoleMock.info,
          consoleMock.warn,
          consoleMock.error
        ]
      );
    });

    it('should call console info channel', () => {
      engine.info('A info');
      testCalled(
        [consoleMock.info],
        [
          consoleMock.trace,
          consoleMock.debug,
          consoleMock.warn,
          consoleMock.error
        ]
      );
    });

    it('should call console warning channel', () => {
      engine.warning('A warning');
      testCalled(
        [consoleMock.warn],
        [
          consoleMock.trace,
          consoleMock.debug,
          consoleMock.info,
          consoleMock.error
        ]
      );
    });

    it('should call console error channel', () => {
      engine.error('A error');
      testCalled(
        [consoleMock.error],
        [
          consoleMock.trace,
          consoleMock.debug,
          consoleMock.info,
          consoleMock.warn
        ]
      );
    });

    it('should call console critical channel', () => {
      engine.critical('A critical');
      testCalled(
        [consoleMock.error],
        [
          consoleMock.trace,
          consoleMock.debug,
          consoleMock.info,
          consoleMock.warn
        ]
      );
    });

    it('unknown level should not call any console channel', () => {
      engine.log(new LogEvent(100, '', ''));
      testCalled(
        [consoleMock.error],
        [
          consoleMock.trace,
          consoleMock.debug,
          consoleMock.info,
          consoleMock.warn
        ]
      );
    });
  });

  describe('When no console proxy is given', () => {
    const infoStub = sinon.stub(console, 'info');
    const engine = logToConsole();

    after(() => {
      infoStub.restore();
    });

    it('the global console should be used', () => {
      engine.info('hello');
      infoStub.should.have.been.calledWith('[INFO] trace: hello');
    });
  });
});

/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.should();
chai.use(sinonChai);

const { LogLevel, LogEvent, logNothing } = require('../lib/monitoring');
const {
  logLevelToString,
  LoggingFacade,
  LoggingFacadeImpl
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
    chai.expect(logLevelToString(100.0)).to.been.undefined;
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

describe('LoggingFacade', () => {
  it('should not be able to be instantiated', () => {
    (() => new LoggingFacade()).should.throw(Error);
  });
});

describe('LoggingFacadeImpl', () => {
  it('should be able to be instantiated', () => {
    (new LoggingFacadeImpl(() => {})).should.been.instanceOf(LoggingFacadeImpl);
  });

  describe('When a LoggingFacadeImpl is created with a given logger', () => {
    let logger;
    let facade;
    const message = 'Some message';
    const properties = { answer: 42 };
    const metrics = { duration_ms: 1234 };

    beforeEach(() => {
      logger = sinon.spy();
      facade = new LoggingFacadeImpl(logger);
    });

    it('it should call given logger when log method is used', () => {
      const logEvent = new LogEvent(LogLevel.Info, 'trace', 'Something');
      facade.log(logEvent);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when off method is used', () => {
      const logEvent = new LogEvent(LogLevel.OFF, 'trace', message, properties, metrics);
      facade.off(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when trace method is used', () => {
      const logEvent = new LogEvent(LogLevel.TRACE, 'trace', message, properties, metrics);
      facade.trace(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when debug method is used', () => {
      const logEvent = new LogEvent(LogLevel.DEBUG, 'trace', message, properties, metrics);
      facade.debug(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when info method is used', () => {
      const logEvent = new LogEvent(LogLevel.INFO, 'trace', message, properties, metrics);
      facade.info(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when warning method is used', () => {
      const logEvent = new LogEvent(LogLevel.WARNING, 'trace', message, properties, metrics);
      facade.warning(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when error method is used', () => {
      const logEvent = new LogEvent(LogLevel.ERROR, 'trace', message, properties, metrics);
      facade.error(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when critical method is used', () => {
      const logEvent = new LogEvent(LogLevel.CRITICAL, 'trace', message, properties, metrics);
      facade.critical(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when event method is used', () => {
      const logEvent = new LogEvent(LogLevel.INFO, 'event', message, properties, metrics);
      facade.event(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });

    it('it should call given logger when metrics method is used', () => {
      const logEvent = new LogEvent(LogLevel.INFO, 'metrics', message, properties, metrics);
      facade.metrics(message, properties, metrics);
      logger.should.have.been.calledWith(logEvent);
    });
  });
});

describe('logNothing', () => {
  it('it should be a function', () =>
    logNothing.should.be.instanceOf(Function));

  it('it should return undefined', () => {
    chai.expect(logNothing({})).to.be.undefined;
  });
});

// describe('logToConsole', () => {
//   describe('When a console logging engine is created', () => {
//     let consoleMock = null;
//     let engine = null;

//     beforeEach(() => {
//       consoleMock = {
//         trace: sinon.spy(),
//         debug: sinon.spy(),
//         info: sinon.spy(),
//         warn: sinon.spy(),
//         error: sinon.spy()
//       };
//       engine = logToConsole(consoleMock);
//     });

//     const testCalled = (positives, negatives) => {
//       positives.forEach(spy => spy.should.have.been.called);
//       negatives.forEach(spy => spy.should.have.not.been.called);
//     };

//     it('it should return a logging engine', () => {
//       engine.should.be.instanceOf(AbstractLoggingEngine);
//     });

//     it('off should not call any console channel', () => {
//       engine.off('A message that wont show');
//       testCalled(
//         [],
//         [
//           consoleMock.trace,
//           consoleMock.debug,
//           consoleMock.info,
//           consoleMock.warn,
//           consoleMock.error
//         ]
//       );
//     });

//     it('should call console trace channel', () => {
//       engine.trace('A trace');
//       testCalled(
//         [consoleMock.trace],
//         [
//           consoleMock.debug,
//           consoleMock.info,
//           consoleMock.warn,
//           consoleMock.error
//         ]
//       );
//     });

//     it('should call console debug channel', () => {
//       engine.debug('A debug');
//       testCalled(
//         [consoleMock.debug],
//         [
//           consoleMock.trace,
//           consoleMock.info,
//           consoleMock.warn,
//           consoleMock.error
//         ]
//       );
//     });

//     it('should call console info channel', () => {
//       engine.info('A info');
//       testCalled(
//         [consoleMock.info],
//         [
//           consoleMock.trace,
//           consoleMock.debug,
//           consoleMock.warn,
//           consoleMock.error
//         ]
//       );
//     });

//     it('should call console warning channel', () => {
//       engine.warning('A warning');
//       testCalled(
//         [consoleMock.warn],
//         [
//           consoleMock.trace,
//           consoleMock.debug,
//           consoleMock.info,
//           consoleMock.error
//         ]
//       );
//     });

//     it('should call console error channel', () => {
//       engine.error('A error');
//       testCalled(
//         [consoleMock.error],
//         [
//           consoleMock.trace,
//           consoleMock.debug,
//           consoleMock.info,
//           consoleMock.warn
//         ]
//       );
//     });

//     it('should call console critical channel', () => {
//       engine.critical('A critical');
//       testCalled(
//         [consoleMock.error],
//         [
//           consoleMock.trace,
//           consoleMock.debug,
//           consoleMock.info,
//           consoleMock.warn
//         ]
//       );
//     });

//     it('unknown level should not call any console channel', () => {
//       engine.log(new LogEvent(100, '', ''));
//       testCalled(
//         [consoleMock.error],
//         [
//           consoleMock.trace,
//           consoleMock.debug,
//           consoleMock.info,
//           consoleMock.warn
//         ]
//       );
//     });
//   });

//   describe('When no console proxy is given', () => {
//     const infoStub = sinon.stub(console, 'info');
//     const engine = logToConsole();

//     after(() => {
//       infoStub.restore();
//     });

//     it('the global console should be used', () => {
//       engine.info('hello');
//       infoStub.should.have.been.calledWith('[INFO] trace: hello');
//     });
//   });
// });

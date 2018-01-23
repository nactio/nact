/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
require('sinon');
const sinonChai = require('sinon-chai');
chai.should();
chai.use(sinonChai);
const expect = chai.expect;

const { start, dispatch, stop, spawnStateless, spawn, query } = require('../lib');
const { Nobody } = require('../lib/references');
const {
  LogLevel,
  LogEvent,
  LogMetric,
  LogException,
  LogTrace,
  logNothing,
  configureLogging
} = require('../lib/monitoring');
const {
  logLevelToString,
  LoggingFacade
} = require('../lib/monitoring/monitoring');

describe('LogLevel', () => {
  it('log levels should be sorted', () => {
    LogLevel.OFF.should.be.lessThan(LogLevel.TRACE);
    LogLevel.TRACE.should.be.lessThan(LogLevel.DEBUG);
    LogLevel.DEBUG.should.be.lessThan(LogLevel.INFO);
    LogLevel.INFO.should.be.lessThan(LogLevel.WARN);
    LogLevel.WARN.should.be.lessThan(LogLevel.ERROR);
    LogLevel.ERROR.should.be.lessThan(LogLevel.CRITICAL);
  });
});

describe('logLevelToString', () => {
  it('should print log levels as string', () => {
    expect(logLevelToString(LogLevel.OFF)).to.equal('OFF');
    expect(logLevelToString(LogLevel.TRACE)).to.equal('TRACE');
    expect(logLevelToString(LogLevel.DEBUG)).to.equal('DEBUG');
    expect(logLevelToString(LogLevel.INFO)).to.equal('INFO');
    expect(logLevelToString(LogLevel.WARN)).to.equal('WARN');
    expect(logLevelToString(LogLevel.ERROR)).to.equal('ERROR');
    expect(logLevelToString(LogLevel.CRITICAL)).to.equal('CRITICAL');
    expect(logLevelToString(100.0)).to.been.undefined;
  });
});

describe('LogTrace', () => {
  it('should capture all constructor arguments', () => {
    const level = LogLevel.WARN;
    const message = 'Event-Message';
    const actor = new Nobody();
    const createdAt = new Date();
    const event = new LogTrace(level, message, actor, createdAt);
    event.level.should.be.equal(level);
    event.type.should.be.equal('trace');
    event.message.should.be.equal(message);
    event.createdAt.should.be.equal(createdAt);
    event.actor.should.be.equal(actor);
  });
});

describe('LoggingFacade', () => {
  it('should be able to be instantiated', () => {
    (new LoggingFacade(() => { }, new Nobody())).should.been.instanceOf(LoggingFacade);
  });

  describe('When a LoggingFacade is created with a given logger', function () {
    let facade;
    const message = 'Some message';
    let loggingActor;
    let system;
    const properties = { answer: 42 };
    const metrics = { duration_ms: 1234 };
    const name = 'test';
    beforeEach(function () {
      system = start();
      loggingActor = spawn(system, (state = [], msg, ctx) => {
        if (msg === 'getLogs') {
          dispatch(ctx.sender, state);
          return state;
        } else {
          return [msg, ...state];
        }
      });
      facade = new LoggingFacade(loggingActor, new Nobody());
    });
    afterEach(() => {
      stop(system);
    });

    it('it should call given logger when trace method is used', async () => {
      const logEvent = new LogTrace(LogLevel.TRACE, message, new Nobody());
      facade.trace(message);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when debug method is used', async () => {
      const logEvent = new LogTrace(LogLevel.DEBUG, message, new Nobody());
      facade.debug(message);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when info method is used', async () => {
      const logEvent = new LogTrace(LogLevel.INFO, message, new Nobody());
      facade.info(message);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when warn method is used', async () => {
      const logEvent = new LogTrace(LogLevel.WARN, message, new Nobody());
      facade.warn(message);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when error method is used', async () => {
      const logEvent = new LogTrace(LogLevel.ERROR, message, new Nobody());
      facade.error(message);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when critical method is used', async () => {
      const logEvent = new LogTrace(LogLevel.CRITICAL, message, new Nobody());
      facade.critical(message);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when event method is used', async () => {
      const logEvent = new LogEvent(name, properties, new Nobody());
      facade.event(name, properties);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when metrics method is used', async () => {
      const logEvent = new LogMetric(name, metrics, new Nobody());
      facade.metric(name, metrics);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });

    it('it should call given logger when exception method', async () => {
      const error = new Error('error');
      const logEvent = new LogException(error, new Nobody());
      facade.exception(error);
      const logs = await query(loggingActor, 'getLogs', 100);
      logs.should.deep.equal([logEvent]);
    });
  });
});

describe('logNothing', () => {
  it('it should be a function', () =>
    logNothing.should.be.instanceOf(Function));

  it('it should return Nobody', () => {
    chai.expect(logNothing()).to.be.instanceof(Nobody);
  });

  it('When a system is configured with logNothing it should work properly', done => {
    const system = start(configureLogging(logNothing));
    const actor = spawnStateless(system, (msg, ctx) => {
      ctx.log.trace('A trace');
      done();
    });
    dispatch(actor, 'hello');
    setTimeout(() => {
      stop(system);
    }, 25);
  });
});

describe('#configureLogging', function () {
  it('should throw an error if nothing is returned by the configuration function', () => {
    expect(() => start(configureLogging(system => { }))).to.throw(Error);
  });
});

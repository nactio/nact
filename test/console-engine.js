/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.should();
chai.use(sinonChai);

const { start, dispatch, stop, spawnStateless } = require('../lib');
const {
  LogLevel,
  LogEvent,
  logToConsole,
  configureLogging
} = require('../lib/monitoring');

describe('logToConsole', () => {
  it('it should be a function', () =>
    logToConsole.should.be.instanceOf(Function));

  describe('When logToConsole is used with a console-proxy', () => {
    let system;
    let consoleProxy = null;

    const initTest = () => {
      const consoleProxy = {
        trace: sinon.spy(function trace(){}),
        debug: sinon.spy(function debug(){}),
        info: sinon.spy(function info(){}),
        warn: sinon.spy(function warn(){}),
        error: sinon.spy(function error(){})
      };
      const system = start(configureLogging(logToConsole(consoleProxy)));
      return [ consoleProxy, system ];
    };

    const testCalled = (positives, negatives) => {
      positives.forEach(spy => spy.should.have.been.called);
      negatives.forEach(spy => spy.should.have.not.been.called);
    };

    it('off should not call any console channel', () => {
      [ consoleProxy, system ] = initTest();
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.trace('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [],
          [
            consoleProxy.trace,
            consoleProxy.debug,
            consoleProxy.info,
            consoleProxy.warn,
            consoleProxy.error
          ]
        );
        done();
      }, 25);
    });

    it('should call console trace channel', done => {
      const [ consoleProxy, system ] = initTest();
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.trace('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [ consoleProxy.trace ],
          [
            consoleProxy.debug,
            consoleProxy.info,
            consoleProxy.warn,
            consoleProxy.error
          ]
        );
        done();
        stop(system);
      }, 25);
    });

    it('should call console debug channel', () => {
      const [ consoleProxy, system ] = initTest();
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.debug('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [consoleProxy.debug],
          [
            consoleProxy.trace,
            consoleProxy.info,
            consoleProxy.warn,
            consoleProxy.error
          ]
        );
        done();
        stop(system);
      }, 25);
    });

    it('should call console info channel', () => {
      const [ consoleProxy, system ] = initTest();
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.info('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [consoleProxy.info],
          [
            consoleProxy.trace,
            consoleProxy.debug,
            consoleProxy.warn,
            consoleProxy.error
          ]
        );
        done();
        stop(system);
      }, 25);
    });

    it('should call console warn channel', () => {
      const [ consoleProxy, system ] = initTest();
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.warn('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [consoleProxy.warn],
          [
            consoleProxy.trace,
            consoleProxy.debug,
            consoleProxy.info,
            consoleProxy.error
          ]
        );
        done();
        stop(system);
      }, 25);
    });

    it('should call console error channel', () => {
      const [ consoleProxy, system ] = initTest();
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.error('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [consoleProxy.error],
          [
            consoleProxy.trace,
            consoleProxy.debug,
            consoleProxy.info,
            consoleProxy.warn
          ]
        );
        done();
        stop(system);
      }, 25);
    });

    // it('should call console critical channel', () => {
    //   const actor = spawnStateless(system, (msg, ctx) => {
    //     ctx.log.trace('A trace');
    //   });
    //   dispatch(actor, 'hello');
    //   setTimeout(() => {
    //     testCalled(
    //       [consoleProxy.error],
    //       [
    //         consoleProxy.trace,
    //         consoleProxy.debug,
    //         consoleProxy.info,
    //         consoleProxy.warn
    //       ]
    //     );
    //     done();
    //   }, 25);
    // });

    // it('unknown level should not call any console channel', () => {
    //   const actor = spawnStateless(system, (msg, ctx) => {
    //     ctx.log.trace('A trace');
    //   });
    //   dispatch(actor, 'hello');
    //   setTimeout(() => {
    //     testCalled(
    //       [consoleProxy.error],
    //       [
    //         consoleProxy.trace,
    //         consoleProxy.debug,
    //         consoleProxy.info,
    //         consoleProxy.warn
    //       ]
    //     );
    //     done();
    //   }, 25);
    // });
  });

  // describe('When no console proxy is given', () => {
  //   const infoStub = sinon.stub(console, 'info');
  //   const engine = logToConsole();

  //   after(() => {
  //     infoStub.restore();
  //   });

  //   it('the global console should be used', () => {
  //     engine.info('hello');
  //     infoStub.should.have.been.calledWith('[INFO] trace: hello');
  //   });
  // });
});

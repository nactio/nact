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

    beforeEach(() => {
      consoleProxy = {
        trace: sinon.spy(),
        debug: sinon.spy(),
        info: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy()
      };
      system = start(configureLogging(logToConsole(consoleProxy)));
    });

    afterEach(function () {
      system && stop(system);
    });

    const testCalled = (positives, negatives) => {
      positives.forEach(spy => spy.should.have.been.called);
      negatives.forEach(spy => spy.should.have.not.been.called);
    };

    it('off should not call any console channel', () => {
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
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.trace('A trace');
      });
      dispatch(actor, 'hello');
      setTimeout(() => {
        testCalled(
          [consoleProxy.trace],
          [
            consoleProxy.debug,
            consoleProxy.info,
            consoleProxy.warn,
            consoleProxy.error
          ]
        );
        done();
      }, 25);
    });

    it('should call console debug channel', () => {
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
      }, 25);
    });

    it('should call console info channel', () => {
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
      }, 25);
    });

    it('should call console warning channel', () => {
      const actor = spawnStateless(system, (msg, ctx) => {
        ctx.log.warning('A trace');
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
      }, 25);
    });

    it('should call console error channel', () => {
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

  // describe('When logToConsole is used with a console-proxy with only log', () => {
  //   let system;
  //   let consoleProxy = null;

  //   beforeEach(() => {
  //     consoleProxy = {
  //       log: sinon.spy(),
  //     };
  //     system = start(configureLogging(logToConsole(consoleProxy)));
  //   });

  //   afterEach(function () {
  //     system && stop(system);
  //     system = undefined;
  //     consoleProxy = undefined;
  //   });

  //   const testCalled = (positives, negatives) => {
  //     positives.forEach(spy => spy.should.have.been.called);
  //     negatives.forEach(spy => spy.should.have.not.been.called);
  //   };

  //   it('off should not call any console channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled([], [ consoleProxy.log ]);
  //       done();
  //     }, 25);
  //   });

  //   it('should call console trace channel', done => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.trace],
  //         [
  //           consoleProxy.debug,
  //           consoleProxy.info,
  //           consoleProxy.warn,
  //           consoleProxy.error
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });

  //   it('should call console debug channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.debug],
  //         [
  //           consoleProxy.trace,
  //           consoleProxy.info,
  //           consoleProxy.warn,
  //           consoleProxy.error
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });

  //   it('should call console info channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.info],
  //         [
  //           consoleProxy.trace,
  //           consoleProxy.debug,
  //           consoleProxy.warn,
  //           consoleProxy.error
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });

  //   it('should call console warning channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.warn],
  //         [
  //           consoleProxy.trace,
  //           consoleProxy.debug,
  //           consoleProxy.info,
  //           consoleProxy.error
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });

  //   it('should call console error channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.error],
  //         [
  //           consoleProxy.trace,
  //           consoleProxy.debug,
  //           consoleProxy.info,
  //           consoleProxy.warn
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });

  //   it('should call console critical channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.error],
  //         [
  //           consoleProxy.trace,
  //           consoleProxy.debug,
  //           consoleProxy.info,
  //           consoleProxy.warn
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });

  //   it('unknown level should not call any console channel', () => {
  //     const actor = spawnStateless(system, (msg, ctx) => {
  //       ctx.log.trace('A trace');
  //     });
  //     dispatch(actor, 'hello');
  //     setTimeout(() => {
  //       testCalled(
  //         [consoleProxy.error],
  //         [
  //           consoleProxy.trace,
  //           consoleProxy.debug,
  //           consoleProxy.info,
  //           consoleProxy.warn
  //         ]
  //       );
  //       done();
  //     }, 25);
  //   });
  // });

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

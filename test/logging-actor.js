/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const { start, dispatch, stop } = require('../lib');
const { spawnStateless } = require('../lib/actor');
const {
  configureLogging,
  logNothing,
  logToConsole
} = require('../lib/monitoring');

const mockConsole = () => ({
  trace: sinon.spy(),
  debug: sinon.spy(),
  info: sinon.spy(),
  warn: sinon.spy(),
  error: sinon.spy()
});

describe('configureLogging', () => {
  let system;

  afterEach(function () {
    system && stop(system);
  });

  it('should require that the logging engine be defined', () => {
    (() => configureLogging(undefined)({})).should.throw(Error);
    (() => configureLogging(null)({})).should.throw(Error);
    (() => configureLogging(0)({})).should.throw(Error);
    (() => configureLogging()({})).should.throw(Error);
    (() => configureLogging(logNothing)({})).should.not.throw(Error);
    (() => configureLogging(logToConsole({}))({})).should.not.throw(Error);
  });

  it('should require that the system has no configured logging engine already', () => {
    (() => configureLogging(logNothing)(
      configureLogging(logNothing)({})
    )).should.throw(Error);
  });

  it('should not assign a logging engine when noop logging engine is used', () => {
    system = start(configureLogging(logNothing));
    chai.expect(system.loggingEngine).to.be.undefined;
  });

  it("should give the actor's handler context the log extension", done => {
    const consoleMock = mockConsole();
    consoleMock.info = sinon.stub().callsFake((...args) => {
      chai.expect(args[0]).to.equal('[INFO] trace: /dummy: hello');
      done();
    });
    system = start(configureLogging(logToConsole(consoleMock)));
    const dummy = spawnStateless(
      system,
      (msg, ctx) => ctx.log.info(msg),
      'dummy'
    );
    dispatch(dummy, 'hello');
  });
});

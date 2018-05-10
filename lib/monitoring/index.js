const {
  LogLevel,
  LogEvent,
  LogException,
  LogMetric,
  LogTrace,
  LoggingFacade,
  logNothing
} = require('./monitoring');
const { logToConsole } = require('./console-engine');

const configureLogging = (engine) => (system) => {
  const loggingActor = engine(system.reference);
  if (loggingActor) {
    system.createLogger = (reference) => new LoggingFacade(loggingActor, reference);
  } else {
    throw new Error('Logging engine is not defined');
  }
};

module.exports = {
  LogLevel,
  LogTrace,
  LogMetric,
  LogException,
  LogEvent,
  logNothing,
  LoggingFacade,
  logToConsole,
  configureLogging
};

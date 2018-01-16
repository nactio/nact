const {
  LogLevel,
  LogEvent,
  logNothing
} = require('./logging-engine');
const { logToConsole } = require('./console-engine');

const configureLogging = (engine) => (system) => {
  const loggingEngine = engine(system.reference);

  if (loggingEngine) {
    return Object.assign(system, { loggingEngine });
  } else {
    return system;
  }
};

module.exports = {
  LogLevel,
  LogEvent,
  logNothing,
  logToConsole,
  configureLogging
};

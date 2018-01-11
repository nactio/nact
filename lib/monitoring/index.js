const {
  LogLevel,
  LogEvent,
  logNothing,
  AbstractLoggingEngine,
  logToConsole
} = require('./logging-engine');

const configureLogging = (engine) => (system) => {
  if (system.loggingEngine) {
    throw new Error('Do not configure logging more than once. The behavior could be undefined otherwise.');
  }

  if (!(engine instanceof AbstractLoggingEngine)) {
    throw new Error('Must use a valid logging engine. Try with logToConsole() from module "nact/monitoring".');
  }

  return Object.assign(system, { loggingEngine: engine });
};

module.exports = {
  LogLevel,
  LogEvent,
  logNothing,
  logToConsole,
  configureLogging
};

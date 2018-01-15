const {
  LogLevel,
  LogEvent,
  logNothing,
  LoggingFacadeImpl
} = require('./logging-engine');
const { logToConsole } = require('./console-engine');

// const { spawnLoggingActor, ActorLoggingEngine } = require('./logging-actor');

const configureLogging = (engine) => (system) => {
  // TODO: Remove TRY CATCH statement. Currently used for debugging
  try {

    if (system.loggingEngine) {
      throw new Error('Do not configure logging more than once. The behavior could be undefined otherwise.');
    }

    if (!engine) {
      throw new Error('Must use a valid logging engine. E.g. try with logToConsole() from module "nact/monitoring".');
    }

    const loggingEngine = engine(system.reference);

    if (loggingEngine) {
      return Object.assign(system, { loggingEngine });
    } else {
      return system;
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  LogLevel,
  LogEvent,
  logNothing,
  logToConsole,
  configureLogging
};

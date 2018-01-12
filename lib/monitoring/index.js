const {
  LogLevel,
  LogEvent,
  logNothing,
  AbstractLoggingEngine,
  logToConsole
} = require('./logging-engine');

const { spawnLoggingActor, ActorLoggingEngine } = require('./logging-actor');

const configureLogging = (engine) => (system) => {
  try {

    if (system.loggingEngine) {
      throw new Error('Do not configure logging more than once. The behavior could be undefined otherwise.');
    }

    if (!engine) {
      throw new Error('Must use a valid logging engine. Try with logToConsole() from module "nact/monitoring".');
    }

    const loggingActor = spawnLoggingActor(system.reference, engine);
    const loggingEngine = new ActorLoggingEngine(loggingActor);

    return Object.assign(system, { loggingEngine });
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

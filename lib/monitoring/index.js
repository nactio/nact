const {
  LogLevel,
  LogEvent,
  noopLoggingEngine,
  NoopLoggingEngine,
  ConsoleLoggingEngine
} = require('./logging-engine');

const {
  spawnLoggingActor,
  ActorLoginEngine
} = require('./logging-actor');

const configureLogging = (engine) => (system) => {
  if (!engine) {
    engine = noopLoggingEngine();
  }

  if (system.loggingEngine) {
    throw new Error('Do not configure logging more than once. The behavior could be undefined otherwise.');
  }

  if (engine instanceof NoopLoggingEngine) {
    return system;
  }

  const loggingActor = spawnLoggingActor(system, engine);
  const loggingEngine = new ActorLoginEngine(loggingActor);
  return Object.assign(system, { loggingEngine });
};

module.exports = {
  LogLevel,
  LogEvent,
  ConsoleLoggingEngine,
  spawnLoggingActor,
  configureLogging
};

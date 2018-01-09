const {
  LogLevel,
  logLevelToString,
  LogEvent,
  AbstractLoggingEngine,
  NoopLoggingEngine,
  ConsoleLoggingEngine
} = require('./logging-engine');
const {
  spawnLoggingActor,
  ActorLoginEngine
} = require('./logging-actor');

const configureLogging = (engine) => (system) => {
  if (!engine) {
    engine = new NoopLoggingEngine();
  }
  const loggingActor = spawnLoggingActor(system, engine);
  const loggingEngine = new ActorLoginEngine(loggingActor);
  return Object.assign(system, { loggingEngine });
};

module.exports = {
  LogLevel,
  logLevelToString,
  LogEvent,
  AbstractLoggingEngine,
  NoopLoggingEngine,
  ConsoleLoggingEngine,
  configureLogging
};

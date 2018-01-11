const {
  LogEvent,
  AbstractLoggingEngine,
  logNothing
} = require('./logging-engine');

class MessageContextLoggingEngine extends AbstractLoggingEngine {
  constructor (engine, actorPath) {
    super();
    this.engine = engine;
    this.actorPath = actorPath;
  }

  log (logEvent) {
    logEvent = new LogEvent(
      logEvent.level,
      logEvent.category,
      this.actorPath.toString().concat(': ', logEvent.message),
      logEvent.properties,
      logEvent.metrics
    );
    this.engine.log(logEvent);
  }
}

const prepareContextForLogging = (actor, ctx) => {
  const engine = actor.system.loggingEngine;

  if (!engine || engine === logNothing) {
    return { ...ctx, log: logNothing };
  }

  const subEngine = new MessageContextLoggingEngine(engine, actor.path);
  return { ...ctx, log: subEngine };
};

module.exports = {
  // spawnLoggingActor,
  // ActorLoggingEngine,
  prepareContextForLogging
};

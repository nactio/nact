const { dispatch } = require('../functions');
const { spawnStateless } = require('../actor');
const {
  LogEvent,
  AbstractLoggingEngine,
  noopLoggingEngine
} = require('./logging-engine');

const spawnLoggingActor = (system, engine) => {
  if (!(engine instanceof AbstractLoggingEngine)) {
    throw new Error('Expected a LoginEngine.');
  }

  return spawnStateless(
    system,
    (msg, ctx) => {
      if (msg instanceof LogEvent) {
        engine.log(msg);
      }
      // else ??? Is there a Unhandled/DeadLetters channel?
    },
    'logger'
  );
};

class ActorLoggingEngine extends AbstractLoggingEngine {
  constructor (loggingActorRef) {
    super();
    this.loggingActorRef = loggingActorRef;
  }

  log (logEvent) {
    dispatch(this.loggingActorRef, logEvent);
  }
}

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

  if (!engine || engine === noopLoggingEngine) {
    return { ...ctx, log: noopLoggingEngine };
  }

  const subEngine = new MessageContextLoggingEngine(engine, actor.path);
  return { ...ctx, log: subEngine };
};

module.exports = {
  spawnLoggingActor,
  ActorLoggingEngine,
  prepareContextForLogging
};

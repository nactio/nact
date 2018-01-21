const { Nobody } = require('../references');
const LogLevel = {
  OFF: 0,
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  WARN: 4,
  ERROR: 5,
  CRITICAL: 6
};

const logLevelAsText = [
  'OFF',
  'TRACE',
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
  'CRITICAL'
];

function logLevelToString (level) {
  return logLevelAsText[level];
}

class LogEvent {
  constructor (level, category, message, properties, metrics, actor, createdAt) {
    this.level = level;
    this.category = category;
    this.message = message;
    this.properties = properties;
    this.metrics = metrics;
    this.actor = actor;
    this.createdAt = createdAt || new Date();
  }
}

class LoggingFacade {
  constructor (loggingActor, reference) {
    this.loggingActor = loggingActor;
    this.reference = reference;
    Object.freeze(this);
  }

  log (logEvent) {
    const { dispatch } = require('../functions');
    dispatch(this.loggingActor, logEvent, this.reference);
  }

  off (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.OFF, 'trace', message, properties, metrics, this.reference));
  }

  trace (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.TRACE, 'trace', message, properties, metrics, this.reference)
    );
  }

  debug (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.DEBUG, 'trace', message, properties, metrics, this.reference)
    );
  }

  info (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.INFO, 'trace', message, properties, metrics, this.reference)
    );
  }

  warn (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.WARN, 'trace', message, properties, metrics, this.reference)
    );
  }

  error (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.ERROR, 'trace', message, properties, metrics, this.reference)
    );
  }

  critical (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.CRITICAL, 'trace', message, properties, metrics, this.reference)
    );
  }

  event (name, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'event', name, properties, metrics, this.reference));
  }

  metrics (name, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'metrics', name, properties, metrics, this.reference));
  }
}

const logNothing = () => new Nobody();

module.exports = {
  LogLevel,
  logLevelToString,
  LogEvent,
  LoggingFacade,
  logNothing
};

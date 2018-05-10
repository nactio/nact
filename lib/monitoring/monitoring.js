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

const logLevelToString = (level) => logLevelAsText[level];

class LogTrace {
  constructor (level, message, actor, createdAt) {
    this.level = level;
    this.type = 'trace';
    this.message = message;
    this.actor = actor;
    this.createdAt = createdAt || new Date();
  }
}

class LogEvent {
  constructor (name, eventProperties, actor, createdAt) {
    this.type = 'event';
    this.name = name;
    this.properties = eventProperties;
    this.actor = actor;
    this.createdAt = createdAt || new Date();
  }
}

class LogMetric {
  constructor (name, values, actor, createdAt) {
    this.type = 'metric';
    this.name = name;
    this.values = values;
    this.actor = actor;
    this.createdAt = createdAt || new Date();
  }
}

class LogException {
  constructor (exception, actor, createdAt) {
    this.type = 'exception';
    this.exception = exception;
    this.actor = actor;
    this.createdAt = createdAt || new Date();
  }
}

const log = (facade, logEvent) => {
  const { dispatch } = require('../functions');
  dispatch(facade.loggingActor, logEvent, facade.reference);
};

class LoggingFacade {
  constructor (loggingActor, reference) {
    this.loggingActor = loggingActor;
    this.reference = reference;
  }

  trace (message) {
    log(this, new LogTrace(LogLevel.TRACE, String(message), this.reference));
  }

  debug (message) {
    log(this, new LogTrace(LogLevel.DEBUG, String(message), this.reference));
  }

  info (message) {
    log(this, new LogTrace(LogLevel.INFO, String(message), this.reference));
  }

  warn (message) {
    log(this, new LogTrace(LogLevel.WARN, String(message), this.reference));
  }

  critical (message) {
    log(this, new LogTrace(LogLevel.CRITICAL, String(message), this.reference));
  }

  error (message) {
    log(this, new LogTrace(LogLevel.ERROR, String(message), this.reference));
  }

  event (name, eventProperties) {
    log(this, new LogEvent(String(name), eventProperties, this.reference));
  }
  exception (exception) {
    log(this, new LogException(exception, this.reference));
  }

  metric (name, values) {
    log(this, new LogMetric(String(name), values, this.reference));
  }
}

const logNothing = () => new Nobody();

module.exports = {
  LogLevel,
  logLevelToString,
  LogEvent,
  LogTrace,
  LogMetric,
  LogException,
  LoggingFacade,
  logNothing
};

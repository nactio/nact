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
  constructor (level, category, message, properties, metrics) {
    this.level = level;
    this.category = category;
    this.message = message;
    this.properties = properties;
    this.metrics = metrics;
  }
}

class LoggingFacade {
  constructor () {
    if (this.constructor === LoggingFacade) {
      throw new Error('Cannot create instance of abstract class: LoggingFacade');
    }
  }

  log (logEvent) {
    throw new Error('#log() is not yet implemented');
  }

  off (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.OFF, 'trace', message, properties, metrics));
  }

  trace (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.TRACE, 'trace', message, properties, metrics)
    );
  }

  debug (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.DEBUG, 'trace', message, properties, metrics)
    );
  }

  info (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.INFO, 'trace', message, properties, metrics)
    );
  }

  warn (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.WARN, 'trace', message, properties, metrics)
    );
  }

  error (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.ERROR, 'trace', message, properties, metrics)
    );
  }

  critical (message, properties, metrics) {
    this.log(
      new LogEvent(LogLevel.CRITICAL, 'trace', message, properties, metrics)
    );
  }

  event (name, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'event', name, properties, metrics));
  }

  metrics (name, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'metrics', name, properties, metrics));
  }
}

class LoggingFacadeImpl extends LoggingFacade {
  constructor (logger) {
    super();
    this.logger = logger;
  }

  log (logEvent) {
    this.logger(logEvent);
  }
}

const logNothing = (system) => undefined;

module.exports = {
  LogLevel,
  logLevelToString,
  LogEvent,
  LoggingFacade,
  LoggingFacadeImpl,
  logNothing
};

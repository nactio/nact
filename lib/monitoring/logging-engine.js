const LogLevel = {
  OFF: 0,
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  WARNING: 4,
  ERROR: 5,
  CRITICAL: 6
};

const logLevelAsText = [
  'OFF', 'TRACE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
];

function logLevelToString (level) {
  return logLevelAsText[level] || '???';
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

class AbstractLoggingEngine {
  log (logEvent) {
    throw new Error('#log() is not yet implemented');
  }

  off (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.OFF, 'trace', message, properties, metrics));
  }

  trace (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.TRACE, 'trace', message, properties, metrics));
  }

  debug (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.DEBUG, 'trace', message, properties, metrics));
  }

  info (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'trace', message, properties, metrics));
  }

  warning (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.WARNING, 'trace', message, properties, metrics));
  }

  error (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.ERROR, 'trace', message, properties, metrics));
  }

  critical (message, properties, metrics) {
    this.log(new LogEvent(LogLevel.CRITICAL, 'trace', message, properties, metrics));
  }

  event (name, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'event', name, properties, metrics));
  }

  metrics (name, properties, metrics) {
    this.log(new LogEvent(LogLevel.INFO, 'metric', name, properties, metrics));
  }
}

class NoopLoggingEngine extends AbstractLoggingEngine {
  log (logEvent) {}
}

const noopLoggingEngine = new NoopLoggingEngine();

class ConsoleLoggingEngine extends AbstractLoggingEngine {
  constructor (consoleProxy, formatter) {
    super();
    this.channels = [
      null,
      consoleProxy.trace,
      consoleProxy.debug,
      consoleProxy.info,
      consoleProxy.warn,
      consoleProxy.error,
      consoleProxy.error
    ];
    this.formatter = formatter || ((logEvent) =>
      ''.concat('[', logLevelToString(logEvent.level), '] ',
                logEvent.category, ': ', logEvent.message)
      // `[{logLevelToString(level)}] {logEvent.category}: {logEvent.message}`
    );
  }

  log (logEvent) {
    const extra = [logEvent.properties, logEvent.metrics].filter(x => !!x);
    const channel = this.channels[logEvent.level];
    if (typeof channel === 'function') {
      channel(this.formatter(logEvent), ...extra);
    }
  }
}

module.exports = {
  LogLevel,
  logLevelToString,
  LogEvent,
  AbstractLoggingEngine,
  NoopLoggingEngine,
  noopLoggingEngine,
  ConsoleLoggingEngine
};

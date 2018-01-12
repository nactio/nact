const { spawnStateless } = require('../actor');
const { LogLevel, LogEvent, logLevelToString } = require('./logging-engine');

const logToConsole = (consoleProxy, formatter, name) => {
  const channels = [
    null,
    consoleProxy.trace,
    consoleProxy.debug,
    consoleProxy.info,
    consoleProxy.warn,
    consoleProxy.error
  ];

  const format = formatter || (logEvent) =>
    `[${logLevelToString(logEvent.level)}] ${logEvent.category}: ${logEvent.message}`;

  return (system) => spawnStateless(
    system,
    (msg, ctx) => {
      const extra = [logEvent.properties, logEvent.metrics].filter(x => !!x);
      const channel =
        channels[logEvent.level] ||
        (logEvent.level >= LogLevel.ERROR
          ? channels[LogLevel.ERROR]
          : undefined);
      if (typeof channel === 'function') {
        channel(format(logEvent), ...extra);
      }
    },
    name || 'logging-engine'
  );
};

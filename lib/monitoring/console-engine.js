const { spawnStateless } = require('../actor');
const { LogLevel, logLevelToString } = require('./logging-engine');

const logToConsole = (consoleProxy, formatter, name) => {
  consoleProxy = consoleProxy || console;
  const channels = new Array(LogLevel.CRITICAL + 1);
  channels[LogLevel.TRACE] = consoleProxy.trace || consoleProxy.log;
  channels[LogLevel.DEBUG] = consoleProxy.debug || channels[LogLevel.TRACE];
  channels[LogLevel.INFO] = consoleProxy.info || channels[LogLevel.DEBUG];
  channels[LogLevel.WARN] = consoleProxy.warn || channels[LogLevel.INFO];
  channels[LogLevel.ERROR] = consoleProxy.error || channels[LogLevel.WARN];
  channels[LogLevel.CRITICAL] = consoleProxy.critical || channels[LogLevel.ERROR];

  const format = formatter || ((logEvent) =>
    `[${logLevelToString(logEvent.level)}] ${logEvent.category}: ${logEvent.message}`);

  return (system) => spawnStateless(
    system,
    (logEvent, ctx) => {
      const extra = [logEvent.properties, logEvent.metrics].filter(x => !!x);
      const channel =
        channels[logEvent.level] ||
        (logEvent.level >= LogLevel.CRITICAL
          ? channels[LogLevel.CRITICAL]
          : undefined);
      if (typeof channel === 'function') {
        channel(format(logEvent), ...extra);
      }
    },
    name || 'logging-engine'
  );
};

module.exports = {
  logToConsole
};

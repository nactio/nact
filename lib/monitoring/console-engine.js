const { spawnStateless } = require('../actor');
const { LogLevel, logLevelToString } = require('./monitoring');

const logToConsole = ({ consoleProxy, formatter, name } = {}) => {
  const proxy = consoleProxy || console;
  const channels = new Array(LogLevel.CRITICAL + 1);
  channels[LogLevel.TRACE] = proxy.trace || proxy.log;
  channels[LogLevel.DEBUG] = proxy.debug || channels[LogLevel.TRACE];
  channels[LogLevel.INFO] = proxy.info || channels[LogLevel.DEBUG];
  channels[LogLevel.WARN] = proxy.warn || channels[LogLevel.INFO];
  channels[LogLevel.ERROR] = proxy.error || channels[LogLevel.WARN];
  channels[LogLevel.CRITICAL] = proxy.critical || channels[LogLevel.ERROR];

  const format = formatter || ((logEvent) => `[${logLevelToString(logEvent.level)}] ${logEvent.category}: ${logEvent.message}`);

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

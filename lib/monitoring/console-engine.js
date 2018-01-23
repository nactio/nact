const { spawnStateless } = require('../actor');
const { LogLevel, logLevelToString } = require('./monitoring');
const { ActorPath } = require('../paths');

const logToConsole = ({ consoleProxy, formatter, name } = {}) => {
  const proxy = consoleProxy || console;
  const channels = new Array(LogLevel.CRITICAL + 1);
  channels[LogLevel.TRACE] = proxy.trace || proxy.log;
  channels[LogLevel.DEBUG] = proxy.debug || channels[LogLevel.TRACE];
  channels[LogLevel.INFO] = proxy.info || channels[LogLevel.DEBUG];
  channels[LogLevel.WARN] = proxy.warn || channels[LogLevel.INFO];
  channels[LogLevel.ERROR] = proxy.error || channels[LogLevel.WARN];
  channels[LogLevel.CRITICAL] = proxy.critical || channels[LogLevel.ERROR];

  const actorRefToString = (actor) => new ActorPath(actor.path.parts, actor.path.system).toString();
  const formatTrace = formatter || ((logTrace) => `[${logLevelToString(logTrace.level)} @ ${logTrace.createdAt}] ${actorRefToString(logTrace.actor)} - ${logTrace.message}`);
  const formatMetrics = formatter || ((logMetric) => `[METRIC  @ ${logMetric.createdAt}] ${actorRefToString(logMetric.actor)} - ${logMetric.name}: ${JSON.stringify(logMetric.values, undefined, 4)}`);
  const formatEvent = formatter || ((logEvent) => `[EVENT @ ${logEvent.createdAt}] ${actorRefToString(logEvent.actor)} - ${logEvent.name}: ${JSON.stringify(logEvent.properties, undefined, 4)}`);
  const formatException = formatter || ((logException) => `[EXCEPTION @ ${logException.createdAt}] ${actorRefToString(logException.actor)} - ${logException.exception}`);

  const getChannel = (level) => {
    const possibleChannel = channels[level];
    if (typeof possibleChannel === 'function') {
      return possibleChannel;
    } else {
      return () => { };
    }
  };

  return (system) => spawnStateless(
    system,
    (log, ctx) => {
      switch (log.type) {
        case 'trace': {
          const channel = getChannel(log.level);
          channel(formatTrace(log));
          break;
        }
        case 'exception': {
          const channel = getChannel(LogLevel.ERROR);
          channel(formatException(log));
          break;
        }
        case 'metric': {
          const channel = getChannel(LogLevel.INFO);
          channel(formatMetrics(log));
          break;
        }
        case 'event': {
          const channel = getChannel(LogLevel.INFO);
          channel(formatEvent(log));
          break;
        }
      }
    },
    name || 'console-logger'
  );
};

module.exports = {
  logToConsole
};

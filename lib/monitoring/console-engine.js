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
  const formatTrace = formatter || ((logEvent) => `[${logLevelToString(logEvent.level)}] ${actorRefToString(logEvent.actor)} - ${logEvent.message}`);
  const formatMetrics = formatter || ((logEvent) => `[METRIC] ${actorRefToString(logEvent.actor)} - ${logEvent.message}`);
  const formatEvent = formatter || ((logEvent) => `[EVENT] ${actorRefToString(logEvent.actor)} - ${logEvent.message}`);
  const formatException = formatter || ((logEvent) => `[EXCEPTION] ${actorRefToString(logEvent.actor)} - ${logEvent.message}`);

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

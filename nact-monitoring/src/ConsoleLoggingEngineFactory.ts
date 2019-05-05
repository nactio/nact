import { ActorPath, ActorRef, Context, spawnStateless } from 'nact-core'

import { ConsoleLoggingChannel, ConsoleProxy } from './ConsoleProxy'
import { Log } from './Log'
import { LogEvent } from './LogEvent'
import { LogException } from './LogException'
import { LogLevel } from './LogLevel'
import { LogMetric } from './LogMetric'
import { LogTrace } from './LogTrace'

export interface ConsoleLoggingEngineFactoryOptions {
  consoleProxy?: ConsoleProxy
  name?: string
  formatter?(log: Log): string
}

const actorRefToString = (actor: any) => new ActorPath(actor.path.parts, actor.path.system).toString()
const defaultLogTraceFormatter = ((logTrace: LogTrace) => `[${LogLevel[logTrace.level]} @ ${logTrace.createdAt}] ${actorRefToString(logTrace.actor)} - ${logTrace.message}`)
const defaultLogMetriceFormatter = ((logMetric: LogMetric) => `[METRIC  @ ${logMetric.createdAt}] ${actorRefToString(logMetric.actor)} - ${logMetric.name}: ${JSON.stringify(logMetric.values, undefined, 4)}`)
const defaultLogEventFormatter = ((logEvent: LogEvent) => `[EVENT @ ${logEvent.createdAt}] ${actorRefToString(logEvent.actor)} - ${logEvent.name}: ${JSON.stringify(logEvent.properties, undefined, 4)}`)
const defaultLogExceptionFormatter = ((logException: LogException) => `[EXCEPTION @ ${logException.createdAt}] ${actorRefToString(logException.actor)} - ${logException.exception}`)

export function logToConsole(options: ConsoleLoggingEngineFactoryOptions = {}) {
  const proxy = options.consoleProxy || console
  const channels: ConsoleLoggingChannel[] = new Array(LogLevel.CRITICAL + 1)
  channels[LogLevel.TRACE] = proxy.trace || (proxy as Console).log
  channels[LogLevel.DEBUG] = proxy.debug || channels[LogLevel.TRACE]
  channels[LogLevel.INFO] = proxy.info || channels[LogLevel.DEBUG]
  channels[LogLevel.WARN] = proxy.warn || channels[LogLevel.INFO]
  channels[LogLevel.ERROR] = proxy.error || channels[LogLevel.WARN]
  channels[LogLevel.CRITICAL] = (proxy as ConsoleProxy).critical || channels[LogLevel.ERROR]

  const formatTrace = options.formatter || defaultLogTraceFormatter
  const formatMetrics = options.formatter || defaultLogMetriceFormatter
  const formatEvent = options.formatter || defaultLogEventFormatter
  const formatException = options.formatter || defaultLogExceptionFormatter

  function getChannel(level: LogLevel): ConsoleLoggingChannel {
    const possibleChannel = channels[level]
    if (typeof possibleChannel === 'function') {
      return possibleChannel
    } else {
      return () => {
        // noop
      }
    }
  }

  return (system: ActorRef) => spawnStateless(
    system,
    (log: Log, ctx: Context) => {
      switch (log.type) {
        case 'trace': {
          const logTrace = log as LogTrace
          const channel = getChannel(logTrace.level)
          channel(formatTrace(logTrace))
          break
        }
        case 'exception': {
          const channel = getChannel(LogLevel.ERROR)
          channel(formatException(log as LogException))
          break
        }
        case 'metric': {
          const channel = getChannel(LogLevel.INFO)
          channel(formatMetrics(log as LogMetric))
          break
        }
        case 'event': {
          const channel = getChannel(LogLevel.INFO)
          channel(formatEvent(log as LogEvent))
          break
        }
      }
    },
    options.name || 'console-logger'
  )
}

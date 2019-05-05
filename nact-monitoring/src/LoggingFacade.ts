import { boundMethod } from 'autobind-decorator'
import { Actor, ActorRef } from 'nact-core'

import { ConsoleProxy } from './ConsoleProxy'
import { Log } from './Log'
import { LogEvent } from './LogEvent'
import { LogException } from './LogException'
import { LogLevel } from './LogLevel'
import { LogMetric } from './LogMetric'
import { LogTrace } from './LogTrace'

export class LoggingFacade implements ConsoleProxy {
  constructor(
    public readonly loggingActor: Actor,
    public readonly reference: ActorRef,
  ) {}

  @boundMethod
  public trace(message: string) {
    this.log(new LogTrace(LogLevel.TRACE, String(message), this.reference))
  }

  @boundMethod
  public debug(message: string) {
    this.log(new LogTrace(LogLevel.DEBUG, String(message), this.reference))
  }

  @boundMethod
  public info(message: string) {
    this.log(new LogTrace(LogLevel.INFO, String(message), this.reference))
  }

  @boundMethod
  public warn(message: string) {
    this.log(new LogTrace(LogLevel.WARN, String(message), this.reference))
  }

  @boundMethod
  public critical(message: string) {
    this.log(new LogTrace(LogLevel.CRITICAL, String(message), this.reference))
  }

  @boundMethod
  public error(message: string) {
    this.log(new LogTrace(LogLevel.ERROR, String(message), this.reference))
  }

  @boundMethod
  public event(name: string, eventProperties: any) {
    this.log(new LogEvent(String(name), eventProperties, this.reference))
  }

  @boundMethod
  public exception(exception: Error) {
    this.log(new LogException(exception, this.reference))
  }

  @boundMethod
  public metric(name: string, values: any) {
    this.log(new LogMetric(String(name), values, this.reference))
  }

  private log(logEvent: Log) {
    //
  }
}

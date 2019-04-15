import { ActorRef } from 'nact-core'

import { Log } from './Log'
import { LogLevel } from './LogLevel'
import { LogType } from './LogType'

export class LogTrace implements Log {
  public readonly createdAt: Date

  constructor(
    public readonly level: LogLevel,
    public readonly message: string,
    public readonly actor: ActorRef,
    createdAt?: Date,
  ) {
    this.createdAt = createdAt || new Date()
  }

  public get type(): LogType {
    return 'trace'
  }
}

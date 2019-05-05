import { ActorRef } from 'nact-core'

import { Log } from './Log'
import { LogType } from './LogType'

export class LogEvent implements Log {
  public readonly createdAt: Date

  constructor(
    public readonly name: string,
    public readonly properties: unknown,
    public readonly actor: ActorRef,
    createdAt?: Date,
  ) {
    this.createdAt = createdAt || new Date()
  }

  public get type(): LogType {
    return 'event'
  }
}

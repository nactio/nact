import { ActorRef } from 'nact-core'

import { Log } from './Log'
import { LogType } from './LogType'

export class LogMetric implements Log {
  public readonly createdAt: Date

  constructor(
    public readonly name: string,
    public readonly values: unknown,
    public readonly actor: ActorRef,
    createdAt?: Date,
  ) {
    this.createdAt = createdAt || new Date()
  }

  public get type(): LogType {
    return 'metric'
  }
}

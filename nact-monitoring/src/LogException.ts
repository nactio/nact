import { ActorRef } from 'nact-core'

import { LogType } from './LogType'

export class LogException {
  public readonly createdAt: Date

  constructor(
    public readonly exception: Error,
    public readonly actor: ActorRef,
    createdAt?: Date,
  ) {
    this.createdAt = createdAt || new Date()
  }

  public get type(): LogType {
    return 'exception'
  }
}

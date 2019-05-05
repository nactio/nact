import { ActorRef, ActorReferenceType } from '.'
import { ActorSystemName } from '../actor'

export class TemporaryReference implements ActorRef {
  public readonly system: { name: ActorSystemName }
  public readonly id: TemporaryReferenceId

  constructor(systemName: string) {
    this.system = { name: systemName }
    this.id = Math.random() * Number.MAX_SAFE_INTEGER || 0
  }

  public get name(): string {
    return `temp-${this.id}`
  }

  public get parent(): ActorRef {
    return this
  }

  public get type(): ActorReferenceType {
    return ActorReferenceType.temp
  }
}

export type TemporaryReferenceId = number

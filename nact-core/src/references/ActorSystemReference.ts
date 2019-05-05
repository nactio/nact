import { ActorRef, ActorReferenceType } from '.'
import { ActorSystemName } from '../actor'
import { ActorPath } from '../paths'

export class ActorSystemReference implements ActorRef {
  public system: { name: ActorSystemName }

  constructor(public readonly name: string, public readonly path: ActorPath) {
    this.system = { name }
  }

  public get parent(): ActorRef {
    return this
  }

  public get type(): ActorReferenceType {
    return ActorReferenceType.system
  }
}

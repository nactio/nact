import { ActorRef, ActorReferenceType } from '.'
import { ActorSystemName } from '../actor'
import { ActorPath } from '../paths'

export class ActorReference<MSG = any> implements ActorRef<MSG> {
  public readonly system: { name: ActorSystemName }

  constructor(
    systemName: string,
    public readonly parent: ActorRef,
    public readonly path: ActorPath,
    public readonly name: string,
  ) {
    this.system = { name: systemName }
  }

  public get type(): ActorReferenceType {
    return ActorReferenceType.actor
  }
}

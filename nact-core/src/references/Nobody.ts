import { ActorRef, ActorReferenceType } from '.'
import { ActorSystemName } from '../actor'
import { ActorPath } from '../paths'

export const Nobody: ActorRef = new class implements ActorRef {
  public readonly system: { name: ActorSystemName }
  public readonly path: ActorPath

  constructor() {
    this.system = { name: undefined! }
    this.path = new ActorPath([], this.system)
  }

  public get name(): string {
    return 'nobody'
  }

  public get parent(): ActorRef {
    return this
  }

  public get type(): ActorReferenceType {
    return ActorReferenceType.nobody
  }
}()

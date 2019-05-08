import { TemporaryReference } from '../references'

export class TemporaryReferenceImpl<Msg> implements ActorRef<Msg> {
  public readonly system: { name: string }
  public readonly id: number

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


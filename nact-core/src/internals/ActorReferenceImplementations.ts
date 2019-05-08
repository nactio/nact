import { ActorSystemReference, ActorReference, TemporaryReference, ReferenceType } from '../references'
import { ActorPath } from '../paths'

export class ActorSystemReferenceImpl implements ActorSystemReference {
  public readonly system: { name: string }
  public readonly type = ReferenceType.system

  constructor(public readonly name: string, public readonly path: ActorPath) {
    this.system = { name }  
  }  
}


export class TemporaryReferenceImpl<Msg> implements TemporaryReference<Msg> {
  public readonly system: { name: string }
  public readonly id: number
  public readonly type = ReferenceType.temp;
  readonly name: string
  
  constructor(systemName: string) {
    this.system = { name: systemName }
    this.id = Math.random() * Number.MAX_SAFE_INTEGER || 0
    this.name = `temp-${this.id}`;
  }  
}


export class ActorReferenceImpl<Msg> implements ActorReference<Msg> {
  
}
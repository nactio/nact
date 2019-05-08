import { ActorPath } from "./ActorPath";

export enum ReferenceType {
  actor = 'actor',
  nobody = 'nobody',
  system = 'system',
  temp = 'temp'
}

export interface Reference<Msg> {
  readonly type: ReferenceType,
  readonly name: string
  readonly system?: { name: string }
}


export const Nobody: Reference<any> = new class implements Reference<any> { 
  public readonly type: ReferenceType.nobody
  public readonly name: ReferenceType.nobody
  constructor() {
    this.type = ReferenceType.nobody
    this.name = ReferenceType.nobody;
  }
}();


export interface ActorReference<Msg> extends Reference<Msg> {
  readonly type: ReferenceType.actor,
  readonly system: { name: string },
  readonly name: string,
  readonly path: ActorPath,  
  readonly parent: ActorReference<unknown>
}


export interface TemporaryReference<Msg> extends Reference<Msg> {
  readonly type: ReferenceType.temp,
  readonly system: { name: string }
}

export interface ActorSystemReference extends Reference<never> {
  readonly type: ReferenceType.system,
  readonly system: { name: string },
  readonly name: string
}


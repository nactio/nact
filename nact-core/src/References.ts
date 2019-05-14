import { ActorPath } from "./ActorPath";

export enum ReferenceType {
  actor = 'actor',
  nobody = 'nobody',
  system = 'system',
  temp = 'temp'
}

export interface Reference<Msg> {
  readonly type: ReferenceType
}

export interface ConcreteReference<Msg> extends Reference<Msg> {
  readonly type: ReferenceType.actor | ReferenceType.temp | ReferenceType.system
  readonly systemName: string
}

export interface NullReference extends Reference<any> {  
  readonly type: ReferenceType.nobody
}

export const Nobody: NullReference = new class implements NullReference {
  public readonly type: ReferenceType.nobody = ReferenceType.nobody  
}();



export class ActorReference<Msg> implements ConcreteReference<Msg> {
  public readonly type = ReferenceType.actor;
      
  constructor(
    public readonly systemName: string,    
    public readonly parent: ActorReference<unknown> | ActorSystemReference,
    public readonly path: ActorPath,
    public readonly name: string    
  ) {      
  }
}


export class TemporaryReference<Msg> implements ConcreteReference<Msg> {
  public readonly type = ReferenceType.temp;  
  public readonly id: number

  constructor(public readonly systemName: string) {  
    this.id = (Math.random() * Number.MAX_SAFE_INTEGER) | 0;
  }
}

export class ActorSystemReference implements ConcreteReference<never> {
  public readonly type = ReferenceType.system  

  constructor(public readonly systemName: string, public readonly path: ActorPath) {      
  }
}

export function isConcreteReference<T>(reference: Reference<T>) : reference is ConcreteReference<T> {
  const type = (<ConcreteReference<T>>reference).type;
  switch(type) {
    case ReferenceType.actor: 
    case ReferenceType.system:
    case ReferenceType.temp:
      return true;
    default: 
      return false;
  }
}

export function isSystemReference<T>(reference: Reference<T>): reference is ActorSystemReference {
  const type = (<ConcreteReference<T>>reference).type;
  return type == ReferenceType.system;
}


export function isActorReference<T>(reference: Reference<T>): reference is ActorReference<T> {
  const type = (<ConcreteReference<T>>reference).type;
  return type == ReferenceType.actor;
}

export function isTemporaryReference<T>(reference: Reference<T>): reference is TemporaryReference<T> {
  const type = (<ConcreteReference<T>>reference).type;
  return type == ReferenceType.actor;
}
import { boundMethod } from 'autobind-decorator'

import { Actor } from './Actor';
import { ActorReference, ConcreteReference, ActorSystemReference } from 'src/References';
import { ActorSystem } from './ActorSystem';
import { InferActorTypeFromReference, InferMessageType } from './TypeHelpers';



class ActorSystemRegistry {
  private readonly systemMap: Map<string, ActorSystem> = new Map()

  @boundMethod
  public add(system: ActorSystem) {
    this.systemMap.set(system.name, system)
  }

  @boundMethod
  public find<T extends ConcreteReference<InferMessageType<T>>>(
    systemName: string,
    reference: T,
  ): InferActorTypeFromReference<T>  {
    const system = this.systemMap.get(systemName);
    if(!system) {
      return undefined;
    }             
    return system.find(reference) as InferActorTypeFromReference<T>;            
  }

  @boundMethod
  public remove(systemName: string) {
    this.systemMap.delete(systemName)
  }

  @boundMethod
  public applyOrThrowIfStopped<Msg,Returns>(
    reference: ActorReference<Msg> | ActorSystemReference,
    f: (parent: Actor<Msg, unknown, unknown> | ActorSystem) => Returns,
  ): Returns {
    const actor = this.find(reference.systemName, reference)
    if (actor) {
      return f(actor)!
    } else {
      throw new Error('Actor has stopped or never even existed')
    }
  }
}

export const SystemRegistry = new ActorSystemRegistry()

import { boundMethod } from 'autobind-decorator'

import { ActorLike, ActorSystem, ActorSystemName } from '../actor'
import { UntypedActorRef } from './UntypedActorRef'

class ActorSystemRegistry {
  private readonly systemMap: Map<ActorSystemName, ActorSystem> = new Map()

  @boundMethod
  public add(system: ActorSystem) {
    this.systemMap.set(system.name, system)
  }

  @boundMethod
  public find(
    systemName: ActorSystemName,
    reference?: UntypedActorRef,
  ): ActorLike<Msg> | undefined {
    const system = this.systemMap.get(systemName)
    if (system) {
      if (reference) {
        return system.find(reference)
      } else {
        return system
      }
    } else {
      return undefined
    }
  }

  @boundMethod
  public remove(systemName: ActorSystemName) {
    this.systemMap.delete(systemName)
  }

  @boundMethod
  public applyOrThrowIfStopped<R>(
    reference: UntypedActorRef,
    f: (parent: ActorLike) => R | undefined,
  ): R {
    const actor = this.find(reference.system.name, reference)
    if (actor) {
      return f(actor)!
    } else {
      throw new Error('Actor has stopped or never even existed')
    }
  }
}

export const SystemRegistry = new ActorSystemRegistry()

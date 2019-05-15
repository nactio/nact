import {
  ActorLike,
  ActorRef,
  ActorReference,
  ActorSystem,
  Extension,
  MessageHandlerFunc,
  SystemRegistry,
} from 'nact-core'

import { AbstractPersistenceEngine } from './AbstractPersistenceEngine'
import { PersistentActor } from './PersistentActor'
import { PersistentActorConfig } from './PersistentActorConfig'

export function configurePersistence(
  engine: AbstractPersistenceEngine,
): Extension {
  return (system: ActorSystem): ActorSystem => {
    if (!engine) {
      throw new Error('Persistence engine should not be undefined')
    }
    return Object.assign(system, { persistenceEngine: engine })
  }
}

export function spawnPersistent<Msg, State>(
  parent: ActorRef,
  f: MessageHandlerFunc<Msg, State>,
  key: string,
  name?: string,
  properties?: PersistentActorConfig<Msg, State>,
): ActorReference<Msg> {
  return SystemRegistry.applyOrThrowIfStopped(
    parent,
    (p: ActorLike) =>
      new PersistentActor(
        p,
        name,
        p.system,
        f,
        key,
        (p.system as any).persistenceEngine,
        properties,
      ).reference,
  )
}

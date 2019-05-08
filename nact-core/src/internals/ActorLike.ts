import { ActorPath } from '../ActorPath'
import { ActorReference, ActorSystemReference } from '../References'
import { Actor, ActorName } from './Actor'
import { ActorSystem } from './ActorSystem'

export interface ActorLike<Msg> {
  name: ActorName
  path: ActorPath
  children: Map<ActorName, ActorLike<unknown>>
  reference: ActorReference<Msg> | ActorSystemReference
  system: ActorSystem
  stopped: boolean
  
  assertNotStopped(): boolean
  stop(): void
  childStopped(child: SupervisedActorLike<unknown>): void
  childSpawned(child: SupervisedActorLike<unknown>): void  
  handleFault(msg: unknown, error: Error, child?: SupervisedActorLike<unknown>): void
  reset(): void
}


export interface SupervisedActorLike<Msg> extends ActorLike<Msg> {
  reference: ActorReference<Msg>
  dispatch?(message: Msg): void
}
import { ActorPath } from '../paths/ActorPath'
import { ActorRef } from '../references/ActorRef'
import { Actor, ActorName } from './Actor'
import { ActorSystem } from './ActorSystem'

export interface ActorLike<MSG = any> {
  name: ActorName
  path: ActorPath
  children: Map<ActorName, Actor>
  reference: ActorRef<MSG>
  system: ActorSystem
  stopped: boolean

  assertNotStopped(): boolean
  stop(): void
  childStopped(child: Actor): void
  childSpawned(child: Actor): void
  dispatch?(message: MSG, sender?: ActorRef): void
  handleFault<T extends Actor>(msg: unknown, sender: ActorRef, error: Error, child?: T): void
  reset(): void
}

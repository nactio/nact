import { ActorPath } from '../paths'
import { ActorRef } from '../references'
import { ActorName } from './Actor'

export interface Context {
  parent: ActorRef
  path: ActorPath
  self: ActorRef
  name: ActorName
  children: Map<ActorName, ActorRef>
  sender: ActorRef
  log: Console
}

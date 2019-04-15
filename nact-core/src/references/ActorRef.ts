import { ActorReferenceType } from '.'
import { ActorName, ActorSystemName } from '../actor'

export interface ActorRef<MSG = any> {
  name: ActorName
  type: ActorReferenceType
  parent: ActorRef
  system: { name: ActorSystemName }
}

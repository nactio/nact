import { ActorPath } from "./ActorPath";
import { ActorReference, Reference } from "./References";

export interface Context<Msg, ParentMsg> {
  parent: Reference<ParentMsg>
  path: ActorPath
  self: ActorReference<Msg>
  name: string
  children: Map<string, ActorReference<unknown>>
  log: Console
}

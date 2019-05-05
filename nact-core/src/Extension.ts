import { ActorSystem } from './actor'

export type Extension = (system: ActorSystem) => ActorSystem

import { ActorSystem } from "./internals/ActorSystem";

export type Extension = (system: ActorSystem) => ActorSystem

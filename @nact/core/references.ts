import { ActorPath } from "./paths";
import { ActorSystemName } from "./system";


export type Ref<PathType extends string | undefined = undefined> = { p?: ActorPath<PathType> };

enum DispatchableMarker {
  _ = ""
}

export type Dispatchable<Msg, PathType extends string | undefined = undefined> = { __dispatch__: DispatchableMarker, protocol: Msg } & Ref<PathType>;

enum StoppableMarker {
  _ = ""
}

export type Stoppable = { __stop__: StoppableMarker } & Ref;

enum LocalMarker {
  _ = ""
}

export type Local = { __local__: LocalMarker } & Ref;

export function nobody() {
  let p = new ActorPath([], undefined);
  return { p } as (Stoppable & Dispatchable<any> & Local);
}

export function temporaryRef<T>(systemName: ActorSystemName) {
  const id = String((Math.random() * Number.MAX_SAFE_INTEGER) | 0);
  const p = new ActorPath<'temp'>([id], systemName, 'temp');
  return { p } as Dispatchable<T, 'temp'> & Local;
}


export type ActorRef<Msg> = Ref & Dispatchable<Msg> & Stoppable;
export function actorRef<Msg>(path: ActorPath) {
  return { p: path } as Dispatchable<Msg> & Stoppable;
}

export type LocalActorRef<Msg> = ActorRef<Msg> & Local;
export function localActorRef<Msg>(path: ActorPath) {
  return { p: path } as LocalActorRef<Msg>;
}
export type ActorSystemRef = Ref & Stoppable;

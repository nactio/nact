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

export type TemporaryRef<Msg> = Dispatchable<Msg, 'temp'>;
export type LocalTemporaryRef<Msg> = TemporaryRef<Msg> & Local;

export function temporaryRef<Msg>(systemName: ActorSystemName) {
  const id = String((Math.random() * Number.MAX_SAFE_INTEGER) | 0);
  const p = new ActorPath<'temp'>([id], systemName, 'temp');
  return { p } as TemporaryRef<Msg>;
}
export function localTemporaryRef<Msg>(systemName: ActorSystemName) {
  return temporaryRef(systemName) as LocalTemporaryRef<Msg>;
}

export type ActorRef<Msg> = Ref & Dispatchable<Msg> & Stoppable;
export function actorRef<Msg>(path: ActorPath) {
  return { p: path } as Dispatchable<Msg> & Stoppable;
}

export type LocalActorRef<Msg> = ActorRef<Msg> & Local;
export function localActorRef<Msg>(path: ActorPath) {
  return { p: path } as LocalActorRef<Msg>;
}


enum SystemMarker {
  _ = ""
}

export type ActorSystemRef = Ref & Stoppable & { __system__: SystemMarker };

export function actorSystemRef(path: ActorPath) {
  return { p: path } as ActorSystemRef;
}
export type LocalActorSystemRef = ActorSystemRef & Local;

export function localActorSystemRef(path: ActorPath) {
  return { p: path } as LocalActorSystemRef;
}
import { ActorPath } from "./paths";
import { ActorSystemName } from "./system";


export type Ref = { path: ActorPath };

enum DispatchableMarker {
  _ = ""
}

export type Dispatchable<Msg> =
  { __dispatch__: DispatchableMarker, protocol: Msg } & Ref;

enum StoppableMarker {
  _ = ""
}

export type Stoppable = { __stop__: StoppableMarker } & Ref;

enum LocalMarker {
  _ = ""
}

export type Local = { __local__: LocalMarker } & Ref;

export function nobody() {
  let path: ActorPath = { parts: [], system: undefined };
  return { path } as (Stoppable & Dispatchable<any> & Local);
}

export type TemporaryRef<Msg> = Dispatchable<Msg>;
export type LocalTemporaryRef<Msg> = TemporaryRef<Msg> & Local;

export function temporaryRef<Msg>(systemName: ActorSystemName) {
  const id = String((Math.random() * Number.MAX_SAFE_INTEGER) | 0);
  const path: ActorPath = { parts: [id], system: systemName, isTemporary: true };
  return { path } as TemporaryRef<Msg>;
}

export function localTemporaryRef<Msg>(systemName: ActorSystemName) {
  return temporaryRef(systemName) as LocalTemporaryRef<Msg>;
}

export type ActorRef<Msg> = Ref & Dispatchable<Msg> & Stoppable;
export function actorRef<Msg>(path: ActorPath) {
  return { path: path } as Dispatchable<Msg> & Stoppable;
}

export type LocalActorRef<Msg> = ActorRef<Msg> & Local;
export function localActorRef<Msg>(path: ActorPath) {
  return { path: path } as LocalActorRef<Msg>;
}

enum SystemMarker {
  _ = ""
}

export type ActorSystemRef = Ref & Stoppable & { __system__: SystemMarker };

export function actorSystemRef(path: ActorPath) {
  return { path: path } as ActorSystemRef;
}
export type LocalActorSystemRef = ActorSystemRef & Local;

export function localActorSystemRef(path: ActorPath) {
  return { path: path } as LocalActorSystemRef;
}
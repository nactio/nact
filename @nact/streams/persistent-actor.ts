import { IPersistenceEngine } from "./interfaces";
import type { LocalActorRef, LocalActorSystemRef, Ref, Local, Dispatchable, Stoppable, ActorContext } from '@nact/core';
import type { ActorProps } from '@nact/core/actor';
import { spawn } from '@nact/core';
import type { ActorPath } from '@nact/core/paths';


enum SnapshottableMarker {
  _ = ""
}

export type Snapshottable<State> =
  {
    __snapshot__: SnapshottableMarker,
    state: State,
    persistenceKey: string
  } & Ref;

enum PersistableMarker {
  _ = ""
}

type Persistable<Msg> = {
  __persist__: PersistableMarker,
  protocol: Msg,
  persistenceKey: string
} & Ref;

// export type Snapshottable = {  };

type PersistentActorRef<State, Msg> =
  Ref & Local & Dispatchable<Msg> & Stoppable & Snapshottable<State> & Persistable<Msg>;

function persistentActorRef<Msg, State>(path: ActorPath, persistenceKey: string) {
  return { path, persistenceKey } as PersistentActorRef<Msg, State>;
}

export type PersistentActorContext<State, Msg, ParentRef extends LocalActorSystemRef | LocalActorRef<any>> =
  ActorContext<Msg, ParentRef> & { self: PersistentActorRef<State, Msg> };

type Recovering = boolean;

type PersistentActorFunc<State, Msg, ParentRef extends LocalActorSystemRef | LocalActorRef<any>> =
  (this: PersistentActorContext<State, Msg, ParentRef>, state: State, msg: [Msg, Recovering], ctx: PersistentActorContext<State, Msg, ParentRef>) =>
    State | Promise<State>;
;

type PersistentActorProps<State, Msg, ParentRef extends LocalActorSystemRef | LocalActorRef<any>> =
  ActorProps<State, Msg, ParentRef> & {
    persistenceKey: string,
    snapshotEncoder?: (data: State) => any,
    snapshotDecoder?: (data: any) => State,
    encoder?: (msg: Msg) => any,
    decoder?: (data: any) => Msg
  };


export declare type InferMsgFromFunc<T extends PersistentActorFunc<any, any, any>> = T extends PersistentActorFunc<any, infer Msg, any> ? Msg : never;
export declare type InferStateFromFunc<T extends PersistentActorFunc<any, any, any>> = T extends PersistentActorFunc<infer State, any, any> ? State : never;


async function spawnPersistent<ParentRef extends LocalActorSystemRef | LocalActorRef<any>, Func extends PersistentActorFunc<any, any, ParentRef>>(
  engine: IPersistenceEngine,
  parent: ParentRef,
  func: Func,
  properties: PersistentActorProps<InferStateFromFunc<Func>, InferMsgFromFunc<Func>, ParentRef>): Promise<LocalActorRef<any>> {

  let recovering = true;

  const actor = spawn(parent, async function (state, msg, ctx) {
    const pCtx = ctx as PersistentActorContext<InferStateFromFunc<Func>, InferMsgFromFunc<Func>, ParentRef>;
    pCtx.self = persistentActorRef(ctx.self.path, properties.persistenceKey);
    return func.call(ctx as PersistentActorContext<InferStateFromFunc<Func>, InferMsgFromFunc<Func>, ParentRef>, state, [msg, false], pCtx);
  }, properties);

  return actor;
}
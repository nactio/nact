import { Milliseconds } from ".";
import { Deferral } from "./deferral";
import { Dispatchable, LocalTemporaryRef, Ref } from "./references";

export interface ICanDispatch<Msg, DispatchResult = void> {
  dispatch(msg: Msg): DispatchResult
}

export type QueryMsgFactory<Req, Res> = (tempRef: Dispatchable<Res>) => Req;
export type InferResponseFromMsgFactory<T extends QueryMsgFactory<any, any>> = T extends QueryMsgFactory<infer _Req, infer Res> ? Res : never;

export interface ICanQuery<Msg> {
  query<MsgFactory extends QueryMsgFactory<Msg, any>>(msgFactory: MsgFactory, timeout: Milliseconds): Promise<InferResponseFromMsgFactory<MsgFactory>>
}

export interface ICanStop<StopResult = void> {
  stop(): StopResult
}


export interface ICanManageTempReferences {
  addTempReference(reference: LocalTemporaryRef<any>, deferral: Deferral<any>): void;
  removeTempReference(reference: LocalTemporaryRef<any>): void
}


export interface ICanReset {
  reset(): void
}


export interface ICanFind {
  find(path: Ref): any | undefined
}


export interface IHaveChildren<Child, System> {
  children: Map<string, Child>;
  system: System;
  childStopped(child: Child): void;
  childSpawned(child: Child): void;
}

export type IHaveName = {
  name: string
  reference: Ref
}


export interface ICanHandleFault<Child extends ICanStop & ICanReset & IHaveName> {
  handleFault(msg: unknown, error: Error | undefined, child?: Child): Promise<void> | void;
}

export interface ICanAssertNotStopped {
  assertNotStopped(): boolean
}
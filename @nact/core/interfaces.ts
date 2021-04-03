import { Milliseconds } from ".";
import { Dispatchable, Ref } from "./references";

export interface ICanDispatch<Msg, DispatchResult = void> {
  dispatch(msg: Msg): DispatchResult
}

export type QueryMsgFactory<Req, Res> = (tempRef: Dispatchable<Res>) => Req;
export type InferResponseFromMsgFactory<T extends QueryMsgFactory<any, any>> = T extends QueryMsgFactory<any, infer Res> ? Res : never;

export interface ICanQuery<Msg> {
  query<MsgCreator extends QueryMsgFactory<Msg, any>>(queryFactory: MsgCreator, timeout: Milliseconds): Promise<InferResponseFromMsgFactory<MsgCreator>>
}

export interface ICanStop<StopResult = void> {
  stop(): StopResult
}


export interface ICanFind {
  find(path: Ref): any | undefined
}

type Maybe<T> = Partial<T>;

export interface IHaveChildren<Children extends ICanStop & Maybe<IHaveChildren> = ICanStop & IHaveChildren<any>> {
  children: Map<string, Children>;
}

export type IHaveName = {
  name: string
}


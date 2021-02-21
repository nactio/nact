import { Milliseconds } from ".";
import { Ref } from "./references";

export interface ICanDispatch<Msg, DispatchResult = void> {
  dispatch(msg: Msg): Promise<DispatchResult>
}

type QueryMsgFactory<Req, Res> = (tempRef: Ref<Res>) => Req;
type InferResponseFromMsgFactory<T extends QueryMsgFactory<any, any>> = T extends QueryMsgFactory<any, infer Res> ? Res : never;

export interface ICanQuery<Msg> {
  query<MsgCreator extends QueryMsgFactory<Msg, any>>(queryFactory: MsgCreator, timeout: Milliseconds): Promise<InferResponseFromMsgFactory<MsgCreator>>
}

export interface ICanStop<StopResult = void> {
  stop(): Promise<StopResult>
}


export interface ICanFind {
  find(path: Ref<any>): any | undefined
}


export type IHaveName = {
  name: string
}


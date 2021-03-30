import { Dispatchable, Stoppable } from "./references";
import { Milliseconds } from "./time";
import { find } from './system-map';
import { ICanDispatch, ICanQuery, ICanStop } from "./interfaces";

export function stop(actor: Stoppable) {
  let concreteActor = find<ICanStop>(actor);
  concreteActor &&
    concreteActor.stop &&
    concreteActor.stop();
};


export type QueryMsgFactory<Req, Res> = (tempRef: Dispatchable<Res>) => Req;
export type InferResponseFromMsgFactory<T extends QueryMsgFactory<any, any>> = T extends QueryMsgFactory<any, infer Res> ? Res : never;
export function query<Msg, MsgCreator extends QueryMsgFactory<Msg, any>>(actor: Dispatchable<Msg>, queryFactory: MsgCreator, timeout: Milliseconds): Promise<InferResponseFromMsgFactory<MsgCreator>> {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }

  const concreteActor = find<ICanQuery<Msg>>(actor);

  return (concreteActor && concreteActor.query)
    ? concreteActor.query(queryFactory, timeout)
    : Promise.reject(new Error('Actor stopped or never existed. Query can never resolve'));
};

export function dispatch<T>(actor: Dispatchable<T>, msg: T): void {
  let concreteActor = find<ICanDispatch<T>>(actor);
  concreteActor &&
    concreteActor.dispatch &&
    concreteActor.dispatch(msg);
};

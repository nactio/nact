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
export type InferResponseFromMsgFactory<T extends QueryMsgFactory<any, any>> = T extends QueryMsgFactory<infer _Req, infer Res> ? Res : never;
type Maybe<T> = Partial<T>;

export function query<ActorRef extends Dispatchable<any>, MsgFactory extends QueryMsgFactory<ActorRef extends Dispatchable<infer Msg> ? Msg : never, any>>(actor: ActorRef, queryFactory: MsgFactory, timeout: Milliseconds):
  Promise<InferResponseFromMsgFactory<MsgFactory>> {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }

  const concreteActor = find<Maybe<ICanQuery<any>>>(actor);

  return (concreteActor && concreteActor.query)
    ? concreteActor.query<MsgFactory>(queryFactory, timeout)
    : Promise.reject(new Error('Actor stopped or never existed. Query can never resolve'));
};

export function dispatch<ActorRef extends Dispatchable<any>>(actor: ActorRef, msg: ActorRef extends Dispatchable<infer Msg> ? Msg : never): void {
  let concreteActor = find<ICanDispatch<ActorRef>>(actor);
  concreteActor &&
    concreteActor.dispatch &&
    concreteActor.dispatch(msg);
};

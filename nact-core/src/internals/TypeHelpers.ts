import { Actor } from "./Actor";
import { TemporaryActor } from "./TemporaryActor";
import { ActorSystem } from "./ActorSystem";
import { ActorReference, ActorSystemReference, ConcreteReference, TemporaryReference } from "../References";

export type InferActorTypeFromReference<T> = 
  (T extends ActorSystemReference 
  ? ActorSystem
  : (T extends ActorReference<infer Msg> 
      ? Actor<Msg, unknown, unknown> 
      : (T extends TemporaryReference<infer Msg> ? TemporaryActor<Msg> : never)
  )) | undefined;



export type InferReferenceType<T> =
  (T extends ActorSystemReference
    ? ActorSystemReference
    : (T extends ActorReference<infer Msg>
      ? ActorReference<Msg>
      : (T extends TemporaryReference<infer Msg> ? TemporaryReference<Msg> : never)
    ));



export type InferMessageType<T> =
  T extends ConcreteReference<infer Msg>
    ? Msg
    : never;

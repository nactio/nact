import { Extension } from './Extension'
import { ActorReference, ActorSystemReference, Reference, isActorReference, isTemporaryReference } from './references'
import { StatelessActorConfig, StatefulActorConfig } from './ActorConfig';
import { SystemRegistry } from './internals/ActorSystemRegistry';
import { ActorSystem } from './internals/ActorSystem';
import { Actor } from './internals/Actor';
import { Context } from './Context';

export type ActorSystemName = string;

export function start(head?: Extension | ActorSystemName, ...tail: Extension[]): ActorSystemReference {
  return new ActorSystem(head, ...tail).reference
}

export function stop<Msg>(actor: ActorSystemReference | ActorReference<Msg>) {
  const concreteActor = SystemRegistry.find(actor.systemName, actor)
  if (concreteActor) {
    concreteActor.stop()
  }
}


export function query<Response, Msg>(
  actor: ActorReference<Msg>,
  msg: (sender: Reference<Response>) => Msg,
  timeout: number,
): Promise<Response> {
  if (!timeout) {
    throw new Error('A timeout is required to be specified')
  }  
  const concreteActor = SystemRegistry.find(actor.systemName, actor);
  if (concreteActor) {
    return concreteActor.query<Response>(msg, timeout)
  } else {
    throw new Error('Actor stopped or never existed. Query can never resolve')
  }
}

export function dispatch<Msg>(
  actor: Reference<Msg>,
  msg: Msg
) {
  if(isActorReference(actor) || isTemporaryReference(actor)) {
    const concreteActor = SystemRegistry.find(actor.systemName, actor);
    if(concreteActor) {
      concreteActor.dispatch(msg);
    }
  }
}

export function spawn<Msg, ParentMsg, State>(
  parent: ActorReference<ParentMsg> | ActorSystemReference,
  f: (state: State, msg: Msg, ctx: Context<Msg, ParentMsg>) => State,
  name?: string,
  properties?: StatefulActorConfig<Msg, State>,
): ActorReference<Msg> {
  return SystemRegistry.applyOrThrowIfStopped<ParentMsg, ActorReference<Msg>>(parent, p => {
    p.assertNotStopped()
    return new Actor(p, name, p.system, f, properties).reference
  })
}

export function spawnStateless<Msg, ParentMsg>(
  parent: ActorReference<ParentMsg> | ActorSystemReference,
  f: (msg: Msg, ctx: Context<Msg, ParentMsg>) => void,
  name?: string,
  properties?: StatelessActorConfig<Msg, ParentMsg>,
): ActorReference<Msg> {
  return spawn(
    parent,
    (_: void, msg, ctx) => f.call(ctx, msg, ctx),
    name,
    {
      ...properties,
      initialState: undefined,
      onCrash: (_, __, ctx) => ctx.resume,
    }
  )
}

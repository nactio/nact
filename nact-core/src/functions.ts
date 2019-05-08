import { Extension } from './Extension'
import { ActorReference, ActorSystemReference, Nobody } from './references'
import { StatelessActorConfig, StatefulActorConfig } from './ActorConfig';
import { SystemRegistry } from './internals/ActorSystemRegistry';

export function start(
  head?: Extension | string | { name: string },
  ...tail: Extension[]
): ActorSystemReference {
  return new ActorSystem(head, ...tail).reference
}

export function stop<Msg>(actor: ActorReference<Msg> | ActorSystemReference) {  
  const concreteActor = SystemRegistry.find(actor.system.name, actor)
  if (concreteActor) {
    concreteActor.stop()
  }
}

export function query<Response = any, Msg = any>(
  actor: ActorReference<Msg>,
  msg: (sender: ActorReference<Response>) => Msg,
  timeout: number,
): Promise<Response> {
  if (!timeout) {
    throw new Error('A timeout is required to be specified')
  }

  const concreteActor = SystemRegistry.find(actor.system.name, actor) as
    | Actor<Msg>
    | undefined

  if (concreteActor) {
    return concreteActor.query<Response>(msg, timeout)
  } else {
    throw new Error('Actor stopped or never existed. Query can never resolve')
  }
}

export function dispatch<Msg>(
  actor: ActorRef<Msg>,
  msg: Msg
) {
  const concreteActor = SystemRegistry.find(actor.system.name, actor)

  if (concreteActor && concreteActor.dispatch) {
    concreteActor.dispatch(msg, sender)
  }
}

export function spawn<Msg, ParentMsg, State>(
  parent: ActorRef<ParentMsg>,
  f: MessageHandlerFunc<Msg, State>,
  name?: ActorName,
  properties?: StatefulActorConfig<Msg, State>,
): ActorReference<Msg> {
  return SystemRegistry.applyOrThrowIfStopped(parent, p => {
    p.assertNotStopped()
    return new Actor(p, name, p.system, f, properties).reference
  })
}

export function spawnStateless<Msg, ParentMsg>(
  parent: ActorRef<ParentMsg>,
  f: StatelessActorMessageHandlerFunc<Msg>,
  name?: ActorName,
  properties?: StatelessActorConfig<Msg>,
): ActorReference<Msg> {
  return spawn(
    parent,
    (_: void, msg: Msg, ctx: Context<Msg, ParentMsg, void>) => f.call(ctx, msg, ctx),
    name,
    {
      ...properties,
      initialState: undefined,
      onCrash: (_, __, ctx) => ctx.resume,
    } as StatefulActorConfig<Msg, ParentMsg, void>,
  )
}

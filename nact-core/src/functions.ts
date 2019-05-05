import {
  Actor,
  ActorConfig,
  ActorName,
  ActorSystem,
  ActorSystemName,
  Context,
  MessageHandlerFunc,
  StatefulActorConfig,
  StatelessActorMessageHandlerFunc,
  SystemRegistry,
} from './actor'
import { Extension } from './Extension'
import { ActorRef, Nobody } from './references'
import { ActorReference } from './references/ActorReference'
import { ActorSystemReference } from './references/ActorSystemReference'

export function start(
  head?: Extension | ActorSystemName | { name: ActorSystemName },
  ...tail: Extension[]
): ActorSystemReference {
  return new ActorSystem(head, ...tail).reference
}

export function stop(actor: ActorRef) {
  const concreteActor = SystemRegistry.find(actor.system.name, actor)
  if (concreteActor) {
    concreteActor.stop()
  }
}

export function query<RESP = any, MSG = any>(
  actor: ActorRef<MSG>,
  msg: MSG,
  timeout: number,
): Promise<RESP> {
  if (!timeout) {
    throw new Error('A timeout is required to be specified')
  }

  const concreteActor = SystemRegistry.find(actor.system.name, actor) as
    | Actor<MSG>
    | undefined

  if (concreteActor) {
    return concreteActor.query<RESP>(msg, timeout)
  } else {
    throw new Error('Actor stopped or never existed. Query can never resolve')
  }
}

export function dispatch<MSG>(
  actor: ActorRef<MSG>,
  msg: MSG,
  sender: ActorRef = Nobody,
) {
  const concreteActor = SystemRegistry.find(actor.system.name, actor)

  if (concreteActor && concreteActor.dispatch) {
    concreteActor.dispatch(msg, sender)
  }
}

export function spawn<MSG = any, ST = any>(
  parent: ActorRef,
  f: MessageHandlerFunc<MSG, ST>,
  name?: ActorName,
  properties?: StatefulActorConfig<MSG, ST>,
): ActorReference<MSG> {
  return SystemRegistry.applyOrThrowIfStopped(parent, p => {
    p.assertNotStopped()
    return new Actor(p, name, p.system, f, properties).reference
  })
}

export function spawnStateless<MSG>(
  parent: ActorRef,
  f: StatelessActorMessageHandlerFunc<MSG>,
  name?: ActorName,
  properties?: ActorConfig<MSG>,
): ActorReference<MSG> {
  return spawn(
    parent,
    (_: unknown, msg: MSG, ctx: Context) => f.call(ctx, msg, ctx),
    name,
    {
      ...properties,
      initialState: {},
      onCrash: (_, __, ctx) => ctx.resume,
    } as StatefulActorConfig<MSG>,
  )
}

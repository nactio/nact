import { Actor, ActorRef } from 'nact-core'

export type LoggingEngine = (reference: ActorRef) => Actor

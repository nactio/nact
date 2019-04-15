import { SupervisionPolicy } from '../supervision/SupervisionPolicy'
import { Context } from './Context'

export interface StatefulActorConfig<MSG, ST = any> {
  shutdownAfter?: number
  onCrash?: SupervisionPolicy<MSG>
  initialState?: ST
  initialStateFunc?: InitialStateFunc<ST>
}

export interface ActorConfig<MSG> {
  shutdownAfter?: number
  onCrash?: SupervisionPolicy<MSG>
}

export type InitialStateFunc<ST> = (ctx: Context) => ST

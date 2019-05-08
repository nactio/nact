import { SupervisionPolicy } from './Supervision'
import { Context } from './Context'

export type InitialStateFunc<Msg, ParentMsg, State> = (ctx: Context<Msg, ParentMsg>) => State

export interface StatefulActorConfig<Msg, ParentMsg, State = any> {
  shutdownAfter?: number
  onCrash?: SupervisionPolicy<Msg, ParentMsg>
  initialState?: State
  initialStateFunc?: InitialStateFunc<Msg, ParentMsg, State>
}

export interface StatelessActorConfig<Msg, ParentMsg> {
  shutdownAfter?: number
  onCrash?: SupervisionPolicy<Msg, ParentMsg>
}


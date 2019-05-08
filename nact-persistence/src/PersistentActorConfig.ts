import { StatefulActorConfig } from 'nact-core'

export interface PersistentActorConfig<Msg, State>
  extends StatefulActorConfig<Msg, State> {
  snapshotEvery?: number
  snapshotEncoder?: SnapshotEncoder<State>
  snapshotDecoder?: SnapshotDecoder<State>
  encoder?: EventEncoder<Msg>
  decoder?: EventDecoder<Msg>
}

export type SnapshotData = any
export type SnapshotEncoder<State> = (state: State) => SnapshotData
export type SnapshotDecoder<State> = (data: SnapshotData) => State
export type EventData = any
export type EventEncoder<Msg> = (event: Msg) => EventData
export type EventDecoder<Msg> = (data: EventData) => Msg

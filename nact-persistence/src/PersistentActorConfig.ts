import { StatefulActorConfig } from 'nact-core'

export interface PersistentActorConfig<MSG, ST>
  extends StatefulActorConfig<MSG, ST> {
  snapshotEvery?: number
  snapshotEncoder?: SnapshotEncoder<ST>
  snapshotDecoder?: SnapshotDecoder<ST>
  encoder?: EventEncoder<MSG>
  decoder?: EventDecoder<MSG>
}

export type SnapshotData = any
export type SnapshotEncoder<ST> = (state: ST) => SnapshotData
export type SnapshotDecoder<ST> = (data: SnapshotData) => ST
export type EventData = any
export type EventEncoder<MSG> = (event: MSG) => EventData
export type EventDecoder<MSG> = (data: EventData) => MSG

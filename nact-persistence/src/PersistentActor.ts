import { boundMethod } from 'autobind-decorator'
import {
  Actor,
  ActorLike,
  ActorRef,
  ActorSystem,
  MessageHandlerFunc,
  Nobody,
  SupervisionActions,
} from 'nact-core'

import { AbstractPersistenceEngine } from './AbstractPersistenceEngine'
import { PersistedEvent } from './PersistedEvent'
import { PersistedSnapshot } from './PersistedSnapshot'
import {
  EventDecoder,
  EventEncoder,
  PersistentActorConfig,
  SnapshotDecoder,
  SnapshotEncoder,
} from './PersistentActorConfig'

export class PersistentActor<Msg, State> extends Actor<Msg, State> {
  private messagesToNextSnapshot: number
  private sequenceNumber: number = 0
  private readonly snapshotEvery: number
  private readonly snapshotEncoder: SnapshotEncoder<State>
  private readonly snapshotDecoder: SnapshotDecoder<State>
  private readonly encoder: EventEncoder<Msg>
  private readonly decoder: EventDecoder<Msg>

  constructor(
    parent: ActorLike,
    name: string | undefined,
    system: ActorSystem,
    f: MessageHandlerFunc<Msg, State>,
    private readonly key: string,
    private readonly persistenceEngine: AbstractPersistenceEngine,
    {
      snapshotEvery,
      snapshotEncoder = id,
      snapshotDecoder = id,
      encoder = id,
      decoder = id,
      ...properties
    }: PersistentActorConfig<Msg, State> = {},
  ) {
    super(parent, name, system, f, properties)

    if (!key) {
      throw new Error('Persistence key required')
    }
    if (typeof key !== 'string') {
      throw new Error('Persistence key must be a string')
    }

    this.snapshotDecoder = snapshotDecoder
    this.snapshotEncoder = snapshotEncoder
    this.decoder = decoder
    this.encoder = encoder

    if (!snapshotEvery) {
      (this.afterMessage as any) = unit
      this.snapshotEvery = Number.POSITIVE_INFINITY
    } else if (typeof snapshotEvery !== 'number') {
      throw new Error(
        'snapshotEvery should be specified as a number. The value indicates how many messages are persisted between snapshots',
      )
    } else {
      this.snapshotEvery = snapshotEvery
    }
    this.messagesToNextSnapshot = this.snapshotEvery
    this.immediate = setImmediate(() => this.recover())
  }

  @boundMethod
  public reset() {
    this.initializeState()
    this.busy = true
    this.sequenceNumber = 0
    this.children.forEach(x => x.stop())
    this.immediate = setImmediate(() => this.recover())
  }

  @boundMethod
  protected async afterMessage() {
    if (this.messagesToNextSnapshot <= 0) {
      const snapshotState = this.snapshotEncoder(this.state)
      this.messagesToNextSnapshot = this.snapshotEvery
      const sequenceNumber = this.sequenceNumber
      const key = this.key
      const snapshot = new PersistedSnapshot(snapshotState, sequenceNumber, key)
      try {
        return await this.persistenceEngine.takeSnapshot(snapshot)
      } catch (e) {
        // tslint:disable-next-line:no-console
        console.error('Failed to take snapshot due to error: ', e)
      }
    }
  }

  @boundMethod
  protected async handleFaultedRecovery(
    msg: Msg,
    sender: ActorRef = Nobody,
    error: Error,
  ) {
    const ctx = this.createSupervisionContext(msg, sender, error)
    const decision = await Promise.resolve(this.onCrash(msg, error, ctx))
    switch (decision) {
      case SupervisionActions.stop:
        this.stop()
        return false
      case SupervisionActions.stopAll:
        this.parent.children.forEach(x => x.stop())
        return false
      case SupervisionActions.resume:
        return true
      case SupervisionActions.reset:
        // tslint:disable-next-line:no-console
        console.warn(
          'Resetting during recovery is not a recommended supervision policy',
        )
        this.reset()
        return false
      case SupervisionActions.resetAll:
        // tslint:disable-next-line:no-console
        console.warn(
          'Resetting during recovery is not a recommended supervision policy',
        )
        this.parent.children.forEach(x => x.reset())
        return false
      case SupervisionActions.escalate:
      default:
        this.parent.handleFault(msg, sender, error, this)
        return false
    }
  }

  @boundMethod
  protected async recover() {
    try {
      this.clearTimeout()
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      const snapshot = await this.persistenceEngine.latestSnapshot(this.key)

      if (snapshot) {
        this.state = this.snapshotDecoder(snapshot.data)
        this.sequenceNumber = snapshot.sequenceNumber
      }

      const events = await this.persistenceEngine.events(
        this.key,
        this.sequenceNumber,
      )
      const result = await events.reduce<Promise<[State, number, number]>>(
        async (prev, msg, index) => {
          const [prevState, prevIndex] = await prev
          if (msg.isDeleted) {
            return [prevState, prevIndex, msg.sequenceNumber]
          } else {
            const decodedMsg = this.decoder(msg.data)
            const context = {
              ...this.createContext(this.reference),
              recovering: true,
            }
            try {
              // Might not be an async function. Using promise.resolve to force it into that form
              const nextState = await Promise.resolve(
                this.f.call(context, prevState, decodedMsg, context),
              )
              return [nextState, index, msg.sequenceNumber]
            } catch (e) {
              const shouldContinue = await this.handleFaultedRecovery(
                decodedMsg,
                undefined,
                e,
              )
              if (shouldContinue) {
                return [prevState, prevIndex, msg.sequenceNumber]
              } else {
                throw e
              }
            }
          }
        },
        Promise.resolve([this.state, 0, this.sequenceNumber]),
      )

      const [state, messageCount, seq] = result
      this.sequenceNumber = seq
      this.messagesToNextSnapshot = this.snapshotEvery - messageCount
      this.state = state
      this.afterMessage()
      this.processNext()
    } catch (e) {
      this.handleFault(undefined!, undefined, e)
    }
  }

  @boundMethod
  protected async persist(msg: Msg, tags: string[] = []) {
    --this.messagesToNextSnapshot
    const persistedEvent = new PersistedEvent(
      this.encoder(msg),
      ++this.sequenceNumber,
      this.key,
      tags,
    )
    await this.persistenceEngine.persist(persistedEvent)
  }

  @boundMethod
  protected createContext(sender: ActorRef) {
    return {
      ...super.createContext(sender),
      persist: this.persist,
    }
  }
}

const id = (x: any) => x

// tslint:disable-next-line:no-empty
const unit = async () => {}

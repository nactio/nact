import { IPersistedEvent, IPersistedSnapshot, IPersistenceEngine } from './persistence-engine';
import { SupervisionActions, Actor } from '@nact/core';
import { applyOrThrowIfStopped, addMacrotask } from '@nact/core';
import type { LocalActorSystemRef, LocalActorRef } from '@nact/core';
import type { RequiredChildCapabilities, ActorProps, ActorContext, ActorFunc, RequiredActorSystemCapabilities, ParentTypeFromRefType } from '@nact/core/actor';

const id = (x: any) => x;
type PersistentActorFunc<State, Msg, ParentRef extends LocalActorSystemRef | LocalActorRef<any>> =
  (this: ActorContext<Msg, ParentRef>, state: State, msg: Msg, ctx: PersistentActorContext<Msg, ParentRef>) => State | Promise<State>;

export type PersistentActorProps<State, Msg, ParentRef extends LocalActorSystemRef | LocalActorRef<any>> = {
  snapshotEncoder?: (state: State) => any,
  snapshotDecoder?: (state: any) => State,
  decoder?: (msg: any) => Msg,
  encoder?: (msg: Msg) => any,
  key: string,
  snapshotEvery?: number
} & ActorProps<State, Msg, ParentRef>;

type InferMsgFromFunc<T extends PersistentActorFunc<any, any, any>> = T extends PersistentActorFunc<any, infer Msg, any> ? Msg : never;
type InferStateFromFunc<T extends PersistentActorFunc<any, any, any>> = T extends PersistentActorFunc<infer State, any, any> ? State : never;


class PersistentActor<State, Msg, ParentRef extends LocalActorSystemRef | LocalActorRef<any>, Child extends RequiredChildCapabilities = RequiredChildCapabilities> extends Actor<State, Msg, ParentRef, Child> {
  persistenceEngine: IPersistenceEngine;
  sequenceNumber: number;
  busy: boolean;
  key: string;
  snapshotDecoder: (x: any) => any;
  snapshotEncoder: (x: any) => any;
  decoder: (x: any) => Msg;
  encoder: (x: Msg) => any;
  snapshotEvery: number | undefined;
  messagesToNextSnapshot: number;

  constructor(parent: ParentTypeFromRefType<ParentRef>, system: RequiredActorSystemCapabilities, f: PersistentActorFunc<State, Msg, ParentRef>, persistenceEngine: IPersistenceEngine, { key, snapshotEvery, snapshotEncoder = id, snapshotDecoder = id, encoder = id, decoder = id, ...properties }: PersistentActorProps<State, Msg, ParentRef>) {
    super(parent, system, f as ActorFunc<State, Msg, ParentRef>, properties);
    this.persistenceEngine = persistenceEngine;
    this.sequenceNumber = 0;
    this.busy = true;
    this.key = key;
    this.snapshotDecoder = snapshotDecoder;
    this.messagesToNextSnapshot = snapshotEvery ?? Number.POSITIVE_INFINITY;
    this.snapshotEncoder = snapshotEncoder;
    this.decoder = decoder;
    this.encoder = encoder;
    this.snapshotEvery = snapshotEvery;
    this.immediate = addMacrotask(() => this.recover());
  }

  afterMessage() {
    if (this.snapshotEvery === undefined) {
      return;
    }
    if (this.messagesToNextSnapshot <= 0) {
      const snapshotState = this.snapshotEncoder(this.state);
      this.messagesToNextSnapshot = this.snapshotEvery;
      const sequenceNumber = this.sequenceNumber;
      const key = this.key;
      const snapshot: IPersistedSnapshot = {
        data: snapshotState,
        sequenceNumber,
        key,
        createdAt: Date.now()
      };
      return this.persistenceEngine.takeSnapshot(snapshot).catch(e => console.log('Failed to take snapshot due to error: ', e));
    }
  }

  async handleFaultedRecovery(msg: Msg, error: Error | undefined) {
    const ctx = this.createSupervisionContext();
    const decision = await Promise.resolve(this.onCrash(msg, error, ctx, this.reference));
    switch (decision) {
      case SupervisionActions.stop:
        this.stop();
        return false;
      case SupervisionActions.stopAll:
        [...this.parent.children.values()].forEach(x => x.stop());
        return false;
      case SupervisionActions.resume:
        return true;
      case SupervisionActions.reset:
        console.warn('Resetting during recovery is not a recommended supervision policy');
        this.reset();
        return false;
      case SupervisionActions.resetAll:
        console.warn('Resetting during recovery is not a recommended supervision policy');
        [...this.parent.children.values()].forEach(x => x.reset());
        return false;
      case SupervisionActions.escalate:
      default:
        this.parent.handleFault(msg, error, this.reference as unknown as RequiredChildCapabilities);
        return false;
    }
  }

  async recover() {
    try {
      this.clearTimeout();
      // Create an observable sequence of events
      // Reduce this sequence by passing it into the processor function f
      // Calculate for each message the sequence number
      // Subscribe to the end result and start processing new messages
      let snapshot = await this.persistenceEngine.latestSnapshot(this.key);

      if (snapshot) {
        this.state = this.snapshotDecoder(snapshot.data);
        this.sequenceNumber = snapshot.sequenceNumber;
      }

      let messageCount = 0;
      let sequenceNumber = 0;
      for await (let msg of this.persistenceEngine.events(this.key, this.sequenceNumber)) {
        sequenceNumber = msg.sequenceNumber;
        ++messageCount;
        if (msg.isDeleted) {
          continue;
        } else {
          const decodedMsg = this.decoder(msg.data);
          const context = { ...this.createContext(), recovering: true };
          try {
            // Might not be an async function. Using promise.resolve to force it into that form
            this.state = await Promise.resolve(this.f.call(context, this.state, decodedMsg, context));
          } catch (e) {
            let shouldContinue = await this.handleFaultedRecovery(decodedMsg, e as Error | undefined);
            if (shouldContinue) {
              continue;
            }
          }
        }
      }

      this.sequenceNumber = sequenceNumber;
      if (this.snapshotEvery) {
        this.messagesToNextSnapshot = this.snapshotEvery - messageCount;
      }
      this.afterMessage();
      this.processNext();
    } catch (e) {
      this.handleFault(undefined, e as Error | undefined, undefined);
    }
  }

  reset() {
    this.initializeState();
    this.busy = true;
    this.sequenceNumber = 0;
    [...this.children.values()].forEach(x => x.stop());
    this.immediate = addMacrotask(() => this.recover());
  }

  async persist(msg: Msg, tags = []) {
    --this.messagesToNextSnapshot;
    const persistedEvent: IPersistedEvent = {
      data: this.encoder(msg),
      sequenceNumber: ++this.sequenceNumber,
      key: this.key,
      tags: tags,
      isDeleted: false,
      createdAt: Date.now()
    };
    await (this.persistenceEngine.persist(persistedEvent));
  }

  createContext(): PersistentActorContext<Msg, ParentRef> {
    return { ...super.createContext.apply(this), persist: this.persist.bind(this), recovering: false };
  }
}

export type PersistentActorContext<Msg, ParentRef extends LocalActorRef<any> | LocalActorSystemRef> =
  ActorContext<Msg, ParentRef> & { persist: (msg: Msg) => Promise<void>, recovering: boolean };

export function spawnPersistent<ParentRef extends LocalActorSystemRef | LocalActorRef<any>, Func extends PersistentActorFunc<any, any, ParentRef>>(engine: IPersistenceEngine, parent: ParentRef, f: Func, properties: PersistentActorProps<InferStateFromFunc<Func>, InferMsgFromFunc<Func>, ParentRef>) {
  return applyOrThrowIfStopped(
    parent,
    p => (new PersistentActor(p, p.system, f, engine, properties)).reference
  );
}

import assert from 'assert'
import { boundMethod } from 'autobind-decorator'
import { randomBytes } from 'crypto'
import { Extension } from '../Extension'
import { stop } from '../functions'
import { ActorSystemReference, ActorReference, TemporaryReference, ConcreteReference, isActorReference, isTemporaryReference } from '../References'
import { ActorPath } from '../ActorPath'
import { Deferral } from './Deferral';
import { TemporaryActor } from './TemporaryActor';
import { SystemRegistry } from './ActorSystemRegistry';
import { Actor } from './Actor';

const toBase36 = (x: number) => x.toString(36)
const generateSystemId = () => {
  const random = new Array(4)
    .fill(0)
    .map(_ => randomBytes(4).readUInt32BE(0))
    .map(toBase36)
  return random.join('-')
}


export class ActorSystem {
  public readonly type = 'system';
  public readonly name: string
  public readonly path: ActorPath
  public readonly reference: ActorSystemReference
  public readonly system: ActorSystem = this
  public readonly children: Map<string, Actor<unknown, never, unknown>> = new Map()
  public createLogger: (reference: ActorReference<unknown>) => Console
  public stopped: boolean = false
  private readonly childReferences: Map<string, ActorReference<unknown>> = new Map()
  private readonly tempReferences: Map<number,  Deferral<unknown>> = new Map()

  constructor(
    head?: Extension | string,
    ...tail: Extension[]
  ) {
    switch (typeof head) {
      case 'string':
        this.name = head
        break
      default:
        this.name = generateSystemId()
        break
    }
    this.createLogger = () => console
    this.path = ActorPath.root(this)
    this.reference = new ActorSystemReference(this.name, this.path)
    SystemRegistry.add(this)

    if (typeof head === 'function') {
      ([head, ...tail] as Extension[]).forEach(extension => extension(this))
    } else {
      tail.forEach(extension => extension(this))
    }
  }

  @boundMethod
  public addTempReference(reference: TemporaryReference<unknown>, deferral: Deferral<unknown>) {
    this.tempReferences.set(reference.id, deferral)
  }

  @boundMethod
  public removeTempReference(reference: TemporaryReference<unknown>) {
    this.tempReferences.delete(reference.id)
  }

  @boundMethod
  public find(actorRef: ConcreteReference<unknown>) {
    if(isActorReference(actorRef)) {
        const parts = actorRef.path.parts;        
        return parts.reduce(
            (parent, current) => parent && parent.children.get(current),
            this as Actor<unknown, unknown, unknown> | undefined | ActorSystem
        );
    }
    if (isTemporaryReference(actorRef)) {
        const id = actorRef.id;
        const actor: Deferral<unknown> | undefined = this.tempReferences.get(id) as Deferral<unknown> | undefined;
        return (actor && new TemporaryActor(actor.resolve));        
    }  
    return this;
  }

  @boundMethod
  public childStopped<T extends Actor<unknown, never, unknown>>(child: T) {
    this.children.delete(child.name)
    this.childReferences.delete(child.name)
  }

  @boundMethod
  public childSpawned<T extends Actor<unknown, never, unknown>>(child: T) {
    this.childReferences.set(child.name, child.reference)
    this.children.set(child.name, child as Actor<unknown, never, unknown>)
  }

  @boundMethod
  public stop() {
    this.childReferences.forEach(stop)
    this.stopped = true
    SystemRegistry.remove(this.name)
  }

  @boundMethod
  public assertNotStopped() {
    assert(!this.stopped)
    return true
  }

  @boundMethod
  public handleFault(
    child?: Actor<unknown, never, unknown>,
  ) {
    if (child) {
      // tslint:disable-next-line: no-console
      console.error(`Stopping top level actor, ${child.name} due to a fault`)
      child.stop()
    }
  }

  @boundMethod
  public reset() {
    throw new Error('Method not implemented.')
  }
}


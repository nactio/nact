import assert from 'assert'
import { boundMethod } from 'autobind-decorator'
import { randomBytes } from 'crypto'

import { Actor, ActorLike, ActorName, Deferral, SystemRegistry, Temporary } from '.'
import { Extension } from '../Extension'
import { stop } from '../functions'
import { ActorPath } from '../paths'
import {
  ActorRef,
  ActorReference,
  ActorReferenceType,
  ActorSystemReference,
  TemporaryReference,
  TemporaryReferenceId,
} from '../references'

const toBase36 = (x: number) => x.toString(36)
const generateSystemId = () => {
  const random = new Array(4)
    .fill(0)
    .map(_ => randomBytes(4).readUInt32BE(0))
    .map(toBase36)
  return random.join('-')
}

export class ActorSystem implements ActorLike<any> {
  public readonly name: ActorSystemName
  public readonly path: ActorPath
  public readonly reference: ActorSystemReference
  public readonly system: ActorSystem = this
  public readonly children: Map<ActorName, Actor> = new Map()
  public createLogger: (reference: ActorRef) => Console
  public stopped: boolean = false
  private readonly childReferences: Map<ActorName, ActorRef> = new Map()
  private readonly tempReferences: Map<
    TemporaryReferenceId,
    Deferral
  > = new Map()

  constructor(
    head?: Extension | ActorSystemName | { name: ActorSystemName },
    ...tail: Extension[]
  ) {
    switch (typeof head) {
      case 'string':
        this.name = head
        break
      case 'object':
        this.name = head.name
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
  public addTempReference(reference: TemporaryReference, deferral: Deferral) {
    this.tempReferences.set(reference.id, deferral)
  }

  @boundMethod
  public removeTempReference(reference: TemporaryReference) {
    this.tempReferences.delete(reference.id)
  }

  @boundMethod
  public find(actorRef?: ActorRef): ActorLike | undefined {
    switch (actorRef && actorRef.type) {
      case ActorReferenceType.actor: {
        const {
          path: { parts },
        } = actorRef as ActorReference
        return parts.reduce(
          (parent: ActorLike | undefined, current: ActorName) =>
            parent && parent.children.get(current),
          this as ActorLike | undefined,
        )
      }
      case ActorReferenceType.temp: {
        const { id, name } = actorRef as TemporaryReference
        const actor = this.tempReferences.get(id)
        return actor && actor.resolve && new Temporary(name, actor.resolve)
      }
      case ActorReferenceType.system:
        return this
      default:
        return undefined
    }
  }

  @boundMethod
  public childStopped(child: Actor) {
    this.children.delete(child.name)
    this.childReferences.delete(child.name)
  }

  @boundMethod
  public childSpawned(child: Actor) {
    this.childReferences.set(child.name, child.reference)
    this.children.set(child.name, child)
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
  public handleFault<T extends Actor>(
    msg: unknown,
    sender: ActorRef,
    error: Error,
    child?: T,
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

export type ActorSystemName = ActorName

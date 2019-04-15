import { boundMethod } from 'autobind-decorator'

import { Actor, ActorLike, ActorName, ActorSystem } from '.'
import { ActorPath } from '../paths'
import { ActorRef } from '../references'

export class Temporary<MSG> implements ActorLike<MSG> {
  public readonly path: ActorPath = undefined!
  public readonly children: Map<ActorName, Actor> = undefined!
  public readonly reference: ActorRef = undefined!
  public readonly system: ActorSystem = undefined!

  constructor(
    public readonly name: ActorName,
    // tslint:disable-next-line: no-shadowed-variable
    public readonly dispatch: (message: MSG) => void,
  ) {}

  @boundMethod
  public assertNotStopped(): boolean {
    throw new Error('Method not implemented.')
  }

  @boundMethod
  public stop(): void {
    throw new Error('Method not implemented.')
  }

  @boundMethod
  public childStopped(child: Actor): void {
    throw new Error('Method not implemented.')
  }

  @boundMethod
  public childSpawned(child: Actor) {
    throw new Error('Method not implemented.')
  }

  @boundMethod
  public handleFault(msg: unknown, sender: ActorRef, error: Error) {
    throw new Error('Method not implemented.')
  }

  @boundMethod
  public reset(): void {
    throw new Error('Method not implemented.')
  }
  
  public get stopped(): boolean {
    return false
  }
}

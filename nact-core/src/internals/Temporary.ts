import { boundMethod } from 'autobind-decorator'

import { ActorLike } from './ActorLike'
import { ActorPath } from '../paths'
import { ActorRef } from '../references'

export class Temporary<Msg> implements ActorLike<Msg> {
  public readonly path: ActorPath = undefined!
  public readonly children: Map<ActorName, Actor> = undefined!
  public readonly reference: ActorRef = undefined!
  public readonly system: ActorSystem = undefined!

  constructor(
    public readonly name: string,
    // tslint:disable-next-line: no-shadowed-variable
    public readonly dispatch: (message: Msg) => void,
  ) {}

  @boundMethod
  public assertNotStopped(): boolean {
    throw new Error('Method not implemented.')
  }

  @boundMethod
  public stop(): void {
    throw new Error('Method not implemented.')
  }

  
  public get stopped(): boolean {
    return false
  }
}

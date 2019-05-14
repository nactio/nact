import assert from 'assert'
import { boundMethod } from 'autobind-decorator'
import Queue from 'denque'
import { ActorPath } from '../ActorPath';
import { ActorReference, TemporaryReference, Reference, ActorSystemReference, isSystemReference } from '../References';
import { ActorSystem } from './ActorSystem';
import { Deferral } from './Deferral';
import { SupervisionActions, SupervisionContext, SupervisionPolicy, defaultSupervisionPolicy } from '../Supervision';
import { Context } from '../Context';
import { StatefulActorConfig } from '../ActorConfig';
import { SystemRegistry } from './ActorSystemRegistry';


export function stop<Msg>(actor: ActorReference<Msg> | ActorSystemReference) {
  const concreteActor = SystemRegistry.find(actor.systemName, actor);
  if (concreteActor) {
    concreteActor.stop()
  }
};

export function isSystemActor<ParentMsg>(actor: Actor<ParentMsg, unknown, unknown> | ActorSystem): actor is ActorSystem {  
  return actor.type == 'system';
}


export class Actor<Msg, ParentMsg, State> {
  public readonly type = 'actor';
  public static getSafeTimeout(timeoutDuration: number = 0) {
    const MAX_TIMEOUT = 2147483647
    return Math.min(MAX_TIMEOUT, timeoutDuration)
  }

  public static getName(name: string | undefined) {
    return name || `anonymous-${Math.abs(Math.random() * Number.MAX_SAFE_INTEGER) | 0}`;
  }

  public readonly name: string
  public readonly children: Map<string, Actor<unknown, Msg, unknown>> = new Map()
  public readonly childReferences: Map<string, ActorReference<unknown>> = new Map()
  public busy: boolean = false
  public readonly path: ActorPath
  public readonly reference: ActorReference<Msg>
  public stopped: boolean = false
  protected readonly log: Console
  protected readonly shutdownPeriod: number
  protected readonly onCrash: SupervisionPolicy<Msg, ParentMsg>
  protected readonly mailbox: Queue<Msg> = new Queue()
  protected immediate: any = undefined
  protected state: State
  protected timeout?: any
  
  constructor(
    public readonly parent: Actor<ParentMsg, unknown, unknown> | ActorSystem,
    name: string | undefined,
    public readonly system: ActorSystem,
    protected readonly f: MessageHandlerFunc<Msg, ParentMsg, State>,
    protected readonly config: StatefulActorConfig<Msg, ParentMsg, State> = {}
  ) {
    this.name = Actor.getName(name);
    if (parent.children.has(this.name)) {
      throw new Error(`child actor of name ${this.name} already exists`)
    }

    this.path = parent.path.createChildPath(this.name)
    this.reference = new ActorReference(
      this.system.name,
      this.parent.reference,
      this.path,
      this.name,
    )    
    this.log = this.system.createLogger(this.reference)        
    if (this.parent) {
      if (isSystemActor(this.parent)) {
        this.parent.childStopped(this as Actor<unknown, never, unknown>);
      } else {
        this.parent.childStopped(this as Actor<unknown, ParentMsg, unknown>);
      }
    }
    this.onCrash = config.onCrash || defaultSupervisionPolicy

    if (config.shutdownAfter) {
      if (typeof config.shutdownAfter !== 'number') {
        throw new Error(
          'Shutdown should be specified as a number in milliseconds',
        )
      }
      this.shutdownPeriod = Actor.getSafeTimeout(config.shutdownAfter)
    } else {
      this.shutdownPeriod = 0
      this.setTimeout = unit
    }

    this.state = this.initializeState()
    this.setTimeout()
  }

  @boundMethod
  public query<Response>(message: (tempReference: Reference<Response>) => Msg, timeout: number): Promise<Response> {
    this.assertNotStopped()
    assert(timeout !== undefined && timeout !== null)
    const defered = new Deferral<Response>()

    const timeoutHandle = setTimeout(() => {
      defered.reject(new Error('Query Timeout'))
    }, Actor.getSafeTimeout(timeout))

    const tempReference = new TemporaryReference(this.system.name)
    this.system.addTempReference(tempReference, defered as Deferral<unknown>)

    defered.promise
      .then(() => {
        clearTimeout(timeoutHandle)
        this.system.removeTempReference(tempReference)
      })
      .catch(() => {
        this.system.removeTempReference(tempReference)
      })
    
      this.dispatch(message(tempReference));
      return defered.promise
  }

  @boundMethod
  public dispatch(message: Msg) {
    this.assertNotStopped()
    this.clearTimeout()
    if (!this.busy) {
      this.handleMessage(message)
    } else {
      this.mailbox.push(message)
    }
  }
    

  @boundMethod
  public childStopped<T extends Actor<unknown, Msg, unknown>>(child: T) {
    this.children.delete(child.name)
    this.childReferences.delete(child.name)
  }

  @boundMethod
  public childSpawned<T extends Actor<unknown, Msg, unknown>>(child: T) {
    this.children.set(child.name, child)
    this.childReferences.set(child.name, child.reference)
  }

  @boundMethod
  public stop() {
    this.clearImmediate()
    this.clearTimeout()
    if (this.parent) {
      if(isSystemActor(this.parent)) {
        this.parent.childStopped(this as Actor<unknown, never, unknown>);
      } else {
        this.parent.childStopped(this as Actor<unknown, ParentMsg, unknown>);
      }      
    }
    // delete this.parent
    this.childReferences.forEach(stop)
    this.stopped = true
  }

  @boundMethod
  public assertNotStopped() {
    assert(!this.stopped)
    return true
  }

  @boundMethod
  public async handleFault(msg: Msg | undefined, error: Error) {
    const ctx = this.createSupervisionContext()
    const decision = await Promise.resolve(this.onCrash(msg, error, ctx))
    switch (decision) {
      case SupervisionActions.stop:
        this.stop()
        break
      case SupervisionActions.stopAll:
        this.parent.children.forEach(x => x.stop())
        break
      case SupervisionActions.resume:
        this.resume()
        break
      case SupervisionActions.reset:
        this.reset()
        break
      case SupervisionActions.resetAll:
        this.parent.children.forEach(x => x.reset())
        break
      case SupervisionActions.escalate:
      default:
        this.parent.handleFault(undefined, error)
        break
    }
  }

  @boundMethod
  public reset() {
    this.children.forEach(x => x.stop())
    this.initializeState()
    this.resume()
  }

  protected initializeState(): State {
    const { initialState, initialStateFunc } = this.config
    if (initialStateFunc) {
      try {
        this.state = initialStateFunc(this.createContext())
      } catch (e) {
        this.handleFault(undefined!, e)
      }
    } else {
      this.state = initialState!
    }

    return this.state
  }

  protected setTimeout() {
    this.timeout = setTimeout(() => this.stop(), this.shutdownPeriod || 0)
  }

  protected clearTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
  }

  protected clearImmediate() {
    clearImmediate(this.immediate)
  }

  protected afterMessage() {
    //
  }

  protected processNext() {
    if (!this.stopped) {
      const nextMsg = this.mailbox.shift()
      if (nextMsg) {
        this.handleMessage(nextMsg)
      } else {
        this.busy = false
        // Counter is now ticking until actor is killed
        this.setTimeout()
      }
    }
  }

  protected resume() {
    this.processNext()
  }

  protected createSupervisionContext(): SupervisionContext<Msg, ParentMsg> {
    const ctx = this.createContext()
    return { ...ctx, ...SupervisionActions }
  }

  protected createContext(): Context<Msg, ParentMsg> {
    return {
      children: new Map(this.childReferences),
      log: this.log,
      name: this.name,
      parent: this.parent.reference,
      path: this.path,
      self: this.reference
    }
  }

  protected handleMessage(message: Msg) {
    this.busy = true
    this.immediate = setImmediate(async () => {
      try {
        const ctx = this.createContext()
        const next = await Promise.resolve(
          this.f.call(ctx, this.state, message, ctx),
        )
        this.state = next
        this.afterMessage()
        this.processNext()
      } catch (e) {
        this.handleFault(message, e)
      }
    })
  }
}

const unit: () => void = () => {
  // no-op
}

export type MessageHandlerFunc<Msg, ParentMsg, State> = (
  state: State,
  msg: Msg,
  ctx: Context<Msg, ParentMsg>
) => State

export type StatelessActorMessageHandlerFunc<Msg, ParentMsg> = (
  msg: Msg,
  ctx: Context<Msg, ParentMsg>,
) => void


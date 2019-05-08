import assert from 'assert'
import { boundMethod } from 'autobind-decorator'
import Queue from 'denque'
import { ActorPath } from '../ActorPath';
import { ActorReference } from '../References';
import { ActorLike, SupervisedActorLike } from './ActorLike';
import { ActorSystem } from './ActorSystem';
import { Deferral } from './Deferral';
import { TemporaryReference } from './TemporaryReference';
import { SupervisionActions, SupervisionContext, SupervisionPolicy, defaultSupervisionPolicy } from '../Supervision';
import { Context } from '../Context';
import { stop } from '../functions';
import { StatefulActorConfig } from '../ActorConfig';

export class Actor<Msg, ParentMsg, State> implements SupervisedActorLike<Msg> {
  public static getSafeTimeout(timeoutDuration: number = 0) {
    const MAX_TIMEOUT = 2147483647
    return Math.min(MAX_TIMEOUT, timeoutDuration)
  }

  public static getName(name: string | undefined) {
    return name || `anonymous-${Math.abs(Math.random() * Number.MAX_SAFE_INTEGER) | 0}`;
  }

  public readonly name: string
  public readonly children: Map<ActorName, SupervisedActorLike<unknown>> = new Map()
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
    public readonly parent: ActorLike<ParentMsg>,
    name: ActorName | undefined,
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
    this.parent.childSpawned(this);
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
  public query<Response = any>(message: (tempReference: TemporaryReference<Response>) => Msg, timeout: number): Promise<Response> {
    this.assertNotStopped()
    assert(timeout !== undefined && timeout !== null)
    const defered = new Deferral<Response>()

    const timeoutHandle = setTimeout(() => {
      defered.reject(new Error('Query Timeout'))
    }, Actor.getSafeTimeout(timeout))

    const tempReference = new TemporaryReference(this.system.name)
    this.system.addTempReference(tempReference, defered)

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
  public childStopped(child: SupervisedActorLike<unknown>) {
    this.children.delete(child.name)
    this.childReferences.delete(child.name)
  }

  @boundMethod
  public childSpawned(child: SupervisedActorLike<unknown>) {
    this.children.set(child.name, child)
    this.childReferences.set(child.name, child.reference)
  }

  @boundMethod
  public stop() {
    this.clearImmediate()
    this.clearTimeout()
    if (this.parent) {
      this.parent.childStopped(this)
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
        this.parent.handleFault(msg, error, this)
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

const unit = () => {
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

export type ActorName = string
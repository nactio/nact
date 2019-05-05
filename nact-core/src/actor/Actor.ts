import assert from 'assert'
import { boundMethod } from 'autobind-decorator'
import Queue from 'denque'

import { stop } from '../functions'
import { ActorPath } from '../paths/ActorPath'
import { ActorRef } from '../references/ActorRef'
import { ActorReference } from '../references/ActorReference'
import { Nobody } from '../references/Nobody'
import { TemporaryReference } from '../references/TemporaryReference'
import { SupervisionActions } from '../supervision/SupervisionActions'
import { SupervisionContext } from '../supervision/SupervisionContext'
import { defaultSupervisionPolicy, SupervisionPolicy } from '../supervision/SupervisionPolicy'
import { StatefulActorConfig } from './ActorConfig'
import { ActorLike } from './ActorLike'
import { ActorSystem } from './ActorSystem'
import { Context } from './Context'
import { Deferral } from './Deferral'

export class Actor<MSG = any, ST = any> implements ActorLike<MSG> {
  public static getSafeTimeout(timeoutDuration: number = 0) {
    const MAX_TIMEOUT = 2147483647
    return Math.min(MAX_TIMEOUT, timeoutDuration)
  }

  public readonly name: ActorName
  public readonly children: Map<ActorName, Actor> = new Map()
  public readonly childReferences: Map<ActorName, ActorRef> = new Map()
  public busy: boolean = false
  public readonly path: ActorPath
  public readonly reference: ActorReference<MSG>
  public stopped: boolean = false
  protected readonly log: Console
  protected readonly shutdownPeriod: number
  protected readonly onCrash: SupervisionPolicy<MSG>
  protected readonly mailbox: Queue<MailBoxItem<MSG>> = new Queue()
  protected immediate: any = undefined
  protected state: ST
  protected timeout?: any

  constructor(
    public readonly parent: ActorLike,
    name: ActorName | undefined,
    public readonly system: ActorSystem,
    protected readonly f: MessageHandlerFunc<MSG, ST>,
    protected readonly config: StatefulActorConfig<MSG, ST> = {}
  ) {
    this.name =
      name ||
      // tslint:disable-next-line:no-bitwise
      `anonymous-${Math.abs(Math.random() * Number.MAX_SAFE_INTEGER) | 0}`
    
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
    this.parent.childSpawned(this)
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
  public query<RESP = any>(message: MSG, timeout: number): Promise<RESP> {
    this.assertNotStopped()
    assert(timeout !== undefined && timeout !== null)
    const defered = new Deferral<RESP>()

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

    if (typeof message === 'function') {
      this.dispatch(message(tempReference), tempReference)
    } else {
      this.dispatch(message, tempReference)
    }

    return defered.promise
  }

  @boundMethod
  public dispatch(message: MSG, sender: ActorRef = Nobody) {
    this.assertNotStopped()
    this.clearTimeout()
    if (!this.busy) {
      this.handleMessage(message, sender)
    } else {
      this.mailbox.push({ message, sender })
    }
  }

  @boundMethod
  public childStopped(child: Actor) {
    this.children.delete(child.name)
    this.childReferences.delete(child.name)
  }

  @boundMethod
  public childSpawned(child: Actor) {
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
  public async handleFault(msg: MSG, sender: ActorRef = Nobody, error: Error) {
    const ctx = this.createSupervisionContext(msg, sender, error)
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
        this.parent.handleFault(msg, sender, error, this)
        break
    }
  }

  @boundMethod
  public reset() {
    this.children.forEach(x => x.stop())
    this.initializeState()
    this.resume()
  }

  protected initializeState(): ST {
    const { initialState, initialStateFunc } = this.config
    if (initialStateFunc) {
      try {
        this.state = initialStateFunc(this.createContext())
      } catch (e) {
        this.handleFault(undefined!, Nobody, e)
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
        this.handleMessage(nextMsg.message, nextMsg.sender)
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

  protected createSupervisionContext(
    msg: MSG,
    sender: ActorRef,
    error: Error,
  ): SupervisionContext {
    const ctx = this.createContext(sender)
    return { ...ctx, ...SupervisionActions }
  }

  protected createContext(sender: ActorRef = Nobody): Context {
    return {
      children: new Map(this.childReferences),
      log: this.log,
      name: this.name,
      parent: this.parent.reference,
      path: this.path,
      self: this.reference,
      sender,
    }
  }

  protected handleMessage(message: MSG, sender: ActorRef) {
    this.busy = true
    this.immediate = setImmediate(async () => {
      try {
        const ctx = this.createContext(sender)
        const next = await Promise.resolve(
          this.f.call(ctx, this.state, message, ctx),
        )
        this.state = next
        this.afterMessage()
        this.processNext()
      } catch (e) {
        this.handleFault(message, sender, e)
      }
    })
  }
}

const unit = () => {
  // no-op
}

export type MessageHandlerFunc<MSG = any, ST = any> = (
  state: ST,
  msg: MSG,
  ctx: Context,
) => ST

export type StatelessActorMessageHandlerFunc<MSG> = (
  msg: MSG,
  ctx: Context,
) => void

export type ActorName = string

export interface MailBoxItem<MSG> {
  message: MSG
  sender: ActorRef
}

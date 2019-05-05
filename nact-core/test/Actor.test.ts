import { Actor, ActorLike, Context, SystemRegistry } from '../src/actor'
import {
  dispatch,
  query,
  spawn,
  spawnStateless,
  start,
  stop,
} from '../src/functions'
import { ActorRef, ActorSystemReference } from '../src/references'
import { SupervisionContext } from '../src/supervision'
import { Time } from '../src/Time'

const { applyOrThrowIfStopped } = SystemRegistry

const delay = (duration: number) =>
  new Promise((resolve, reject) => setTimeout(() => resolve(), duration))

const spawnChildrenEchoer = (parent: ActorRef, name?: string) =>
  spawnStateless(
    parent,
    function(this: Context, msg) {
      dispatch(this.sender, [...this.children.keys()], this.self)
    },
    name,
  )

const isStopped = (reference: ActorRef) => {
  try {
    return applyOrThrowIfStopped(reference, (ref: ActorLike) => {
      return ref.stopped
    })
  } catch (e) {
    return true
  }
}

const children = (reference: ActorRef) => {
  try {
    return applyOrThrowIfStopped(reference, (ref: ActorLike) => {
      return new Map((ref as Actor).childReferences)
    })
  } catch (e) {
    return new Map()
  }
}

const ignore = () => {
  //
}

const retry = async (
  assertion: () => unknown,
  remainingAttempts: number,
  retryInterval = 0,
) => {
  if (remainingAttempts <= 1) {
    return assertion()
  } else {
    try {
      await Promise.resolve(assertion())
    } catch (e) {
      await delay(retryInterval)
      await retry(assertion, remainingAttempts - 1, retryInterval)
    }
  }
}

describe('Actor', () => {
  beforeEach(() => {
    // tslint:disable-next-line:no-console
    console.error = () => {
      //
    }
  })

  afterEach(() => {
    // tslint:disable-next-line:no-console
    delete console.error
  })

  describe('actor-function', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => {
      stop(system)

      // reset console
      // tslint:disable-next-line:no-console
      delete console.error
    })

    it('allows promises to resolve inside actor', async () => {
      const getMockValue = () => Promise.resolve(2)
      const child = spawn(system, async function(
        this: Context,
        state = {},
        msg,
      ) {
        // tslint:disable-next-line:no-shadowed-variable
        const result = await getMockValue()
        dispatch(this.sender, result, this.self)
        return state
      })

      const result = await query(child, {}, 30)
      expect(result).toBe(2)
    })

    it('allows stateful behaviour', async () => {
      const actor = spawn(system, function(
        this: Context,
        state: string = '',
        msg,
      ) {
        if (msg.type === 'query') {
          dispatch(this.sender, state, this.self)
          return state
        } else if (msg.type === 'append') {
          return state + msg.payload
        }
      })

      dispatch(actor, { payload: 'Hello ', type: 'append' })
      dispatch(actor, { payload: 'World. ', type: 'append' })
      dispatch(actor, { payload: 'The time has come!!', type: 'append' })
      const result = await query(actor, { type: 'query' }, 30)
      expect(result).toBe('Hello World. The time has come!!')
    })

    it('allows an initial state to be specified', async () => {
      const actor = spawn(
        system,
        function(this: Context, state: string, msg: any): string {
          if (msg.type === 'query') {
            dispatch(this.sender, state, this.self)
            return state
          } else if (msg.type === 'append') {
            return state + msg.payload
          } else {
            return state
          }
        },
        'test',
        { initialState: 'A joyous ' },
      )

      dispatch(actor, { payload: 'Hello ', type: 'append' })
      dispatch(actor, { payload: 'World. ', type: 'append' })
      dispatch(actor, { payload: 'The time has come!!', type: 'append' })
      const result = await query(actor, { type: 'query' }, 30)
      expect(result).toBe('A joyous Hello World. The time has come!!')
    })

    it('allows an initial state function to be specified', async () => {
      const actor = spawn(
        system,
        (state: string, msg: any, ctx) => {
          if (msg.type === 'query') {
            dispatch(ctx.sender, state, ctx.self)
            return state
          } else if (msg.type === 'append') {
            return state + msg.payload
          } else {
            return state
          }
        },
        'Nact',
        {
          initialStateFunc: (ctx: Context) =>
            `Hello ${ctx.name}! Is today not a joyous occasion?`,
        },
      )

      dispatch(actor, { payload: ' It is indeed', type: 'append' })
      const result = await query(actor, { type: 'query' }, 30)
      expect(result).toBe(
        'Hello Nact! Is today not a joyous occasion? It is indeed',
      )
    })

    it('correctly handles an initial state function which throws an error', async () => {
      let handled = false
      const actor = spawn(
        system,
        (state: string, msg: any, ctx) => {
          if (msg.type === 'query') {
            dispatch(ctx.sender, state, ctx.self)
            return state
          } else if (msg.type === 'append') {
            return state + msg.payload
          } else {
            return state
          }
        },
        'Nact',
        {
          initialStateFunc: (ctx: Context) => {
            throw new Error('A bad moon is on the rise')
          },
          onCrash: (_, __, ctx) => {
            handled = true
            return ctx.stop
          },
        },
      )
      await retry(() => expect(isStopped(actor)).toBe(true), 12, 10)
      expect(handled).toBe(true)
    })

    it('evalutes in order when returning a promise from a stateful actor function', async () => {
      const child = spawn(
        system,
        async (state = {}, msg: any) => {
          if (msg.number === 2) {
            await delay(30)
          }
          dispatch(msg.listener, { number: msg.number })
          return state
        },
        'testActor',
      )

      const listener = spawn(
        system,
        async (state: any = [], msg: any, ctx: Context) => {
          if (msg.number) {
            return [...state, msg.number]
          } else {
            dispatch(ctx.sender, state)
          }
          return state
        },
        'listener',
      )

      dispatch(child, { listener, number: 1 })
      dispatch(child, { listener, number: 2 })
      dispatch(child, { listener, number: 3 })
      await retry(
        async () => expect(await query(listener, {}, 30)).toEqual([1, 2, 3]),
        5,
        10,
      )
    })

    it('should not automatically stop if error is thrown and actor is stateless', async () => {
      // tslint:disable-next-line:no-console
      console.error = ignore
      const child = spawnStateless(system, msg => {
        throw new Error('testError')
      })
      dispatch(child, undefined!)
      await delay(50)
      expect(isStopped(child)).not.toBe(true)
    })

    it('should automatically stop if error is thrown', async () => {
      // tslint:disable-next-line:no-console
      console.error = ignore
      const child = spawn(system, msg => {
        throw new Error('testError')
      })
      dispatch(child, undefined!)
      await retry(() => expect(isStopped(child)).toBe(true), 12, 10)
    })

    it('should automatically stop if error is thrown and no supervision policy is specified on the parent', async () => {
      // tslint:disable-next-line:no-console
      console.error = ignore
      const parent = spawn(system, (state = true, msg) => {
        return state
      })
      const child = spawn(parent, msg => {
        throw new Error('testError')
      })
      dispatch(child, undefined)
      await retry(() => expect(isStopped(child)).toBe(true), 12, 10)
    })

    it('should automatically stop if rejected promise is thrown', async () => {
      // tslint:disable-next-line:no-console
      console.error = ignore
      const child = spawn(system, (state = {}, msg) =>
        Promise.reject(new Error('testError')),
      )
      dispatch(child, {})
      await retry(() => expect(isStopped(child)).toBe(true), 12, 10)
    })
  })

  describe('shutdownAfter', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => {
      stop(system)
      // reset console
      // tslint:disable-next-line:no-console
      delete console.error
    })

    it('should automatically stop after timeout if timeout is specified', async () => {
      // tslint:disable-next-line:no-console
      console.error = ignore
      const child = spawnStateless(
        system,
        msg => {
          //
        },
        'test',
        {
          shutdownAfter: 100 * Time.milliseconds,
        },
      )
      await delay(110)
      expect(isStopped(child)).toBe(true)
    })

    it('should automatically renew timeout after message', async () => {
      const child = spawnStateless(system, ignore, 'test1', {
        shutdownAfter: 60 * Time.milliseconds,
      })
      await delay(30)
      dispatch(child, {})
      await delay(40)
      expect(isStopped(child)).not.toBe(true)
    })

    it('should throw if timeout is not a number', async () => {
      expect(() =>
        spawnStateless(system, ignore, 'test1', { shutdownAfter: {} as any }),
      ).toThrow(Error)
    })
  })

  describe('#stop()', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => {
      stop(system)
      // reset console
      // tslint:disable-next-line:no-console
      delete console.error
    })

    it('should prevent children from being spawned after being called', () => {
      const child = spawnStateless(system, ignore)
      stop(child)
      expect(() => spawnStateless(child, ignore)).toThrow(Error)
      expect(() => spawnStateless(child, () => ignore)).toThrow(Error)
    })

    it('should not process any more messages after being stopped', async () => {
      const child = spawn(system, async (state = {}, msg, ctx) => {
        if (msg === 1) {
          await delay(20)
        } else {
          dispatch(ctx.sender, msg)
        }
        return state
      })
      dispatch(child, 1)
      const resultPromise = query(child, 2, 100)
      await delay(20)
      stop(child)
      return expect(resultPromise).rejects.toBeInstanceOf(Error)
    })

    it('stops children when parent is stopped', async () => {
      const actor = spawnChildrenEchoer(system)
      const child1 = spawnChildrenEchoer(actor, 'child1')
      const child2 = spawnChildrenEchoer(actor, 'child2')
      const grandchild1 = spawnStateless(child1, ignore, 'grandchild1')
      const grandchild2 = spawnStateless(child1, ignore, 'grandchild2')

      stop(child1)
      expect(isStopped(child1)).toBe(true)
      expect(isStopped(grandchild1)).toBe(true)
      expect(isStopped(grandchild2)).toBe(true)

      stop(system)
      expect(children(system).size).toBe(0)
      expect(isStopped(actor)).toBe(true)
      expect(isStopped(child2)).toBe(true)
    })

    it('should be able to be invoked multiple times', async () => {
      const child = spawn(system, ignore)
      stop(child)
      await retry(() => expect(isStopped(child)).toBe(true), 12, 10)
      stop(child)
      expect(isStopped(child)).toBe(true)
    })

    it('should ignore subsequent dispatches', async () => {
      const child = spawnStateless(system, () => {
        throw new Error('Should not be triggered')
      })
      stop(child)
      await retry(() => expect(isStopped(child)).toBe(true), 12, 10)
      dispatch(child, 'test')
    })
  })

  describe('#spawn()', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => {
      stop(system)
      // reset console
      // tslint:disable-next-line:no-console
      delete console.error
    })

    it('automatically names an actor if a name is not provided', async () => {
      const child = spawnStateless(system, msg => msg)
      expect(children(system).size).toBe(1)
      expect(child.name).toBeDefined()
    })

    it('should prevent a child with the same name from being spawned', () => {
      const child = spawnStateless(system, ignore)
      spawnStateless(child, ignore, 'grandchild')
      expect(() => spawnStateless(child, ignore, 'grandchild')).toThrow(Error)
    })

    it('correctly registers children upon startup', async () => {
      const child = spawnChildrenEchoer(system, 'testChildActor')
      expect(children(system).has('testChildActor')).toBe(true)
      let childReferences: string[] = await query(child, {}, 30)
      expect(childReferences.length).toBe(0)

      spawnStateless(child, ignore, 'testGrandchildActor')
      expect(children(child).has('testGrandchildActor')).toBe(true)
      childReferences = await query(child, {}, 30)
      expect(childReferences).toContainEqual('testGrandchildActor')

      spawnStateless(child, ignore, 'testGrandchildActor2')
      childReferences = await query(child, {}, 30)
      const childrenM = children(child)
      expect(childrenM.has('testGrandchildActor2')).toBe(true)
      expect(childrenM.has('testGrandchildActor')).toBe(true)
      expect(childReferences).toContainEqual('testGrandchildActor2')
      expect(childReferences).toContainEqual('testGrandchildActor')
    })

    it('can be invoked from within actor', async () => {
      const actor = spawnStateless(
        system,
        function(this: Context, msg) {
          if (msg === 'spawn') {
            spawnStateless(this.self, ignore, 'child1')
            spawn(this.self, ignore, 'child2')
          } else {
            dispatch(this.sender, [...this.children.keys()], this.self)
          }
        },
        'test',
      )
      dispatch(actor, 'spawn')
      const childrenMap = await query<string[]>(actor, 'query', 30)
      expect(childrenMap).toContainEqual('child1')
      expect(childrenMap).toContainEqual('child2')
      const childrenM = children(actor)
      expect(childrenM.has('child1')).toBe(true)
    })
  })

  describe('#query()', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => stop(system))

    it('should throw if a timeout is not provided', async () => {
      const actor = spawnStateless(system, ignore)
      expect(() => query(actor, {}, undefined!)).toThrow(
        'A timeout is required to be specified',
      )
    })

    it('should reject a promise if actor has already stopped', async () => {
      const actor = spawnStateless(system, ignore)
      stop(actor)

      await delay(5)
      expect.assertions(1)
      try {
        await query(actor, {}, 30)
      } catch (e) {
        expect(e).toEqual(
          Error('Actor stopped or never existed. Query can never resolve'),
        )
      }
    })

    it("should reject a promise if the actor hasn't responded with the given timespan", async () => {
      const actor = spawnStateless(
        system,
        async (msg, ctx) => {
          await delay(10)
          dispatch(ctx.sender, 'done', ctx.self)
        },
        'test',
      )
      try {
        await query(actor, 'test', 1)
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })

    it('should resolve the promise if the actor has responded with the given timespan, clearing the timeout', async () => {
      const actor = spawnStateless(
        system,
        async (msg, ctx) => {
          await delay(10)
          dispatch(ctx.sender, 'done', ctx.self)
        },
        'test',
      )
      expect(await query(actor, 'test', 50)).toBe('done')
    })

    it('should accept a message function which takes in the temporary actor reference', async () => {
      const actor = spawnStateless(
        system,
        async (msg: any, ctx) => {
          dispatch(msg, 'done', ctx.self)
        },
        'test',
      )
      expect(await query(actor, (sender: ActorRef) => sender, 50)).toBe('done')
    })
  })

  describe('#onCrash', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => stop(system))

    const createSupervisor = (parent: ActorRef, name: string) =>
      spawn(parent, (state = true, msg, ctx) => state, name)

    it('should be able to continue processing messages without loss of state', async () => {
      const resume = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.resume
      const parent = createSupervisor(system, 'test1')
      const child = spawn(
        parent,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: resume },
      )
      dispatch(child, 'msg0')
      dispatch(child, 'msg1')
      dispatch(child, 'msg2')
      const result = await query(child, 'msg3', 300)
      expect(result).toBe(3)
    })

    it('should be able to be reset', async () => {
      const reset = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.reset
      const parent = createSupervisor(system, 'test1')
      const child = spawn(
        parent,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: reset },
      )

      const grandchild = spawn(child, (state = 0, msg, ctx) => {
        dispatch(ctx.sender, state + 1)
        return state + 1
      })

      dispatch(grandchild, 'msg0')
      dispatch(child, 'msg0')
      dispatch(grandchild, 'msg1')
      dispatch(child, 'msg1')
      dispatch(grandchild, 'msg2')
      dispatch(child, 'msg2')
      const result = await query(child, 'msg3', 300)
      expect(result).toBe(1)
      expect(isStopped(grandchild)).toBe(true)
    })

    it('should be able to be reset and use initial state', async () => {
      const reset = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.reset
      const parent = createSupervisor(system, 'test1')
      const child = spawn(
        parent,
        (state, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: reset, initialState: 1 },
      )

      const grandchild = spawn(child, (state = 0, msg, ctx) => {
        dispatch(ctx.sender, state + 1)
        return state + 1
      })

      dispatch(grandchild, 'msg0')
      dispatch(child, 'msg0')
      dispatch(grandchild, 'msg1')
      dispatch(child, 'msg1')
      dispatch(grandchild, 'msg2')
      dispatch(child, 'msg2')
      const result = await query(child, 'msg3', 300)
      expect(result).toBe(3)
      expect(isStopped(grandchild)).toBe(true)
    })

    it('should be able to stop', async () => {
      // tslint:disable-next-line:no-shadowed-variable
      const stop2 = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.stop
      const parent = createSupervisor(system, 'test1')
      const child = spawn(
        parent,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: stop2 },
      )
      dispatch(child, 'msg0')
      dispatch(child, 'msg1')
      dispatch(child, 'msg2')
      await delay(100)
      expect(isStopped(child)).toBe(true)
    })

    it('should be able to escalate', async () => {
      const escalate = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.escalate
      const parent = createSupervisor(system, 'test1')
      const child = spawn(
        parent,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: escalate },
      )
      dispatch(child, 'msg0')
      dispatch(child, 'msg1')
      dispatch(child, 'msg2')
      await delay(100)
      expect(isStopped(child)).toBe(true)
      expect(isStopped(parent)).toBe(true)
    })

    it('should be able to escalate to system (which stops child)', async () => {
      const escalate = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.escalate
      const child = spawn(
        system,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: escalate },
      )
      dispatch(child, 'msg0')
      dispatch(child, 'msg1')
      dispatch(child, 'msg2')
      await delay(100)
      expect(isStopped(child)).toBe(true)
    })

    it('should be able to stop all children', async () => {
      const stopAll = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.stopAll
      const parent = createSupervisor(system, 'test1')
      const child1 = spawn(
        parent,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: stopAll },
      )
      const child2 = spawn(parent, (state = 0, msg, ctx) => {
        dispatch(ctx.sender, state + 1)
        return state + 1
      })
      dispatch(child1, 'msg0')
      dispatch(child1, 'msg1')
      dispatch(child1, 'msg2')
      await delay(100)
      expect(isStopped(child1)).toBe(true)
      expect(isStopped(child2)).toBe(true)
    })

    it('should be able to reset all children', async () => {
      const resetAll = (msg: string, err: Error, ctx: SupervisionContext) =>
        ctx.resetAll
      const parent = createSupervisor(system, 'test1')
      const child1 = spawn(
        parent,
        (state = 0, msg, ctx) => {
          if (state + 1 === 3 && msg !== 'msg3') {
            throw new Error('Very bad thing')
          }
          dispatch(ctx.sender, state + 1)
          return state + 1
        },
        'test',
        { onCrash: resetAll },
      )
      const child2 = spawn(parent, (state = 0, msg, ctx) => {
        dispatch(ctx.sender, state + 1)
        return state + 1
      })
      dispatch(child2, 'msg0')
      dispatch(child1, 'msg0')
      dispatch(child2, 'msg1')
      dispatch(child1, 'msg1')
      dispatch(child2, 'msg2')
      dispatch(child1, 'msg2')
      // await delay(100)
      // const result = await query(child1, 'msg3', 300)
      // const result2 = await query(child2, 'msg3', 300)
      // expect(result).toBe(1)
      // expect(result2).toBe(1)
    })
  })
})

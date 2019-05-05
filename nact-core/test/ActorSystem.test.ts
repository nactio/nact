import { SystemRegistry } from '../src/actor'
import {
  dispatch,
  query,
  spawn,
  spawnStateless,
  start,
  stop,
} from '../src/functions'
import { ActorRef, ActorSystemReference } from '../src/references'

const isStopped = (reference: ActorRef) => {
  try {
    return SystemRegistry.applyOrThrowIfStopped(reference, () => undefined)
  } catch (e) {
    return true
  }
}

const ignore = () => {
  //
}

describe('ActorSystem', () => {
  it('should sucessfully be able to start multiple systems without conflict', async () => {
    const system1 = start()
    const system2 = start()

    const actor1 = spawnStateless(
      system1,
      (msg, ctx) => dispatch(ctx.sender, (msg as any) * 2),
      'child1',
    )
    const actor2 = spawnStateless(
      system2,
      (msg, ctx) => dispatch(ctx.sender, msg),
      'child1',
    )
    const result1 = await query(actor1, 5, 30)
    const result2 = await query(actor2, 5, 30)
    expect(result1).toBe(10)
    expect(result2).toBe(5)
  })

  it('should be able to have a custom name specified', async () => {
    const system = start({ name: 'henry' })
    expect(system.system.name).toBe('henry')
  })

  describe('#spawn()', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => stop(system))

    it('should prevent a child with the same name from being spawned', () => {
      spawnStateless(
        system,
        () =>
          // tslint:disable-next-line: no-console
          console.log('hello'),
        'child1',
      )
      expect(() =>
        spawnStateless(
          system,
          () =>
            // tslint:disable-next-line: no-console
            console.log('hello'),
          'child1',
        ),
      ).toThrow(Error)
    })
  })

  describe('#stop()', () => {
    let system: ActorSystemReference
    beforeEach(() => {
      system = start()
    })
    afterEach(() => stop(system))

    it('should prevent children from being spawned after being called', () => {
      stop(system)

      expect(() =>
        spawnStateless(system, () =>
          // tslint:disable-next-line: no-console
          console.log('spawning'),
        ),
      ).toThrow(Error)
      expect(() => spawn(system, ignore)).toThrow(Error)
    })

    it('should register as being stopped', () => {
      stop(system)
      expect(isStopped(system)).toBe(true)
    })
  })
})

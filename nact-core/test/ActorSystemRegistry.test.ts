import { SystemRegistry } from '../src/actor'
import { ActorReferenceType } from '../src/references'

const { add, find, remove, applyOrThrowIfStopped } = SystemRegistry

describe('ActorSystemRegistry', () => {
  describe('#add()', () => {
    it('be able to add a system to the system map', () => {
      const system = { name: 'hello5' }
      add(system as any)
      expect(find('hello5')).toEqual(system)
    })
  })

  describe('#find()', () => {
    it('be able to resolve a system', () => {
      const system = { name: 'hello4' }
      add(system as any)
      expect(find('hello4')).toEqual(system)
    })

    it('be able to resolve an actor', () => {
      const actor = {}
      const system = {
        find: (ref: any) => ref === 'actor' && actor,
        name: 'hello3',
      }
      add(system as any)
      expect(find('hello3', 'actor' as any)).toEqual(actor)
    })
  })

  describe('#remove()', () => {
    it('be able to remove a system from the system map', () => {
      const system = { name: 'hello2' }
      add(system as any)
      remove('hello2')
      expect(find('hello2')).toBeUndefined()
    })
  })

  describe('#applyOrThrowIfStopped()', () => {
    it('be able to apply the system to the function if the system can be found', () => {
      const system = {
        find: (ref: any) => ref.type === 'system',
        name: 'hello1',
      }
      add(system as any)
      expect(
        applyOrThrowIfStopped(
          {
            system: { name: 'hello1' },
            type: ActorReferenceType.system,
          } as any,
          s => s as any,
        ),
      ).toBe(true)
    })

    it('be able to apply the actor to the function if the actor can be found', () => {
      const system = {
        find: (ref: any) => ref.type === 'actor',
        name: 'hello1',
      }
      add(system as any)
      expect(
        applyOrThrowIfStopped(
          { type: ActorReferenceType.actor, system: { name: 'hello1' } } as any,
          s => s as any,
        ),
      ).toBe(true)
    })
  })
})

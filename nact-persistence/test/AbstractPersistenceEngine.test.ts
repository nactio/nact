import { AbstractPersistenceEngine } from '../src/AbstractPersistenceEngine'
import { PersistedEvent } from '../src/PersistedEvent'
import { PersistedSnapshot } from '../src/PersistedSnapshot'

describe('AbstractPersistenceEngine', () => {
  it('should throw when functions are invoked', () => {
    const event = new PersistedEvent({ msg: '234' }, 1, 'test-key', [])
    const snapshot = new PersistedSnapshot('234', 1, 'test-key')
    const abstractEngine = new (AbstractPersistenceEngine as any)()
    expect(() => abstractEngine.events('123', 1)).toThrow(Error)
    expect(() => abstractEngine.persist(event)).toThrow(Error)
    expect(() => abstractEngine.latestSnapshot('123')).toThrow(Error)
    expect(() => abstractEngine.takeSnapshot(snapshot)).toThrow(Error)
  })
})

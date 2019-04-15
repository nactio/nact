import { spawnStateless, start, stop } from '../src/functions'
import { ActorPath } from '../src/paths'
import { ActorSystemReference } from '../src/references'

const ignore = () => {
  //
}

describe('ActorReference', () => {
  let system: ActorSystemReference

  beforeEach(() => {
    system = start()
  })

  afterEach(() => stop(system))

  it('should have name, path, parent, properties', () => {
    const child = spawnStateless(system, ignore)
    const grandchild = spawnStateless(child, ignore)
    expect(child.parent).toBe(system)
    expect(grandchild.parent).toBe(child)
    expect(typeof child.name).toBe('string')
    expect(child.path).toBeInstanceOf(ActorPath)
  })
})

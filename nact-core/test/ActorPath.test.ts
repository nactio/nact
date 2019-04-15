import { ActorPath } from '../src/paths'

describe('ActorPath', () => {
  describe('#isValidName()', () => {
    it('should disallow non alphanumeric character (and dashes)', () => {
      expect(ActorPath.isValidName('$')).toBe(false)
      expect(ActorPath.isValidName('frog%')).toBe(false)
    })

    it('should disallow empty names', () => {
      expect(ActorPath.isValidName('')).toBe(false)
    })

    it('should disallow names which are not strings', () => {
      expect(ActorPath.isValidName({} as any)).toBe(false)
    })

    it('should disallow undefined or null names', () => {
      expect(ActorPath.isValidName(null!)).toBe(false)
      expect(ActorPath.isValidName(undefined!)).toBe(false)
    })

    it('should disallow whitespace', () => {
      expect(ActorPath.isValidName(' ')).toBe(false)
      expect(ActorPath.isValidName('a ')).toBe(false)
      expect(ActorPath.isValidName(' a')).toBe(false)
      expect(ActorPath.isValidName('a a')).toBe(false)
    })

    it('should allow names containing only alphanumeric characters and dashes', () => {
      expect(ActorPath.isValidName('frog')).toBe(true)
      expect(ActorPath.isValidName('123')).toBe(true)
      expect(ActorPath.isValidName('123-abc')).toBe(true)
      expect(ActorPath.isValidName('-')).toBe(true)
      expect(ActorPath.isValidName('-a-')).toBe(true)
    })
  })

  describe('#createChildPath()', () => {
    it('should append name to end of parts array if name is valid', () => {
      const path1 = ActorPath.root(undefined!).createChildPath('a')
      expect(path1.parts).toEqual(['a'])

      const path2 = path1.createChildPath('b')
      expect(path2.parts).toEqual(['a', 'b'])

      const path3 = path2.createChildPath('c1234-d4')
      expect(path3.parts).toEqual(['a', 'b', 'c1234-d4'])
    })

    it('should throw an exception if the child name is invalid', () => {
      expect(() => ActorPath.root(undefined!).createChildPath('$')).toThrow(Error)
      expect(() =>
        ActorPath.root(undefined!)
          .createChildPath('a')
          .createChildPath(' '),
      ).toThrow(Error)
      expect(() =>
        ActorPath.root(undefined!)
          .createChildPath('a')
          .createChildPath(''),
      ).toThrow(Error)
      expect(() => ActorPath.root(undefined!).createChildPath(undefined!)).toThrow(Error)
      expect(() => ActorPath.root(undefined!).createChildPath(null!)).toThrow(Error)
      expect(() => ActorPath.root(undefined!).createChildPath(123 as any)).toThrow(Error)
      expect(() => ActorPath.root(undefined!).createChildPath('.')).toThrow(Error)
    })
  })
})

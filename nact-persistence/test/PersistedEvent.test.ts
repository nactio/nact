import { AssertionError } from 'assert'

import { PersistedEvent } from '../src/PersistedEvent'

describe('PersistedEvent', () => {
  describe('#data', () => {
    it('should disallow non-number sequenceNums', () => {
      expect(
        () => new PersistedEvent({ msg: 'test' }, '1' as any, 'test-key', []),
      ).toThrow(AssertionError)
    })
  })

  describe('#tags', () => {
    it('should throw when the tags arg is not an array', () => {
      expect(
        () => new PersistedEvent({ msg: 'test' }, 1, 'test-key', 'tag' as any),
      ).toThrow(Error)
      expect(
        () =>
          new PersistedEvent(
            { msg: 'test' },
            '1' as any,
            'test-key',
            null as any,
          ),
      ).toThrow(Error)
    })

    it('should disallow tag values which are not strings', () => {
      expect(
        () =>
          new PersistedEvent({ msg: 'test' }, 1, 'test-key', [
            'tag',
            1 as any,
            'tag2',
          ]),
      ).toThrow(Error)
    })

    it('should default to an empty array', () => {
      expect(new PersistedEvent({ msg: 'test' }, 1, 'test-key').tags).toEqual(
        [],
      )
    })
  })

  describe('#createdAt', () => {
    it('should be able to be explicitely set', () => {
      expect(
        new PersistedEvent({ msg: 'test' }, 1, 'test-key', [], 123456)
          .createdAt,
      ).toEqual(123456)
    })

    it('should default to the current time', () => {
      const oldGetTime = global.Date.prototype.getTime
      global.Date.prototype.getTime = () => 123456
      expect(
        new PersistedEvent({ msg: 'test' }, 1, 'test-key', []).createdAt,
      ).toEqual(123456)
      global.Date.prototype.getTime = oldGetTime
    })
  })
})

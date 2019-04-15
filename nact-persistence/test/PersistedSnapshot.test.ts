import { AssertionError } from 'assert'

import { PersistedSnapshot } from '../src/PersistedSnapshot'

describe('PersistedSnapshot', () => {
  describe('#data', () => {
    it('should disallow non-number sequenceNums', () => {
      expect(
        () => new PersistedSnapshot({ msg: 'test' }, '1' as any, 'test-key'),
      ).toThrow(AssertionError)
    })
  })

  describe('#createdAt', () => {
    it('should be able to be explicitely set', () => {
      expect(
        new PersistedSnapshot({ msg: 'test' }, 1, 'test-key', 123456).createdAt,
      ).toBe(123456)
    })

    it('should default to the current time', () => {
      const oldGetTime = global.Date.prototype.getTime
      global.Date.prototype.getTime = () => 123456
      expect(
        new PersistedSnapshot({ msg: 'test' }, 1, 'test-key').createdAt,
      ).toBe(123456)
      global.Date.prototype.getTime = oldGetTime
    })
  })
})

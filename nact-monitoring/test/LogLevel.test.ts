import { logLevelToString } from '../src/LogLevel'

describe('LogLevel', () => {
  test('logLevelToString', () => {
    expect(logLevelToString(-1)).toBeUndefined()
    expect(logLevelToString(0)).toBe('OFF')
    expect(logLevelToString(1)).toBe('TRACE')
    expect(logLevelToString(2)).toBe('DEBUG')
    expect(logLevelToString(3)).toBe('INFO')
    expect(logLevelToString(4)).toBe('WARN')
    expect(logLevelToString(5)).toBe('ERROR')
    expect(logLevelToString(6)).toBe('CRITICAL')
    expect(logLevelToString(7)).toBeUndefined()
  })
})

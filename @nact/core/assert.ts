export class AssertionFailureError extends Error {
  constructor(msg?: string) {
    super('Assertion failed' + msg ? (' ' + msg) : '')
  }
}
export default function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new AssertionFailureError(msg);
  }
}
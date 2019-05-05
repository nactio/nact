import assert from 'assert'

export class PersistedSnapshot {
  constructor(
    public readonly data: any,
    public readonly sequenceNumber: number,
    public readonly key: string,
    public readonly createdAt: number = new Date().getTime(),
  ) {
    // Sequence number should be a number.
    // This is an internal error if this is not the case as this is defined by the engine and hence shouldn't
    // be exposed to users of the framework
    assert(typeof sequenceNumber === 'number')
  }
}

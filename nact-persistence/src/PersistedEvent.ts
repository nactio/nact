import assert from 'assert'

export class PersistedEvent {
  constructor(
    public readonly data: any,
    public readonly sequenceNumber: number,
    public readonly key: string,
    public readonly tags: string[] = [],
    public readonly createdAt: number = new Date().getTime(),
    public readonly isDeleted = false,
  ) {
    // Tags should be an array of strings
    if (
      !tags ||
      !(tags instanceof Array) ||
      !tags.reduce(
        (isStrArray, tag) => isStrArray && typeof tag === 'string',
        true,
      )
    ) {
      throw new Error('tags should be a string array')
    }

    // Sequence number should be a number.
    // This is an internal error if this is not the case as this is defined by the engine and hence shouldn't
    // be exposed to users of the framework
    assert(typeof sequenceNumber === 'number')
  }
}

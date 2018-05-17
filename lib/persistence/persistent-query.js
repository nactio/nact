const id = x => x;

class PersistentQuery {
  constructor (queryKey, system, f, key, { shutdownAfter, snapshotEvery, snapshotEncoder = id, snapshotDecoder = id, encoder = id, decoder = id, ...properties } = {}) {
    this.queryKey = queryKey;
    this.f = f;
    this.key = key;
    this.system = system;
  }
  apply (target, thisArg, argumentsList) {

  }
}

module.exports.PersistentQuery = PersistentQuery;

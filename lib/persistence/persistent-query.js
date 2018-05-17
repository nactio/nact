const id = x => x;

class PersistentQuery {
  constructor (queryKey, system, f, key, { shutdownAfter, snapshotEvery, snapshotEncoder = id, snapshotDecoder = id, encoder = id, decoder = id, ...properties } = {}) {
    this.queryKey = queryKey;
    this.f = f;
    this.key = key;
    this.system = system;
  }
  async recover () {
    try {
      let snapshot = await this.persistenceEngine.latestSnapshot(this.key);

      let sequenceNumber = 0;
      let initialState;
      if (snapshot) {
        initialState = this.snapshotDecoder(snapshot.data);
        sequenceNumber = snapshot.sequenceNumber;
      }

      let result = await this.persistenceEngine
    .events(this.key, sequenceNumber)
    .reduce(async (prev, msg, index) => {
      if (await prev) {
        const [state, prevIndex] = await prev;
        if (msg.isDeleted) {
          return [state, prevIndex, msg.sequenceNumber];
        } else {
          const decodedMsg = this.decoder(msg.data);
          const context = { ...this.createContext(this.reference), recovering: true };
          try {
            // Might not be an async function. Using promise.resolve to force it into that form
            const nextState = await Promise.resolve(this.f.call(context, state, decodedMsg, context));
            return [nextState, index, msg.sequenceNumber];
          } catch (e) {
            let shouldContinue = await this.handleFaultedRecovery(decodedMsg, undefined, e);
            if (shouldContinue) {
              return [state, prevIndex, msg.sequenceNumber];
            }
          }
        }
      }
    }, Promise.resolve([initialState, 0, sequenceNumber]));
// Message count can be different to sequenceNumber if events have been deleted from the database
      if (result) {
        const [state, messageCount, seq] = result;
        this.sequenceNumber = seq;
        this.messagesToNextSnapshot = this.snapshotMessageInterval - messageCount;
        this.state = state;
        this.processNext();
      }
    } catch (e) {
      this.handleFault(undefined, undefined, e);
    }
  }
  apply (target, thisArg, argumentsList) {

  }
}

module.exports.PersistentQuery = PersistentQuery;

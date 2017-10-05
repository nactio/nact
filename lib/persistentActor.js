require('rxjs');
const { Actor } = require('./Actor');

const RecoveryStatus = ({
  INITIAL: 'INITIAL',
  RECOVERING: 'RECOVERING',
  RECOVERED: 'RECOVERED',
  FAULTED: 'FAULTED'
});

const fst = f => function () { return (f.apply(this, arguments))[0]; };

class PersistentActor extends Actor {
  constructor (parent, name, system, f, persistenceKey, initialState) {
    super(parent, name, system, f);
    if (!persistenceKey) {
      throw new Error(`Persistence key required`);
    }
    this.actorState = initialState;
    this.recoveryStatus = RecoveryStatus.INITIAL;
    this.persistenceKey = persistenceKey;
    this.state = initialState;

    try {
      const recoveryEpic$ = system.persistenceEngine.events(persistenceKey);
      this.recoveryStatus = RecoveryStatus.RECOVERING;
      recoveryEpic$.reduce(fst(f), initialState).subscribe(state => {
        this.state = state;
        this.recoveryStatus = RecoveryStatus.RECOVERED;
      });
    } catch (e) {
      super.signalFault(e);
      this.recoveryStatus = RecoveryStatus.FAULTED;
    }
  }
}

module.exports.PersistentActor = PersistentActor;

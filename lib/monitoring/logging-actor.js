const { dispatch } = require('../functions');
const { AbstractLoggingEngine } = require('./logging-engine');

const spawnLoggingActor = (system) => {

};

class ActorLoginEngine extends AbstractLoggingEngine {
  constructor (loggingActor) {
    this.loggingActor = loggingActor;
  }

  log (logEvent) {
    dispatch(this.loggingActor, logEvent);
  }
}

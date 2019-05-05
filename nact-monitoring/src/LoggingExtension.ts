import { ActorRef, ActorSystem } from 'nact-core'

import { LoggingEngine } from './LoggingEngine'
import { LoggingFacade } from './LoggingFacade'

export const LoggingExtension = (engine: LoggingEngine) => (
  system: ActorSystem,
) => {
  const loggingActor = engine(system.reference)
  if (loggingActor) {
    system.createLogger = (reference: ActorRef) =>
      new LoggingFacade(loggingActor, reference) as unknown as Console
  } else {
    throw new Error('Logging engine is not defined')
  }
}

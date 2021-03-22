import { ActorSystem } from '@nact/core/system';
import { AbstractPersistenceEngine } from './persistence-engine';
export * from './persistent-actor';
export * from './persistent-query';
export { PersistedEvent, PersistedSnapshot, AbstractPersistenceEngine } from './persistence-engine';

export const configurePersistence = (engine: AbstractPersistenceEngine) => (system: ActorSystem) => {
  if (!engine) {
    throw new Error('Persistence engine should not be undefined');
  }
  return Object.assign(system, { persistenceEngine: engine });
};


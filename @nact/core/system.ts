import { ActorRef, ActorSystemRef, TemporaryRef } from './references';
import { ActorPath } from './paths';
import assert from './assert'
import { stop } from './functions';
import { add as addToSystemMap, remove as removeFromSystemMap } from './system-map';
import { ICanFind, ICanStop, IHaveName } from './interfaces';
import { Actor } from './actor';
import { Deferral } from './deferral';

function toBase36(x: number) { return Number(x).toString(36) }
function generateSystemId() { return [...crypto.getRandomValues(new Uint32Array(4))].map(toBase36).join('-') };


export type ActorSystemSettings = { name?: ActorSystemName, plugins?: Plugin[] };
export class ActorSystem implements IHaveName, ICanFind, ICanStop {
  children: Map<any, Actor<any, any, ActorSystemRef>>;
  createLogger: () => undefined;
  name: ActorSystemName;
  path: ActorPath;
  reference: ActorSystemRef;
  childReferences: Map<any, ActorRef<any, ActorSystemRef>>;
  tempReferences: Map<number, Deferral<any>>;
  stopped: boolean;
  system: this;
  private constructor(settings: ActorSystemSettings) {
    this.children = new Map();
    this.createLogger = () => undefined;
    this.name = settings.name || generateSystemId();
    this.path = ActorPath.root(this.name);
    this.reference = new ActorSystemRef(this.name, this.path);
    this.childReferences = new Map();
    this.tempReferences = new Map();
    this.stopped = false;
    this.system = this;
    addToSystemMap(this);
    (settings.plugins ?? []).forEach(extension => extension(this));
  }

  addTempReference(reference: TemporaryRef<any>, deferral: Deferral<any>) {
    this.tempReferences.set(reference.id, deferral);
  }

  removeTempReference(reference: TemporaryRef<any>) {
    this.tempReferences.delete(reference.id);
  }

  find(actorRef: ActorSystemRef | ActorRef<any, any> | TemporaryRef<any>): any | undefined {
    switch (actorRef && actorRef.type) {
      case 'actor': {
        let parts =
          actorRef &&
          actorRef.path &&
          actorRef.path.parts;

        return parts && parts.reduce((parent: ActorSystem | Actor<any, any, any> | undefined, current: string) =>
          parent &&
          parent.children.get(current),
          this
        );
      }
      case 'temp': {
        const actor = this.tempReferences.get((actorRef as TemporaryRef<any>).id);
        return actor;
      }
      case 'system':
        return this;
      default: return undefined;
    }
  }

  handleFault(_msg: unknown, _error: unknown, child: ActorRef<any, any> | ActorSystemRef) {
    console.log('Stopping top level actor,', child.name, 'due to a fault');
    stop(child);
  }

  childStopped(child: Actor<any, any, any>) {
    this.children.delete(child.name);
    this.childReferences.delete(child.name);
  }

  childSpawned(child: Actor<any, any, any>) {
    this.childReferences.set(child.name, child.reference);
    this.children.set(child.name, child);
  }

  stop() {
    [...this.children.values()].forEach(stop);
    this.stopped = true;
    removeFromSystemMap(this.name);
    return Promise.resolve();
  }

  assertNotStopped() { assert(!this.stopped); return true; }

  static start(settings?: ActorSystemSettings): ActorSystemRef {
    return new ActorSystem(settings ?? {}).reference;
  }
}

export type ActorSystemName = string;
export type Plugin = (system: ActorSystem) => void;
export const start = ActorSystem.start;



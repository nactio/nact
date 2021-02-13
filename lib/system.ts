import { ActorSystemRef } from './references';
import { ActorPath } from './paths';
import assert from './assert'
import { stop } from './functions';
import { add as addToSystemMap } from './system-map';
import { ICanFind, ICanStop, IHaveName } from './interfaces';
import { ActorName } from './actor';


function toBase36(x: number) { return Number(x).toString(36) }
function generateSystemId() { return [...crypto.getRandomValues(new Uint32Array(4))].map(toBase36).join('-') };


export class ActorSystem implements IHaveName, ICanFind, ICanStop {
  children: Map<any, any>;
  createLogger: () => undefined;
  name: ActorSystemName;
  path: ActorPath;
  reference: ActorSystemRef;
  childReferences: Map<any, any>;
  tempReferences: Map<any, any>;
  stopped: boolean;
  system: this;
  private constructor(extensions) {
    let [hd, ...tail] = extensions;
    this.children = new Map();
    this.createLogger = () => undefined;
    this.name = (typeof (hd) === 'object' && hd.name) || generateSystemId();
    this.path = ActorPath.root(this.name);
    this.reference = new ActorSystemRef(this.name, this.path);
    this.childReferences = new Map();
    this.tempReferences = new Map();
    this.stopped = false;
    this.system = this;
    assert(extensions instanceof Array);
    addToSystemMap(this);
    ([...(typeof (hd) === 'function') ? [hd] : [], ...tail]).forEach(extension => extension(this));
  }

  addTempReference(reference, deferral) {
    this.tempReferences.set(reference.id, deferral);
  }

  removeTempReference(reference) {
    this.tempReferences.delete(reference.id);
  }

  find(actorRef) {
    switch (actorRef && actorRef.type) {
      case 'actor': {
        let parts =
          actorRef &&
          actorRef.path &&
          actorRef.path.parts;

        return parts && parts.reduce((parent, current) =>
          parent &&
          parent.children.get(current),
          this
        );
      }
      case 'temp': {
        const actor = this.tempReferences.get(actorRef.id);
        return actor && actor.resolve && { dispatch: (...args) => actor.resolve(...args) };
      }
      case 'system':
        return this;
      default: return undefined;
    }
  }

  handleFault(msg, sender, error, child) {
    console.log('Stopping top level actor,', child.name, 'due to a fault');
    stop(child);
  }

  childStopped(child) {
    this.children.delete(child.name);
    this.childReferences.delete(child.name);
  }

  childSpawned(child) {
    this.childReferences.set(child.name, child.reference);
    this.children.set(child.name, child);
  }

  stop() {
    [...this.children.values()].forEach(stop);
    this.stopped = true;
    systemMap.remove(this.name);
  }

  assertNotStopped() { assert(!this.stopped); return true; }

  static start(fst?: Plugin | ActorSystemName, ...args: Plugin[]): ActorSystemRef {
    return new ActorSystem([...arguments]).reference;
  }
}

export type ActorSystemName = string;
export type Plugin = (system: ActorSystem) => void;
export const start = ActorSystem.start;



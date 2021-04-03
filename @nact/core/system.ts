import { ActorRef, ActorSystemRef, LocalActorRef, localActorSystemRef, LocalActorSystemRef, LocalTemporaryRef, temporaryRef } from './references';
import { ActorPath } from './paths';
import assert from './assert'
import { stop } from './functions';
import { add as addToSystemMap, remove as removeFromSystemMap } from './system-map';
import { ICanFind, ICanStop, IHaveChildren, IHaveName } from './interfaces';
import { Actor } from './actor';
import { Deferral } from './deferral';

function toBase36(x: number) { return Number(x).toString(36) }
function generateSystemId() { return [...new Uint32Array(4)].map(_ => (Math.random() * Number.MAX_SAFE_INTEGER) | 0).map(toBase36).join('-') };


export type ActorSystemSettings = { name?: ActorSystemName, plugins?: Plugin[] };
export class ActorSystem implements IHaveName, ICanFind, ICanStop, IHaveChildren<ICanStop> {
  children: Map<string, ICanStop & Partial<IHaveChildren>>;
  createLogger: () => undefined;
  name: ActorSystemName;
  path: ActorPath;
  reference: LocalActorSystemRef;
  childReferences: Map<any, ActorRef<any>>;
  tempReferences: Map<string, Deferral<any>>;
  stopped: boolean;
  system: this;

  private constructor(settings: ActorSystemSettings) {
    this.children = new Map();
    this.createLogger = () => undefined;
    this.name = settings.name || generateSystemId();
    this.path = ActorPath.root(this.name);
    this.reference = localActorSystemRef(this.path);
    this.childReferences = new Map();
    this.tempReferences = new Map();
    this.stopped = false;
    this.system = this;
    addToSystemMap(this);
    (settings.plugins ?? []).forEach(extension => extension(this));
  }

  addTempReference(reference: LocalTemporaryRef<any>, deferral: Deferral<any>) {
    this.tempReferences.set(reference.path!.parts[0], deferral);
  }

  removeTempReference(reference: LocalTemporaryRef<any>) {
    this.tempReferences.delete(reference.path!.parts[0]);
  }

  find(actorRef?: LocalActorSystemRef | LocalActorRef<any> | LocalTemporaryRef<any>): any | undefined {
    if (!actorRef || !actorRef.path) {
      return undefined;
    }

    switch (actorRef.path.type) {
      case 'temp': {
        const actor = this.tempReferences.get(ActorPath.toString(actorRef.path));
        return actor;
      };
      case undefined: {
        if (actorRef.path.parts.length === 0) {
          return this;
        }
        let parts =
          actorRef &&
          actorRef.path &&
          actorRef.path.parts;


        return parts && parts.reduce((parent: IHaveChildren | undefined, current: string) =>
          parent &&
          parent.children.get(current),
          this as IHaveChildren
        );
      }
      default: return undefined;
    }
  }

  handleFault(_msg: unknown, _error: unknown, child: LocalActorRef<any> | LocalActorSystemRef) {
    console.log('Stopping top level actor,', ActorPath.toString(child.path), 'due to a fault');
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
    [...this.children.values()].forEach(x => x.stop());
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


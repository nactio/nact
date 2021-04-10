import { LocalActorRef, localActorSystemRef, LocalActorSystemRef, LocalTemporaryRef, Ref } from './references';
import { ActorPath } from './paths';
import assert from './assert'
import { add as addToSystemMap, remove as removeFromSystemMap } from './system-map';
import { ICanAssertNotStopped, ICanFind, ICanHandleFault, ICanManageTempReferences, ICanReset, ICanStop, IHaveChildren, IHaveName } from './interfaces';
import { Deferral } from './deferral';

function toBase36(x: number) { return Number(x).toString(36) }
function generateSystemId() { return [...new Uint32Array(4)].map(_ => (Math.random() * Number.MAX_SAFE_INTEGER) | 0).map(toBase36).join('-') };

type ActorSystemChild = ICanStop & IHaveName & Partial<IHaveChildren<ActorSystemChild, ActorSystem>> & ICanReset;

export type ActorSystemSettings = { name?: ActorSystemName, plugins?: Plugin[] };
export class ActorSystem implements
  IHaveName,
  ICanFind,
  ICanStop,
  IHaveChildren<ActorSystemChild, ActorSystem>,
  ICanHandleFault<ActorSystemChild>,
  ICanManageTempReferences,
  ICanAssertNotStopped {
  children: Map<string, ActorSystemChild>;
  createLogger: () => undefined;
  name: ActorSystemName;
  path: ActorPath;
  reference: LocalActorSystemRef;
  childReferences: Map<any, LocalActorRef<unknown>>;
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
    assert(reference.path.isTemporary, 'Expected temporary ref');
    this.tempReferences.set(reference.path!.parts[0], deferral);
  }

  removeTempReference(reference: LocalTemporaryRef<any>) {
    assert(reference.path.isTemporary, 'Expected temporary ref');
    this.tempReferences.delete(reference.path!.parts[0]);
  }

  find<T>(actorRef?: Ref): T | undefined {
    if (!actorRef || !actorRef.path) {
      return undefined;
    }

    if (actorRef.path.isTemporary) {
      const actor = this.tempReferences.get(actorRef.path.parts[0]);
      return actor as unknown as T;
    } else if (actorRef.path.parts.length === 0) {
      return this as unknown as T;
    } else {

      let parts =
        actorRef &&
        actorRef.path &&
        actorRef.path.parts;

      return parts && (parts.reduce((parent: IHaveChildren<any, ActorSystem> | undefined, current: string) =>
        parent &&
        parent.children.get(current),
        this as IHaveChildren<any, ActorSystem>
      ) as unknown as T);
    }
  }

  handleFault(_msg: unknown, _error: Error | undefined, child?: ActorSystemChild) {
    console.log('Stopping top level actor,', ActorPath.toString(child!.reference.path), 'due to a fault');
    child!.stop();
  }

  childStopped(child: IHaveName) {
    this.children.delete(child.name);
    this.childReferences.delete(child.name);
  }

  childSpawned(child: ActorSystemChild) {
    this.childReferences.set(child.name, child.reference as LocalActorRef<unknown>);
    this.children.set(child.name, child);
  }

  stop() {
    [...this.children.values()].forEach(x => x.stop());
    this.stopped = true;
    removeFromSystemMap(this.name);
    return Promise.resolve();
  }

  assertNotStopped() { assert(!this.stopped); return true; }

  static start(settings?: ActorSystemSettings): LocalActorSystemRef {
    return new ActorSystem(settings ?? {}).reference;
  }
}

export type ActorSystemName = string;
export type Plugin = (system: ActorSystem) => void;
export const start = ActorSystem.start;



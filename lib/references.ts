import { ActorName } from "./actor";
import { ActorPath } from "./paths";
import { ActorSystemName } from "./system";

export abstract class Ref<T> {
  system: { name: ActorSystemName | undefined };
  path?: ActorPath
  constructor(systemName: ActorSystemName | undefined, path: ActorPath) {
    this.system = { name: systemName };
    this.path = path;
  }
}

export class Nobody extends Ref<any> {
  type: 'nobody';
  constructor() {
    super(undefined, new ActorPath([], undefined));
    this.type = 'nobody';
  }
}

export class TemporaryRef<Msg> extends Ref<Msg> {
  id: number;
  type: 'temp';
  constructor(systemName: ActorSystemName) {
    super(systemName, new ActorPath([], systemName));
    this.id = (Math.random() * Number.MAX_SAFE_INTEGER) | 0;
    this.type = 'temp';
  }
}

export class ActorRef<Msg, ParentRef extends ActorRef<any> | ActorSystemRef = any> extends Ref<Msg> {
  name: ActorName;
  parent: ParentRef;
  type: 'actor';
  constructor(systemName: ActorSystemName, parent: ParentRef, path: ActorPath, name: ActorName) {
    super(systemName, path);
    this.name = name;
    this.parent = parent;
    this.type = 'actor';
  }
}

export class ActorSystemRef extends Ref<never> {
  path: any;
  name: string;
  type: string;
  constructor(systemName: ActorSystemName, path: ActorPath) {
    super(systemName, path)
    this.path = path;
    this.name = systemName;
    this.type = 'system';
  }
}

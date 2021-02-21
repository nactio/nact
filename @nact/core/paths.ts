import { ActorName } from "./actor";
import { ActorSystemName } from "./system";

export class ActorPath {
  parts: string[];
  system: ActorSystemName | undefined;

  constructor(parts: [], system: undefined)
  constructor(parts: string[], system: ActorSystemName)
  constructor(parts: string[], system: ActorSystemName | undefined) {
    this.system = system;
    this.parts = parts;
  }

  createChildPath(name: ActorName) {
    if (!ActorPath.isValidName(name)) {
      throw new Error('Invalid argument: path may only contain URI encoded characters, RFC1738 alpha, digit, safe, extra');
    }

    if (this.system === undefined) {
      throw new Error('Cannot create child path of an undefined system');
    }

    return new ActorPath([...this.parts, name], this.system!);
  }

  static isValidName(name: ActorName) {
    const actorNameRegex = /^[a-z0-9-$_.+!*'(),]+$/i;
    return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
  }

  static root(system: ActorSystemName) {
    return new ActorPath([], system);
  }

  toString() {
    return `${this.system}://${this.parts.join('/')}`;
  }
}

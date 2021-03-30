import { ActorName } from "./actor";
import { ActorSystemName } from "./system";

export class ActorPath<Type extends string | undefined = any> {
  parts: string[];
  system: ActorSystemName | undefined;
  type: Type | undefined;
  constructor(parts: [], system: undefined)
  constructor(parts: string[], system: ActorSystemName)
  constructor(parts: string[], system: ActorSystemName, type: Type)
  constructor(parts: string[], system: ActorSystemName | undefined, type?: Type) {
    this.system = system;
    this.parts = parts;
    this.type = type
  }


  static isValidName(name: ActorName) {
    const actorNameRegex = /^[a-z0-9-$_.+!*'(),]+$/i;
    return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
  }

  static root(system: ActorSystemName) {
    return new ActorPath([], system);
  }


  static createChildPath<Type extends string | undefined = any>(path: ActorPath<Type>, name: ActorName) {
    if (!ActorPath.isValidName(name)) {
      throw new Error('Invalid argument: path may only contain URI encoded characters, RFC1738 alpha, digit, safe, extra');
    }

    if (path.system === undefined) {
      throw new Error('Cannot create child path of an undefined system');
    }

    return new ActorPath([...path.parts, name], path.system!);
  }

  static toString<Type extends string | undefined = any>(path?: ActorPath<Type>) {
    if (!path) {
      return '';
    }
    return `${path.system}://${path.parts.join('/')}`;
  }
}



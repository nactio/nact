import { ActorName } from "./actor";
import { ActorSystemName } from "./system";

export type ActorPath = {
  parts: string[],
  system: ActorSystemName | undefined,
  isTemporary?: boolean
}

export namespace ActorPath {
  export function isValidName(name: ActorName) {
    const actorNameRegex = /^[a-z0-9-$_.+!*'(),]+$/i;
    return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
  }

  export function toString(path: ActorPath) {
    return `${path.system}://${path.parts.join('/')}`;
  }

  export function root(system: ActorSystemName): ActorPath {
    return { parts: [], system };
  }

  export function createChildPath(path: ActorPath, name: ActorName): ActorPath {
    if (!ActorPath.isValidName(name)) {
      throw new Error('Invalid argument: path may only contain URI encoded characters, RFC1738 alpha, digit, safe, extra');
    }

    if (path.system === undefined) {
      throw new Error('Cannot create child path of an undefined system');
    }

    return { parts: [...path.parts, name], system: path.system };
  }

  export function validatePath(path: ActorPath) {
    return path.parts.every(isValidName);
  }
}



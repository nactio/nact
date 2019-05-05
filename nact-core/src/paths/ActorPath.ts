import { ActorSystem, ActorSystemName } from '../actor'

export class ActorPath {
  public static isValidName(name: string) {
    const actorNameRegex = /^[a-z0-9-_]+$/i
    return !!name && typeof name === 'string' && !!name.match(actorNameRegex)
  }

  public static root(system: ActorSystem) {
    return new ActorPath([], system)
  }

  constructor(
    public readonly parts: string[],
    public readonly system: ActorSystem | { name: ActorSystemName },
  ) {}

  public createChildPath(name: string) {
    if (!ActorPath.isValidName(name)) {
      throw new Error(
        'Invalid argument: path may only contain the letters from a-z, dashes and digits',
      )
    }

    return new ActorPath([...this.parts, name], this.system)
  }

  public toString() {
    return `${this.system.name}://${this.parts.join('/')}`
  }
}

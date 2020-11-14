class ActorPath {
  constructor (parts, system) {
    this.system = system;
    this.parts = parts;
  }

  createChildPath (name) {
    if (!ActorPath.isValidName(name)) {
      throw new Error('Invalid argument: path may only contain URI encoded characters, RFC1738 alpha, digit, safe, extra');
    }

    return new ActorPath([...this.parts, name], this.system);
  }

  static isValidName (name) {
    const actorNameRegex = /^[a-z0-9-$_.+!*'(),]+$/i;
    return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
  }

  static root (system) {
    return new ActorPath([], system);
  }

  toString () {
    return `${this.system}://${this.parts.join('/')}`;
  }
}

module.exports = { ActorPath };

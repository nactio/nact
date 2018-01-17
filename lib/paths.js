const freeze = require('./freeze');

class ActorPath {
  constructor (parts) {
    this.parts = parts;
    freeze(this);
  }

  createChildPath (name) {
    if (!ActorPath.isValidName(name)) {
      throw new Error('Invalid argument: path may only contain the letters from a-z, dashes and digits');
    }

    return new ActorPath([...this.parts, name]);
  }

  static isValidName (name) {
    const actorNameRegex = /^[a-z0-9-_]+$/i;
    return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
  }

  static root () {
    return new ActorPath([]);
  }

  toString () {
    return '/' + this.parts.join('/');
  }
}

module.exports = { ActorPath };

const freeze = require('deep-freeze-node');

class Path {
  constructor (localParts) {
    this.localParts = localParts;
    this.type = 'path';
    freeze(this);
  }

  createChildPath (name) {
    if (!Path.isValidName(name)) {
      throw new Error('Invalid argument: path may only contain the letters from a-z, dashes and digits');
    }

    return new Path([...this.localParts, name]);
  }

  static isValidName (name) {
    const actorNameRegex = /^[a-z0-9-_]+$/i;
    return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
  }

  static root () {
    return new Path([]);
  }

  toString () {
    return '/' + this.localParts.join('/');
  }
}

module.exports = { Path };

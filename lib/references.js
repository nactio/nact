const freeze = require('./freeze');

class Nobody {
  constructor () {
    this.system = { name: undefined };
    this.path = { parts: [] };
    this.type = 'nobody';
    freeze(this);
  }
}

class TemporaryReference {
  constructor (systemName) {
    this.system = { name: systemName };
    this.id = (Math.random() * Number.MAX_SAFE_INTEGER) | 0;
    this.type = 'temp';
    freeze(this);
  }
}

class ActorReference {
  constructor (systemName, parent, path, name) {
    this.path = path;
    this.name = name;
    this.parent = parent;
    this.system = { name: systemName };
    this.type = 'actor';
    freeze(this);
  }
}

class ActorSystemReference {
  constructor (systemName, path) {
    this.path = path;
    this.system = { name: systemName };
    this.name = systemName;
    this.type = 'system';
    freeze(this);
  }
}

module.exports.Nobody = Nobody;
module.exports.ActorSystemReference = ActorSystemReference;
module.exports.ActorReference = ActorReference;
module.exports.TemporaryReference = TemporaryReference;

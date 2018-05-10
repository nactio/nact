class Nobody {
  constructor () {
    this.system = { name: undefined };
    this.path = { parts: [] };
    this.type = 'nobody';
  }
}

class TemporaryReference {
  constructor (systemName) {
    this.system = { name: systemName };
    this.id = (Math.random() * Number.MAX_SAFE_INTEGER) | 0;
    this.type = 'temp';
  }
}

class ActorReference {
  constructor (systemName, parent, path, name) {
    this.path = path;
    this.name = name;
    this.parent = parent;
    this.system = { name: systemName };
    this.type = 'actor';
  }
}

class ActorSystemReference {
  constructor (systemName, path) {
    this.path = path;
    this.system = { name: systemName };
    this.name = systemName;
    this.type = 'system';
  }
}

module.exports.Nobody = Nobody;
module.exports.ActorSystemReference = ActorSystemReference;
module.exports.ActorReference = ActorReference;
module.exports.TemporaryReference = TemporaryReference;

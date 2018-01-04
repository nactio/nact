const freeze = require('deep-freeze-node');

class TemporaryReference {
  constructor (sid) {
    this.sid = sid;
    this.id = (Math.random() * Number.MAX_SAFE_INTEGER) | 0;
    this.type = 'temp';
    freeze(this);
  }
}

class ActorReference {
  constructor (sid, parent, path, name) {
    this.path = path;
    this.name = name;
    this.parent = parent;
    this.sid = sid;
    this.type = 'actor';
    freeze(this);
  }
}

class ActorSystemReference {
  constructor (sid, path) {
    this.path = path;
    this.sid = sid;
    this.type = 'system';
    freeze(this);
  }
}

module.exports.ActorSystemReference = ActorSystemReference;
module.exports.ActorReference = ActorReference;
module.exports.TemporaryReference = TemporaryReference;

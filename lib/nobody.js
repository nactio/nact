const freeze = require('deep-freeze-node');

class Nobody {
  constructor (system) {
    this.type = 'nobody';
    this.sid = system.sid;
    freeze(this);
  }
}

module.exports.Nobody = Nobody;

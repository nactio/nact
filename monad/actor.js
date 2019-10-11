const SPAWN = Symbol('spawn');
const SPAWN_STATELESS = Symbol('spawnStateless');

const spawn = (parent, f, name, properties) =>
  ({
    action: SPAWN,
    parent,
    f: f,
    name,
    properties
  });

const spawnStateless = (parent, f, name, properties) =>
  ({
    action: SPAWN_STATELESS,
    parent,
    f,
    name,
    properties
  });

module.exports = {
  spawn,
  spawnStateless,
  SPAWN,
  SPAWN_STATELESS
};

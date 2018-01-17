const not = (f) => (x) => !f(x);
const freeze = (object) => {
  Object.freeze(object);
  Object.getOwnPropertyNames(object || {})
    .map(name => object[name])
    .filter(not(Object.isFrozen))
    .forEach(freeze);
  return object;
};

module.exports = freeze;

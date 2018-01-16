const systemMap = new Map();

module.exports.add = (system) => {
  systemMap.set(system.name, system);
};

module.exports.find = (systemName, reference) => {
  const system = systemMap.get(systemName);
  return (system && reference)
    ? system.find(reference)
    : system;
};

module.exports.remove = (systemName) => {
  systemMap.delete(systemName);
};

module.exports.applyOrThrowIfStopped = (reference, f) => {
  let concrete = module.exports.find(reference.system.name, reference);
  if (concrete) {
    return f(concrete);
  } else {
    throw new Error('Actor has stopped or never even existed');
  }
};

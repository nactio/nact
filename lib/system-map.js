let systemMap = new Map();

module.exports.add = (system) => {
  systemMap.set(system.sid, system);
};

module.exports.find = (sid, actorRef) => {
  let system = systemMap.get(sid);
  return (system && actorRef)
    ? system.find(actorRef)
    : system;
};

module.exports.remove = (sid) => {
  systemMap.delete(sid);
};

module.exports.applyOrThrowIfStopped = (reference, f) => {
  let concrete = module.exports.find(reference.sid, reference);
  if (concrete) {
    return f(concrete);
  } else {
    throw new Error('Actor has already stopped or never existed');
  }
};

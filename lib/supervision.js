const SupervisionActions = {
  // Stop Self
  stop: Symbol('stop'),
  // Stop Self and Peers
  stopAll: Symbol('stopAll'),
  // Stop Faulted Child
  stopChild: Symbol('stopChild'),
  // Stop All Children
  stopAllChildren: Symbol('stopAllChildren'),
  // Escalate to Parent
  escalate: Symbol('escalate'),
  // Resume Self
  resume: Symbol('resume'),
  // Reset Self
  reset: Symbol('reset'),
  // Reset Self and Peers
  resetAll: Symbol('resetAll'),
  // Reset Child
  resetChild: Symbol('resetChild'),
  // Reset All Children
  resetAllChildren: Symbol('resetAllChildren')
};

const defaultSupervisionPolicy = (msg, err, ctx, child = undefined) => {
  let path = ctx.path.toString();
  if (child) {
    console.log(`${path}: The following error was escalated when raised by child '${child.name}' processing message %O:\n%O\nTerminating faulted actor`, msg, err);
  } else {
    console.log(`${path}: The following error was raised when processing message %O:\n%O\nTerminating faulted actor`, msg, err);
  }
  return ctx.stop;
};

module.exports = {
  defaultSupervisionPolicy,
  SupervisionActions
};

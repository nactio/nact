const SupervisionActions = {
  stop: Symbol('stop'),
  stopAll: Symbol('stopAll'),
  escalate: Symbol('escalate'),
  resume: Symbol('resume'),
  reset: Symbol('reset'),
  resetAll: Symbol('resetAll')
};

const defaultSupervisionPolicy = (msg, err, ctx, child = undefined) => {
  let path = ctx.path.toString();
  if (child) {
    console.log(`${path}: The following error was escalated when raised by child '${child.name}' processing message %O:\n%O\nTerminating faulted child actor`, msg, err);
    return child.stop;
  } else {
    console.log(`${path}: The following error was raised when processing message %O:\n%O\nTerminating faulted actor`, msg, err);
    return ctx.stop;
  }
};

module.exports = {
  defaultSupervisionPolicy,
  SupervisionActions
};

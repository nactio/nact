const SupervisionActions = {
  stop: Symbol('stop'),
  stopAll: Symbol('stopAll'),
  escalate: Symbol('escalate'),
  resume: Symbol('resume'),
  reset: Symbol('reset'),
  resetAll: Symbol('resetAll')
};

const defaultSupervisionPolicy = (msg, err, ctx) => {
  let path = ctx.path.toString();
  console.log(`${path}: The following error was raised when processing message %O:\n%O\nTerminating faulted actor`, msg, err);
  return ctx.stop;
};

module.exports = {
  defaultSupervisionPolicy,
  SupervisionActions
};

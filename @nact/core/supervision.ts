import { SupervisionContext } from "./actor";
import { Ref } from "./references";

export const SupervisionActions = {
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

export function defaultSupervisionPolicy(msg: any, err: any, ctx: SupervisionContext<any, any>, child: Ref | undefined = undefined) {
  let path = ctx.path.toString();
  if (child) {
    console.log(`${path}: The following error was escalated when raised by child '${child.path.parts[child.path.parts.length - 1]}' processing message %O:\n%O\nTerminating faulted actor`, msg, err);
  } else {
    console.log(`${path}: The following error was raised when processing message %O:\n%O\nTerminating faulted actor`, msg, err);
  }
  return ctx.stop;
};


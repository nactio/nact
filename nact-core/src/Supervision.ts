import { Context } from "./Context";

const escalate = Symbol('escalate')
const reset = Symbol('reset')
const resetAll = Symbol('resetAll')
const resume = Symbol('resume')
const stop = Symbol('stop')
const stopAll = Symbol('stopAll')

export type SupervisionAction =
  | typeof escalate
  | typeof reset
  | typeof resetAll
  | typeof resume
  | typeof stop
  | typeof stopAll

export const SupervisionActions: {
  escalate: SupervisionAction
  reset: SupervisionAction
  resetAll: SupervisionAction
  resume: SupervisionAction
  stop: SupervisionAction
  stopAll: SupervisionAction
} = Object.freeze({
  escalate,
  reset,
  resetAll,
  resume,
  stop,
  stopAll,
})

export type SupervisionContext<Msg, ParentMsg> = Context<Msg, ParentMsg> & typeof SupervisionActions

export type SupervisionPolicy<Msg, ParentMsg> = (
  msg: Msg | undefined,
  err: Error,
  ctx: SupervisionContext<Msg, ParentMsg>,
) => SupervisionAction | Promise<SupervisionAction>

export const defaultSupervisionPolicy: SupervisionPolicy<unknown, unknown> = (
  msg: any,
  err: Error,
  ctx: SupervisionContext<unknown, unknown>,
): SupervisionAction => {
  const path = ctx.path.toString()
  // tslint:disable-next-line: no-console
  console.error(
    `${path}: The following error was raised when processing message ${msg}:\n${err}\nTerminating faulted actor`,
    msg,
    err,
  )
  return ctx.stop
}

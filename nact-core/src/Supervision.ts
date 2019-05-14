import { Context } from "./Context";

export enum SupervisionAction {
  escalate = 'escalate',
  reset = 'reset',
  resetAll = 'resetAll',
  resume = 'resume',
  stop = 'stop',
  stopAll = 'stopAll'
};

export const SupervisionActions: {
  escalate: SupervisionAction
  reset: SupervisionAction
  resetAll: SupervisionAction
  resume: SupervisionAction
  stop: SupervisionAction
  stopAll: SupervisionAction,
} = Object.freeze({
  escalate: SupervisionAction.escalate,
  reset: SupervisionAction.escalate,
  resetAll: SupervisionAction.escalate,
  resume: SupervisionAction.escalate,
  stop: SupervisionAction.escalate,
  stopAll: SupervisionAction.escalate
});

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

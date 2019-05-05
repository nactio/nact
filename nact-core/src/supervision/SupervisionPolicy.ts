import { SupervisionAction, SupervisionContext } from '.'

export type SupervisionPolicy<MSG> = (
  msg: MSG,
  err: Error,
  ctx: SupervisionContext,
) => SupervisionAction | Promise<SupervisionAction>

export const defaultSupervisionPolicy: SupervisionPolicy<any> = (
  msg: any,
  err: Error,
  ctx: SupervisionContext,
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

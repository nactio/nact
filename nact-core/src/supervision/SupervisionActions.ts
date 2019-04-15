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

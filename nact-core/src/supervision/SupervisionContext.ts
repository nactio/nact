import { SupervisionActions } from '.'
import { Context } from '../actor'

export type SupervisionContext = Context & typeof SupervisionActions

import type { Fsm } from './fsm.js'
import type { GateResult } from './types.js'

export function gate (fsm: Fsm, toolName: string): GateResult {
  const result = fsm.isToolAllowed(toolName)

  if (result.isOk()) {
    return result.value
  }

  return {
    allowed: false,
    state: fsm.currentState,
    reason: result.error.message
  }
}

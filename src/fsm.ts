import { ok, err } from '@valencets/resultkit'
import type { Result } from '@valencets/resultkit'
import type { FsmConfig, FsmError, GateResult } from './types.js'

function patternToRegex (pattern: string): RegExp {
  if (pattern === '*') return /^.*$/
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const regexStr = escaped.replace(/\*/g, '.*')
  return new RegExp(`^${regexStr}$`)
}

function isToolMatchedByPatterns (toolName: string, patterns: ReadonlyArray<string>): boolean {
  return patterns.some(pattern => patternToRegex(pattern).test(toolName))
}

export class Fsm {
  private state: string
  private readonly config: FsmConfig

  constructor (config: FsmConfig) {
    this.config = config
    this.state = config.initialState
  }

  get currentState (): string {
    return this.state
  }

  getAllowedPatterns (): ReadonlyArray<string> {
    const stateConfig = this.config.states[this.state]
    if (!stateConfig) return []
    return stateConfig.allowedTools
  }

  isToolAllowed (toolName: string): Result<GateResult, FsmError> {
    const stateConfig = this.config.states[this.state]
    if (!stateConfig) {
      return err({
        kind: 'INVALID_STATE',
        message: `Current state "${this.state}" is not defined in config`
      })
    }

    const allowed = isToolMatchedByPatterns(toolName, stateConfig.allowedTools)
    const reason = allowed
      ? `Tool "${toolName}" is allowed in state "${this.state}"`
      : `Tool "${toolName}" is not allowed in state "${this.state}"`

    return ok({ allowed, state: this.state, reason })
  }

  transition (to: string): Result<string, FsmError> {
    if (!this.config.states[to]) {
      return err({
        kind: 'INVALID_STATE',
        message: `Target state "${to}" is not defined in config`
      })
    }

    const validTransition = this.config.transitions.some(t =>
      (t.from === this.state || t.from === '*') && t.to === to
    )

    if (!validTransition) {
      return err({
        kind: 'INVALID_TRANSITION',
        message: `No transition from "${this.state}" to "${to}"`
      })
    }

    this.state = to
    return ok(this.state)
  }
}

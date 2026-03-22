import { readFile } from 'node:fs/promises'
import { ok, err, ResultAsync } from '@valencets/resultkit'
import type { Result } from '@valencets/resultkit'
import type { FsmConfig, FsmError } from './types.js'

function validateConfig (data: FsmConfig): Result<FsmConfig, FsmError> {
  if (!data.initialState) {
    return err({ kind: 'CONFIG_ERROR', message: 'Missing required field: initialState' })
  }

  if (!data.states || Object.keys(data.states).length === 0) {
    return err({ kind: 'CONFIG_ERROR', message: 'Missing required field: states (must have at least one state)' })
  }

  if (!data.states[data.initialState]) {
    return err({
      kind: 'CONFIG_ERROR',
      message: `Initial state "${data.initialState}" is not defined in states`
    })
  }

  if (!data.transitions || !Array.isArray(data.transitions)) {
    return err({ kind: 'CONFIG_ERROR', message: 'Missing required field: transitions' })
  }

  for (const transition of data.transitions) {
    if (!transition.from || !transition.to || !transition.trigger) {
      return err({
        kind: 'CONFIG_ERROR',
        message: 'Each transition must have "from", "to", and "trigger" fields'
      })
    }
  }

  return ok(data)
}

export function loadConfig (filePath: string): ResultAsync<FsmConfig, FsmError> {
  return ResultAsync.fromPromise(
    readFile(filePath, 'utf-8'),
    (): FsmError => ({ kind: 'CONFIG_ERROR', message: `Failed to read config file: ${filePath}` })
  )
    .andThen((content): Result<FsmConfig, FsmError> => {
      const parsed = JSON.parse(content) as FsmConfig
      return validateConfig(parsed)
    })
}

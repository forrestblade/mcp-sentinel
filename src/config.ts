import { readFile } from 'node:fs/promises'
import { ok, err, fromThrowable, ResultAsync } from '@valencets/resultkit'
import type { Result } from '@valencets/resultkit'
import type { FsmConfig, FsmError } from './types.js'

const safeJsonParse = fromThrowable(
  (text: string) => JSON.parse(text) as unknown,
  (e): FsmError => ({ kind: 'CONFIG_ERROR', message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` })
)

function isRecord (value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateConfig (data: unknown): Result<FsmConfig, FsmError> {
  if (!isRecord(data)) {
    return err({ kind: 'CONFIG_ERROR', message: 'Config must be a JSON object' })
  }
  if (typeof data.initialState !== 'string' || data.initialState.length === 0) {
    return err({ kind: 'CONFIG_ERROR', message: 'Missing required string field: initialState' })
  }
  if (!isRecord(data.states) || Object.keys(data.states).length === 0) {
    return err({ kind: 'CONFIG_ERROR', message: 'Missing required field: states (must have at least one state)' })
  }
  if (data.states[data.initialState] === undefined) {
    return err({ kind: 'CONFIG_ERROR', message: `Initial state "${data.initialState}" is not defined in states` })
  }
  if (!Array.isArray(data.transitions)) {
    return err({ kind: 'CONFIG_ERROR', message: 'Missing required field: transitions (must be an array)' })
  }
  for (const t of data.transitions) {
    if (!isRecord(t) || typeof t.from !== 'string' || typeof t.to !== 'string' || typeof t.trigger !== 'string') {
      return err({ kind: 'CONFIG_ERROR', message: 'Each transition must have "from", "to", and "trigger" string fields' })
    }
  }
  return ok({
    initialState: data.initialState as string,
    states: data.states as FsmConfig['states'],
    transitions: data.transitions as FsmConfig['transitions']
  })
}

export function loadConfig (filePath: string): ResultAsync<FsmConfig, FsmError> {
  return ResultAsync.fromPromise(
    readFile(filePath, 'utf-8'),
    (): FsmError => ({ kind: 'CONFIG_ERROR', message: `Failed to read config file: ${filePath}` })
  )
    .andThen((content): Result<FsmConfig, FsmError> => {
      const parsed = safeJsonParse(content)
      if (parsed.isErr()) return err(parsed.error)
      return validateConfig(parsed.value)
    })
}

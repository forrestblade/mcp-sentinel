export interface StateConfig {
  readonly allowedTools: ReadonlyArray<string>
}

export interface Transition {
  readonly from: string
  readonly to: string
  readonly trigger: string
}

export interface FsmConfig {
  readonly initialState: string
  readonly states: Readonly<Record<string, StateConfig>>
  readonly transitions: ReadonlyArray<Transition>
}

export interface GateResult {
  readonly allowed: boolean
  readonly state: string
  readonly reason: string
}

export const FSM_ERROR_KINDS = ['INVALID_STATE', 'INVALID_TRANSITION', 'CONFIG_ERROR'] as const
export type FsmErrorKind = typeof FSM_ERROR_KINDS[number]

export interface FsmError {
  readonly kind: FsmErrorKind
  readonly message: string
}

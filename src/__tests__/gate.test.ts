import { describe, it, expect } from 'vitest'
import { Fsm } from '../fsm.js'
import { gate } from '../gate.js'
import type { FsmConfig } from '../types.js'

const testConfig: FsmConfig = {
  initialState: 'readonly',
  states: {
    readonly: {
      allowedTools: ['list_issues', 'get_issue', 'search_*']
    },
    readwrite: {
      allowedTools: ['*']
    },
    restricted: {
      allowedTools: ['get_issue']
    }
  },
  transitions: [
    { from: 'readonly', to: 'readwrite', trigger: 'manual' },
    { from: 'readwrite', to: 'readonly', trigger: 'manual' },
    { from: '*', to: 'restricted', trigger: 'manual' }
  ]
}

describe('gate', () => {
  it('returns allowed for permitted tools', () => {
    const fsm = new Fsm(testConfig)
    const result = gate(fsm, 'list_issues')

    expect(result.allowed).toBe(true)
    expect(result.state).toBe('readonly')
    expect(result.reason).toContain('allowed')
  })

  it('returns denied for unpermitted tools', () => {
    const fsm = new Fsm(testConfig)
    const result = gate(fsm, 'delete_issue')

    expect(result.allowed).toBe(false)
    expect(result.state).toBe('readonly')
    expect(result.reason).toContain('not allowed')
  })

  it('includes tool name in reason', () => {
    const fsm = new Fsm(testConfig)
    const result = gate(fsm, 'create_issue')

    expect(result.reason).toContain('create_issue')
  })

  it('includes state name in reason', () => {
    const fsm = new Fsm(testConfig)
    const result = gate(fsm, 'list_issues')

    expect(result.reason).toContain('readonly')
  })

  it('reflects state after transition', () => {
    const fsm = new Fsm(testConfig)
    fsm.transition('readwrite')

    const result = gate(fsm, 'delete_issue')
    expect(result.allowed).toBe(true)
    expect(result.state).toBe('readwrite')
  })

  it('handles wildcard patterns correctly', () => {
    const fsm = new Fsm(testConfig)

    const allowed = gate(fsm, 'search_anything')
    expect(allowed.allowed).toBe(true)

    const denied = gate(fsm, 'delete_anything')
    expect(denied.allowed).toBe(false)
  })

  it('returns denied with reason for invalid state', () => {
    const badConfig: FsmConfig = {
      initialState: 'valid',
      states: {
        valid: { allowedTools: [] }
      },
      transitions: []
    }
    const fsm = new Fsm(badConfig)
    ;(fsm as unknown as { state: string }).state = 'ghost'

    const result = gate(fsm, 'any_tool')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('ghost')
  })
})

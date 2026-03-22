import { describe, it, expect } from 'vitest'
import { Fsm } from '../fsm.js'
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
    },
    locked: {
      allowedTools: []
    }
  },
  transitions: [
    { from: 'readonly', to: 'readwrite', trigger: 'manual' },
    { from: 'readwrite', to: 'readonly', trigger: 'manual' },
    { from: '*', to: 'restricted', trigger: 'manual' },
    { from: 'restricted', to: 'readonly', trigger: 'manual' },
    { from: 'readonly', to: 'locked', trigger: 'manual' }
  ]
}

describe('Fsm', () => {
  it('starts in the initial state', () => {
    const fsm = new Fsm(testConfig)
    expect(fsm.currentState).toBe('readonly')
  })

  describe('isToolAllowed', () => {
    it('allows exact tool matches', () => {
      const fsm = new Fsm(testConfig)
      const result = fsm.isToolAllowed('list_issues')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.allowed).toBe(true)
        expect(result.value.state).toBe('readonly')
      }
    })

    it('denies tools not in allowlist', () => {
      const fsm = new Fsm(testConfig)
      const result = fsm.isToolAllowed('delete_issue')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.allowed).toBe(false)
      }
    })

    it('supports wildcard pattern matching', () => {
      const fsm = new Fsm(testConfig)

      const searchIssues = fsm.isToolAllowed('search_issues')
      expect(searchIssues.isOk()).toBe(true)
      if (searchIssues.isOk()) {
        expect(searchIssues.value.allowed).toBe(true)
      }

      const searchUsers = fsm.isToolAllowed('search_users')
      expect(searchUsers.isOk()).toBe(true)
      if (searchUsers.isOk()) {
        expect(searchUsers.value.allowed).toBe(true)
      }
    })

    it('allows all tools with * pattern', () => {
      const fsm = new Fsm(testConfig)
      fsm.transition('readwrite')

      const result = fsm.isToolAllowed('anything_at_all')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.allowed).toBe(true)
      }
    })

    it('denies all tools with empty allowlist', () => {
      const fsm = new Fsm(testConfig)
      fsm.transition('locked')

      const result = fsm.isToolAllowed('get_issue')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.allowed).toBe(false)
      }
    })

    it('returns error for undefined state', () => {
      const badConfig: FsmConfig = {
        initialState: 'nonexistent',
        states: {
          nonexistent: { allowedTools: [] }
        },
        transitions: [
          { from: 'nonexistent', to: 'ghost', trigger: 'manual' }
        ]
      }
      const fsm = new Fsm(badConfig)
      // Force state to something invalid
      ;(fsm as unknown as { state: string }).state = 'ghost'

      const result = fsm.isToolAllowed('any_tool')
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.kind).toBe('INVALID_STATE')
      }
    })
  })

  describe('transition', () => {
    it('transitions between valid states', () => {
      const fsm = new Fsm(testConfig)
      expect(fsm.currentState).toBe('readonly')

      const result = fsm.transition('readwrite')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe('readwrite')
      }
      expect(fsm.currentState).toBe('readwrite')
    })

    it('supports wildcard from transitions', () => {
      const fsm = new Fsm(testConfig)
      fsm.transition('readwrite')
      expect(fsm.currentState).toBe('readwrite')

      const result = fsm.transition('restricted')
      expect(result.isOk()).toBe(true)
      expect(fsm.currentState).toBe('restricted')
    })

    it('rejects transition to undefined state', () => {
      const fsm = new Fsm(testConfig)
      const result = fsm.transition('nonexistent')
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.kind).toBe('INVALID_STATE')
      }
      expect(fsm.currentState).toBe('readonly')
    })

    it('rejects invalid transition path', () => {
      const fsm = new Fsm(testConfig)
      const result = fsm.transition('locked')
      expect(result.isOk()).toBe(true)
      expect(fsm.currentState).toBe('locked')

      // locked has no outbound transitions (except * -> restricted)
      const result2 = fsm.transition('readwrite')
      expect(result2.isErr()).toBe(true)
      if (result2.isErr()) {
        expect(result2.error.kind).toBe('INVALID_TRANSITION')
      }
    })

    it('chains multiple transitions', () => {
      const fsm = new Fsm(testConfig)

      fsm.transition('readwrite')
      expect(fsm.currentState).toBe('readwrite')

      fsm.transition('readonly')
      expect(fsm.currentState).toBe('readonly')

      fsm.transition('restricted')
      expect(fsm.currentState).toBe('restricted')

      fsm.transition('readonly')
      expect(fsm.currentState).toBe('readonly')
    })
  })

  describe('getAllowedPatterns', () => {
    it('returns the allowed tool patterns for current state', () => {
      const fsm = new Fsm(testConfig)
      expect(fsm.getAllowedPatterns()).toEqual(['list_issues', 'get_issue', 'search_*'])
    })

    it('returns empty array for state with no tools', () => {
      const fsm = new Fsm(testConfig)
      fsm.transition('locked')
      expect(fsm.getAllowedPatterns()).toEqual([])
    })
  })
})

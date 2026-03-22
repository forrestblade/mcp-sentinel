import { describe, it, expect } from 'vitest'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadConfig } from '../config.js'

const testDir = join(tmpdir(), 'mcp-sentinel-test')

async function writeTestConfig (filename: string, content: string): Promise<string> {
  await mkdir(testDir, { recursive: true })
  const filePath = join(testDir, filename)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}

async function cleanup (filePath: string): Promise<void> {
  try {
    await unlink(filePath)
  } catch {
    // ignore cleanup errors
  }
}

describe('loadConfig', () => {
  it('loads a valid config file', async () => {
    const config = {
      initialState: 'readonly',
      states: {
        readonly: { allowedTools: ['get_issue'] },
        readwrite: { allowedTools: ['*'] }
      },
      transitions: [
        { from: 'readonly', to: 'readwrite', trigger: 'manual' }
      ]
    }
    const filePath = await writeTestConfig('valid.json', JSON.stringify(config))

    const result = await loadConfig(filePath)
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.initialState).toBe('readonly')
      expect(Object.keys(result.value.states)).toEqual(['readonly', 'readwrite'])
      expect(result.value.transitions).toHaveLength(1)
    }

    await cleanup(filePath)
  })

  it('returns error for missing file', async () => {
    const result = await loadConfig('/nonexistent/path/config.json')
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.kind).toBe('CONFIG_ERROR')
      expect(result.error.message).toContain('Failed to read')
    }
  })

  it('returns error for missing initialState', async () => {
    const config = {
      initialState: '',
      states: {
        readonly: { allowedTools: [] }
      },
      transitions: []
    }
    const filePath = await writeTestConfig('no-initial.json', JSON.stringify(config))

    const result = await loadConfig(filePath)
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.kind).toBe('CONFIG_ERROR')
      expect(result.error.message).toContain('initialState')
    }

    await cleanup(filePath)
  })

  it('returns error for empty states', async () => {
    const config = {
      initialState: 'readonly',
      states: {},
      transitions: []
    }
    const filePath = await writeTestConfig('empty-states.json', JSON.stringify(config))

    const result = await loadConfig(filePath)
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.kind).toBe('CONFIG_ERROR')
      expect(result.error.message).toContain('states')
    }

    await cleanup(filePath)
  })

  it('returns error when initialState is not in states', async () => {
    const config = {
      initialState: 'nonexistent',
      states: {
        readonly: { allowedTools: [] }
      },
      transitions: []
    }
    const filePath = await writeTestConfig('bad-initial.json', JSON.stringify(config))

    const result = await loadConfig(filePath)
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.kind).toBe('CONFIG_ERROR')
      expect(result.error.message).toContain('nonexistent')
    }

    await cleanup(filePath)
  })

  it('returns error for transitions missing required fields', async () => {
    const config = {
      initialState: 'readonly',
      states: {
        readonly: { allowedTools: [] }
      },
      transitions: [
        { from: 'readonly', to: 'readonly' }
      ]
    }
    const filePath = await writeTestConfig('bad-transition.json', JSON.stringify(config))

    const result = await loadConfig(filePath)
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.kind).toBe('CONFIG_ERROR')
      expect(result.error.message).toContain('trigger')
    }

    await cleanup(filePath)
  })
})

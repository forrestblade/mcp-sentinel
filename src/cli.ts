import { resolve } from 'node:path'
import { loadConfig } from './config.js'
import { Fsm } from './fsm.js'
import { gate } from './gate.js'

const COMMANDS: Readonly<Record<string, (fsm: Fsm, args: ReadonlyArray<string>) => void>> = {
  status: (fsm) => {
    const patterns = fsm.getAllowedPatterns()
    console.log(`State: ${fsm.currentState}`)
    console.log(`Allowed tools: ${patterns.length > 0 ? patterns.join(', ') : '(none)'}`)
  },

  transition: (fsm, args) => {
    const targetState = args[0]
    if (!targetState) {
      console.error('Usage: mcp-sentinel transition <state>')
      process.exitCode = 1
      return
    }

    const result = fsm.transition(targetState)

    if (result.isOk()) {
      console.log(`Transitioned to: ${result.value}`)
    } else {
      console.error(`Error: ${result.error.message}`)
      process.exitCode = 1
    }
  },

  gate: (fsm, args) => {
    const toolName = args[0]
    if (!toolName) {
      console.error('Usage: mcp-sentinel gate <tool-name>')
      process.exitCode = 1
      return
    }

    const result = gate(fsm, toolName)
    console.log(`Allowed: ${result.allowed}`)
    console.log(`State: ${result.state}`)
    console.log(`Reason: ${result.reason}`)

    if (!result.allowed) {
      process.exitCode = 1
    }
  }
}

export async function run (argv: ReadonlyArray<string>): Promise<void> {
  const command = argv[0]
  const commandArgs = argv.slice(1)

  if (!command) {
    console.error('Usage: mcp-sentinel <status|transition|gate> [args...]')
    process.exitCode = 1
    return
  }

  const handler = COMMANDS[command]
  if (!handler) {
    console.error(`Unknown command: ${command}`)
    console.error('Available commands: status, transition, gate')
    process.exitCode = 1
    return
  }

  const configPath = resolve(process.cwd(), '.mcp-sentinel.json')
  const configResult = await loadConfig(configPath)

  if (configResult.isErr()) {
    console.error(`Config error: ${configResult.error.message}`)
    process.exitCode = 1
    return
  }

  const fsm = new Fsm(configResult.value)
  handler(fsm, commandArgs)
}

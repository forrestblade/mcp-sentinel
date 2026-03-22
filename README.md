# mcp-sentinel

State-based tool gating for MCP servers. Define which tools are allowed in each state via a simple FSM config.

## Install

```bash
npm install -g mcp-sentinel
```

## Configuration

Create `.mcp-sentinel.json`:

```json
{
  "initialState": "readonly",
  "states": {
    "readonly": { "allowedTools": ["list_*", "get_*", "search_*"] },
    "readwrite": { "allowedTools": ["*"] },
    "restricted": { "allowedTools": ["get_issue"] }
  },
  "transitions": [
    { "from": "readonly", "to": "readwrite", "trigger": "manual" },
    { "from": "*", "to": "restricted", "trigger": "manual" }
  ]
}
```

## CLI

```bash
mcp-sentinel status              # show current state + allowed tools
mcp-sentinel transition readwrite # change state
mcp-sentinel gate list_issues    # test if a tool would be allowed
```

## Library

```typescript
import { Fsm, gate, loadConfig } from 'mcp-sentinel'

const config = await loadConfig('.mcp-sentinel.json')
const fsm = new Fsm(config.unwrap())

const result = gate(fsm, 'list_issues')
// { allowed: true, state: 'readonly', reason: 'Tool matches pattern list_*' }
```

## Requirements

- Node.js >= 22, ESM only

## License

MIT

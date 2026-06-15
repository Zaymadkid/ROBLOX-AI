# ROBLOX AI

A standalone toolset for Roblox game vulnerability research and AI-powered automation. Two MCP servers that work as a pair — the **Instance Manager** handles process lifecycle (launch, auth, game joining, crash recovery) while the **Executor** handles in-game operations (execute Luau, decompile scripts, spy remotes, GUI interaction).

## Architecture

```
A User / AI Client (OpenCode, Claude Desktop, Cursor, Windsurf)
  |-- roblox-instance-manager MCP     (process lifecycle)
  |      |-- launch Roblox processes
  |      |-- cookie-based account auth
  |      |-- join games via robloclient://
  |      |-- health monitoring
  |      |-- crash recovery + restart
  |      |-- integrated dashboard (port 16385)
  |
  |-- roblox-executor-mcp MCP          (in-game operations)
        |-- execute Luau code
        |-- get-data-by-code (return values)
        |-- decompile scripts
        |-- remote spy (RemoteEvent/Function)
        |-- script grep + semantic search
        |-- instance search (CSS-like selectors)
        |-- click buttons, type text
        |-- screenshot windows
        |-- bridge: primary/secondary + WebSocket relay (port 16384)
```

### Primary/Secondary Bridge

Both servers use a leader-election system on port 16384:
- **Primary** — hosts the HTTP server + WebSocket server, handles all tool dispatch
- **Secondary** — connects to primary via WebSocket relay, forwards tool requests
- If primary crashes, a secondary auto-promotes to take over (jittered to avoid split-brain)
- `--baseurl` flag lets secondaries connect to a remote primary

## Contents

|| Directory || Description ||
|-----------||-------------||
| `roblox-instance-manager/` || Process lifecycle MCP server (launch, auth, join, health, accounts) ||
| `roblox-executor-mcp-real/` || In-game operations MCP server (execute, spy, decompile, search) ||
| `chrome-extension/` || Browser extension to grab .ROBLOSECURITY token from roblox.com ||
| `docs/` || Superpowers plans and design specs ||

## Prerequisites

- **Node.js 18+** (required for both MCP servers)
- **Python 3.10+** (for semantic search embeddings)
- **Roblox client** installed (`RobloxPlayerBeta.exe`)
- **An MCP-supporting AI client** — OpenCode, Claude Desktop, Cursor, Windsurf, etc.
- **OpenRouter API key** (optional, for semantic search features)

## Setup

```bash
# 1. Executor — in-game operations
cd roblox-executor-mcp-real
npm install
npm Run build
npm run install:harnesses   # install Roblox execution harnesses

# 2. Instance Manager — process lifecycle
cd ../roblox-instance-manager
npm install
npm Run build

# 3. Chrome Extension (optional)
# Load chrome-extension/ as an unpacked extension in Chrome/Edge
# Use it to grab .ROBLOSECURITY cookies from roblox.com
```

## MCP Configuration

### OpenCode (`opencode.jsonc`)

```jsonc
{
  "mcpServers": {
    "roblox-executor": {
      "command": "node",
      "args": ["C:/path/to/ROBLOX AI/roblox-executor-mcp-real/dist/index.js"]
    },
    "roblox-instance-manager": {
      "command": "node",
      "args": ["C:/path/to/ROBLOX AI/roblox-instance-manager/dist/index.js"]
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "roblox-executor": {
      "command": "node",
      "args": ["C:/path/to/ROBLOX AI/roblox-executor-mcp-real/dist/index.js"]
    },
    "roblox-instance-manager": {
      "command": "node",
      "args": ["C:/path/to/ROBLOX AI/roblox-instance-manager/dist/index.js"]
    }
  }
}
```

### Cursor / Windsurf

Add both as MCP servers in the settings UI, pointing to the respective `dist/index.js` files.

## Workflow

```
1. manage_accounts add ↔ store a Roblox account (alias + .ROBLOSECURITY)
2. launch_client ↔ spawn Roblox with that account
3. join_game ↔ teleport into a specific place
4. get_executor_info — verify executor MCP is connected
5. Use executor tools: execute, script-grep, remote-spy, search-instances, etc.
6. Analyze → Develop → Test → Report
```

## Tools Reference

### roblox-instance-manager (9 tools)

|| Tool || Description ||
|--------|------------||
| `launch_client` || Launch Roblox with a stored account. Finds RobloxPlayerBeta.exe, injects auth cookie. Optional instant place join. ||
| `join_game` || Teleport a running client to a game via `robloclient://` protocol URL ||
| `list_clients` || List all managed clients with PID, account, place, status, uptime ||
| `get_client_status` || Detailed health check for a specific client (process alive, memory, uptime) ||
| `restart_client` || Kill and relaunch a client with the same account (keeps same clientId) ||
| `close_client` || Gracefully close a client (SIGTERM → taskkill fallback) ||
| `manage_accounts` || CRUD for stored Roblox accounts (cookies encrypted at rest with AES-256-GCM) ||
| `take_screenshot` || Full-screen screenshot via PowerShell (returns PNG file path) ||
| `get_executor_info` || Check if executor MCP is running and list available tools ||

### roblox-executor-mcp (21 tools)

|| Tool || Description ||
|---------||------------||
| `execute` || Run Luau code in a connected Roblox client ||
| `get_data_by_code` || Run Luau and return serialized values ||
| `execute_file` || Run a .luau/.lua file in a client ||
| `get_script_content` || Decompile a script by path or script proxy ||
| `script_grep` || Search decompiled scripts with regex ||
| `semantic_search_scripts` || Find scripts by natural-language behavior description ||
| `search_instances` || Find game objects with CSS-like selectors (Part.Tagged[Anchored=false]) ||
| `get_descendants_tree` || Get depth-limited instance herarchy ||
| `get_game_info` || Get current place/universe metadata ||
| `get_console_output` || Read Roblox developer console logs ||
| `ensure_remote_spy` || Load Cobalt remote spy ||
| `get_remote_spy_logs` || View captured RemoteEvent/Function calls ||
| `block_remote` || Block a remote by name and direction ||
| `ignore_remote` || Ignore logging for a remote (still fires) ||
| `clear_remote_spy_logs` || Clear captured spy logs ||
| `click_button` || Click a TextButton/ImageButton by path ||
| `type_text_box` || Type text into a TextBox (keystrokes or direct set) ||
| `list_clients` || List connected Roblox clients ||
| `set_active_client` || Set which connected client receives tool calls ||
| `list_roblox_windows` || List visible Roblox OS windows with PIDs ||
| `screenshot_window` || Capture a Roblox OS window screenshot ||

## Account Management

Cookies (`.ROBLOSECURITY`) are stored encrypted at rest using **AES-256-GCM** with a machine-derived key. No master password needed.

### Getting your .ROBLOSECURITY cookie

1. Open Chrome/Edge and go to roblox.com (logged in)
2. F12 — Application tab — Cookies — `https://www.roblox.com`
3. Copy the `.ROBLOSECURITY` value
4. Or use the Chrome extension (load `chrome-extension/` as unpacked) to auto-grab it

### CLI via manage_accounts tool

```json
{
  "action": "add",
  "alias": "alt1",
  "cookie": "_|WARNING:-DO-NOT-SHARE..."
}
```

## Dashboard

Both servers include an integrated web dashboard:

|| Server || Dashboard URL ||
|----------|--------------||
| Executor || http://localhost:16384/ ||
| Instance Manager || http://localhost:16385/ ||

The dashboard shows:
- Connected clients and their status
- Account list
- Executor health
- Script sources and semantic search status
- Server logs

## Chrome Extension

The `chrome-extension/` folder contains a browser extension that:
1. Reads `.ROBLOSECURITY` from roblox.com cookies
2. Syncs it to the Instance Manager's HTTP API
3. Also supports copy-to-clipboard

**Load it**: Chrome → Extensions → Load unpacked → select `chrome-extension/`

## Security

- Account cookies encrypted at rest (AES-256-GCM)
- MCP uses stdio transport only (no network exposure)
- Dashboard binds to 127.0.0.1 only
- No authentication needed (local-only)
- Never commit `.env` or cookie files

## License

MIT

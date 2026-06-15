# Roblox Instance Manager MCP Server — Design Spec

## Overview

A standalone MCP server that manages Roblox **client processes** — launching, account auth, game joining, health monitoring, and crash recovery. Runs alongside the existing **roblox-executor-mcp** server (the "normal Roblox MCP tool"). The two MCP servers work as a pair:

| Server | Role | What it does |
|--------|------|-------------|
| **roblox-instance-manager** (this one) | Process lifecycle | Launch clients, join games, health, accounts |
| **roblox-executor-mcp** (existing) | In-game operations | Execute Luau, decompile scripts, spy remotes, click buttons |

The AI agent chains them: launch a client → join a game → use executor to analyze → develop features → test → report.

**This server always mentions the executor MCP in its description** so any AI client knows both tools are available.

## Architecture

```
User / AI Client
  ├── roblox-instance-manager MCP   (client lifecycle)
  │     ├── launch Roblox processes
  │     ├── cookie-based account auth
  │     ├── join games
  │     ├── health monitoring
  │     └── crash recovery + restart
  │
  └── roblox-executor-mcp           (in-game operations)
        ├── execute Luau
        ├── decompile scripts
        ├── remote spy
        ├── instance search
        └── GUI interaction
```

**Coordination:** When Instance Manager launches a client, it optionally registers it with the Executor MCP (via HTTP API at `localhost:16384`). The AI sees both tool sets and chains them naturally.

## Tools

### `launch_client`
- Launches a Roblox process with a given account
- Parameters: `account` (alias from account store), `placeId` (optional, immediate join)
- Returns: `clientId`, `pid`, `status`
- Behavior: Injects auth cookie, waits for process to stabilize

### `join_game`
- Directs a running client to join a specific experience
- Parameters: `clientId`, `placeId`
- Returns: join status
- Uses Roblox game launch protocol or executor bridge

### `list_clients`
- Lists all running managed clients
- Returns: array of `{ clientId, pid, accountName, currentPlace, status, uptime }`

### `get_client_status`
- Health check for a specific client
- Returns: process alive, memory, cpu, current place, last seen

### `restart_client`
- Kills and relaunches a client with same account
- Parameters: `clientId`
- Returns: new `clientId`, `pid`

### `close_client`
- Gracefully closes a client
- Parameters: `clientId`

### `manage_accounts`
- CRUD for stored accounts (encrypted)
- Parameters: `action` (add/list/remove), `alias`, `cookie`
- Returns: account list (without full cookies)

### `take_screenshot`
- Screenshots a specific client window
- Parameters: `clientId`
- Returns: base64 PNG or file path

### `get_executor_info`
- Returns information about the connected roblox-executor-mcp server
- Parameters: none
- Returns: executor MCP status (running/not found), URL, list of available executor tools
- Purpose: lets the AI confirm the executor MCP is available for in-game operations

## Executor MCP Integration

The AI client (Claude Code, Cursor, etc.) has **both MCP servers configured**. The executor MCP provides these tools for in-game operations:

| Tool | Purpose |
|------|---------|
| `execute` | Run Luau code in a connected client |
| `get-data-by-code` | Run Luau and return data |
| `execute-file` | Run a .luau/.lua file in a client |
| `get-script-content` | Decompile a script by path |
| `script-grep` | Search decompiled scripts |
| `semantic-search-scripts` | Find scripts by behavior description |
| `search-instances` | Find game objects with CSS-like selectors |
| `get-descendants-tree` | Get instance hierarchy |
| `ensure-remote-spy` | Load remote spy |
| `get-remote-spy-logs` | View captured remote calls |
| `block-remote` / `ignore-remote` | Filter remote calls |
| `click-button` / `type-text-box` | GUI interaction |
| `list-clients` / `set-active-client` | Client management |
| `list-roblox-windows` / `screenshot-window` | Window ops |

The Instance Manager adds process lifecycle management that the executor MCP lacks. Together they give the AI full control: **launch → join → analyze → develop → test → verify**.

## Account Storage

Encrypted JSON file at `~/.roblox-instance-manager/accounts.json`.

Format:
```json
{
  "alt1": { "cookie": "<encrypted>", "created": "<date>", "lastUsed": "<date>" },
  "alt2": { "cookie": "<encrypted>", "created": "<date>", "lastUsed": "<date>" }
}
```

Encryption: AES-256-GCM with a machine-derived key (no master password prompt needed in MVP).

## Process Management

- Launches RobloxPlayerBeta.exe directly
- Injects `.ROBLOSECURITY` cookie via command-line args or process env
- Monitors process health via Windows job objects or periodic polling
- Auto-restart threshold: configurable (default 3 restarts before reporting failure)
- Each client assigned a unique `clientId` (UUID)

## Game Joining

Single method (MVP):
- **Roblox protocol** — launches `roblox://placeId-experienceId` URL scheme via `start` command on Windows
- The URL is passed to the already-running Roblox process, which handles the teleport
- If the client isn't running, teleport fails with a clear error
- Future enhancement: use executor bridge via the executor MCP's HTTP API to run teleport scripts, but not in MVP

## Cross-MCP Coordination

- Instance Manager announces new clients via the Executor MCP's HTTP API at `localhost:16384/api/tool` — calling the executor's `register-client` equivalent to register the PID and alias so executor tools can target them
- Both MCP servers are configured in the AI client's MCP settings independently
- The AI client sees both tool sets and chains them naturally: `launch_client` → `join_game` → then executor tools for in-game operations
- `get_executor_info` lets the AI confirm the executor MCP is running and what tools it has
- No shared state file needed — coordination happens through the executor's existing HTTP API
- **Critical design rule:** the Instance Manager always references the executor MCP in its server description so any AI client knows they work as a pair

## Project Structure

```
roblox-instance-manager/
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md          # tracks progress per session
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── config.ts         # CLI args, config loading
│   ├── tools/
│   │   ├── index.ts      # register all tools
│   │   ├── schemas.ts    # Zod schemas for tools
│   │   └── impl/
│   │       ├── launch-client.ts
│   │       ├── join-game.ts
│   │       ├── list-clients.ts
│   │       ├── client-status.ts
│   │       ├── restart-client.ts
│   │       ├── close-client.ts
│   │       ├── manage-accounts.ts
│   │       ├── screenshot.ts
│   │       └── executor-info.ts
│   ├── process/
│   │   ├── manager.ts    # process lifecycle management
│   │   └── launcher.ts   # Roblox launcher (cookie injection, args)
│   ├── accounts/
│   │   ├── store.ts      # encrypted account storage
│   │   └── crypto.ts     # AES-256-GCM encryption
│   └── bridge/
│       └── coordinator.ts # talk to executor MCP
└── dist/                 # built output
```

## Security

- Account cookies encrypted at rest (AES-256-GCM)
- MCP stdio transport only (no network exposure)
- Port 16384 is the executor MCP's domain — not duplicated here
- No authentication needed (same model as executor MCP — local-only)

## Edge Cases

| Case | Behavior |
|------|----------|
| Roblox not installed | Descriptive error with install instructions |
| Invalid cookie | Error reported, account marked as failed |
| Client crashes | Auto-restart (up to threshold), then report |
| Multiple Roblox with same account | Warn, don't prevent |
| Cookie expires | Error on join attempt, user re-auths |
| Windows user switching | Process may be invalidated, detected on next health check |
| Place ID invalid | Error from Roblox client, retry not automatic |

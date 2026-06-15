# Roblox Executor MCP Server

An MCP server that allows Agents to interact with a running Roblox game client — execute code, inspect scripts, spy on remotes, and more.

## Dashboard

http://localhost:16384/

## Features

- **Code Execution** — Run Lua code and fetch data from the game client.
- **Script Inspection** — Decompile scripts and search across all sources.
- **Instance Search** — CSS-like selectors and hierarchy trees.
- **Remote Spy** — Intercept, log, block, and ignore Remotes/Bindables (self-hosted).
- **GUI Interaction** — Click buttons and type into text boxes.
- **Screenshot** — Capture Roblox window screenshots (Windows only).
- **Multi-Client** — Connect multiple Roblox clients at once.
- **Primary / Secondary** — Multiple MCP instances auto-coordinate with automatic promotion.

## Quick Start

```bash
git clone https://github.com/Zaymadkid/ROBLOX-AI.git
cd ROBLOX-AI/roblox-executor-mcp-real
npm install
npm Run build
npm run install:harnesses
```

## Connect from Roblox

```lua
local bridgeUrl = getgenv().BridgeURL or "localhost:16384"
loadstring(game:HttpGet("http://" .. bridgeUrl .. "/script.luau"))()
```

## Security

This server allows arbitrary code execution. Only use with AI clients you trust. Port 16384 has no authentication — never expose it to the internet.

## License

MIT

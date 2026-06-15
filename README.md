# ROBLOX AI

Standalone toolset for Roblox game vulnerability research and AI-powered automation.

## Contents

| Directory | Description |
|-----------|-------------|
| `roblox-instance-manager/` | Launch/manage Roblox clients, execute Luau, spy remotes, decompile scripts, search instances, GUI automation |
| `chrome-extension/` | Browser extension utilities |

## Requirements

- Node.js 18+
- Roblox game client
- An MCP-supporting AI client (OpenCode, Claude Desktop, Cursor, etc.)

## Setup

```bash
cd roblox-instance-manager
npm install
npm run build
```

Then add to your AI client's MCP config like:

```jsonc
{
  "mcpServers": {
    "roblox-instance-manager": {
      "command": "node",
      "args": ["C:/path/to/ROBLOX AI/roblox-instance-manager/dist/index.js"]
    }
  }
}
```

## AI Setup Prompt

Give this to any AI to auto-configure:

---
You are setting up a Roblox vulnerability research environment. Follow these steps:
1. Open the folder `ROBLOX AI/roblox-instance-manager`
2. Run `npm install` then `npm run build`
3. Configure the MCP server in your AI client's settings (see README.md for config)
4. Verify the server connects successfully
Do NOT create startup scripts or batch files. Manual setup only.
---

## Tools

The roblox-instance-manager provides tools for:
- **Client Management**: Launch, close, restart Roblox clients, join games
- **Execution**: Run Luau in the client, decompile scripts
- **Spy**: Monitor RemoteEvent/RemoteFunction calls
- **Analysis**: Search instances, grep scripts, semantic search
- **UI**: Click buttons, type text, screenshot windows
- **Accounts**: Manage stored Roblox accounts (encrypted)

## License

MIT
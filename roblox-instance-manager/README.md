# Roblox Instance Manager & Executor (Unified MCP)

> [!NOTE]
> **Status: Fully Completed, Integrated, and Multi-Instance Tested (June 15, 2026)**
> The codebase has been fully unified onto port `16384`. The Chrome Extension, Web Dashboard, and authenticated ticket launches are complete and verified with up to three concurrent accounts running side-by-side using Fishstrap registry routing.

A unified Model Context Protocol (MCP) server that manages **Roblox client processes** (launching, joining, accounts) and handles **in-game operations** (executing Luau, decompiling scripts, spying on remotes, GUI interactions). 

It features an integrated premium web dashboard and a Chrome extension for automated account/cookie synchronization.

---

## Key Features

1. **Unified Server & Single Port**: Both process-lifecycle tools and executor tools are merged onto a single port (`16384`) using a unified HTTP/WebSocket server.
2. **Integrated Premium Web Dashboard**: Open [http://localhost:16384/](http://localhost:16384/) in your browser to view client statuses, active processes, account avatars, and control instances (restart/close) via a premium dark glassmorphic interface.
3. **Browser Token Sync Extension**: An unpacked Chrome extension located in `chrome-extension/` lets you sync `.ROBLOSECURITY` session cookies from roblox.com to the manager with one click.
4. **Native Authenticated Client Launch**: Decrypts stored cookies to negotiate one-time `rbx-authentication-ticket` tokens from Roblox, spawning clients logged into the correct profile automatically.

---

## Quick Start

### 1. Build and Run Server
```bash
# Install dependencies
npm install

# Compile TypeScript and copy assets
npm run build

# Start the unified MCP server
npm start
```

### 2. Install the Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** (top-left).
4. Choose the `chrome-extension/` directory in this workspace:
   `c:\Users\fpsko\Downloads\ROBLOX AI\chrome-extension`
5. Go to [roblox.com](https://www.roblox.com), open the extension popup, enter an alias (e.g. `alt1`), and sync your session cookie!

---

## MCP Configuration

Add this server to your AI editor or agent configuration.

### Cursor / Windsurf
Add a new MCP tool:
- **Name**: `roblox-executor`
- **Type**: `command`
- **Command**: `node`
- **Args**: `c:\Users\fpsko\Downloads\ROBLOX AI\roblox-instance-manager\dist\index.js`

### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "roblox-executor": {
      "command": "node",
      "args": ["c:\\Users\\fpsko\\Downloads\\ROBLOX AI\\roblox-instance-manager\\dist\\index.js"]
    }
  }
}
```

---

## Available Tools

The server registers **25 tools** across process management and executor categories:

### Process Lifecycle Tools
- `launch_client`: Launch Roblox player authenticated with a stored account alias.
- `join_game`: Direct a running client window to join a place.
- `list_clients`: List managed clients, PIDs, active profiles, and uptimes.
- `get_client_status`: View details and check the health of a client.
- `restart_client`: Kill and relaunch a client (generates a fresh auth ticket).
- `close_client`: Gracefully close a client window.
- `manage_accounts`: Encrypt/store/delete account aliases and `.ROBLOSECURITY` cookies.
- `take_screenshot`: Capture a screenshot of the client's window.

### Executor & In-Game Tools
- `execute` / `execute-file`: Run Luau scripts in the active Roblox client.
- `get-console-output`: Fetch developer console logs from the client.
- `search-instances`: Search for active instances in the game data tree.
- `get-descendants-tree`: Retrieve the workspace/game hierarchy.
- `ensure-remote-spy` / `get-remote-spy-logs`: Intercept RemoteEvent and RemoteFunction traffic.
- `click-button` / `type-text-box`: Simulate input on Roblox GUI elements.
- `screenshot-window`: Take a window screenshot via executor.
- `script-grep` / `semantic-search-scripts`: Search through in-game scripts.

---

## Architecture & Security

- **AES-256-GCM Encryption**: Account cookies are encrypted at rest using keys derived from your machine's hardware parameters.
- **Single HTTP Router**: Hosts the web dashboard (`/`), APIs (`/api/accounts`, `/api/clients`), and WebSocket bridge all on port `16384` to match standard Luau executor hooks.

---

## 👥 Multi-Instance (Side-by-Side) Account Setup

The manager supports launching multiple Roblox instances concurrently. To set this up:

### 1. Enable Multi-Instance in your Bootstrapper
If you are using a custom launcher/bootstrapper like **Fishstrap** or **Bloxstrap** (which are automatically detected and used by this manager via the registry):
1. Open the bootstrapper's settings panel.
2. Under the **Behavior** or settings tab, find and toggle **Multi-Instance** or **Allow Multiple Instances** to **On** (accept the disclaimer warning).

### 2. Add and Keep Multiple Accounts Active
Roblox automatically invalidates a `.ROBLOSECURITY` session cookie on their servers the moment you click **"Log Out"** in your browser. To add multiple accounts to the database without invalidating them:
- **First Profile (`alt1`)**: Log into Roblox, open the extension popup, enter `alt1` as alias, and click **Sync**. **Do NOT click Log Out on the website.**
- **Second Profile (`alt2`)**: Log into your second account in a **New Private/Incognito Window** (Opera: enable "Allow in private mode" on extension first, Chrome/Edge: open Incognito), type `alt2` in the extension box, and click **Sync**.
- **Third Profile (`alt3`)**: Open another separate Private window or use a different browser/profile, log into the third account, type `alt3` in the extension box, and click **Sync**.

Once all profiles are synced, you can call `launch_client` sequentially for each alias, and they will open in separate windows side-by-side!

# Changelog

## v1.1.0 (2026-06-15)

### Unified Server & Premium Upgrades
- **Unified Port & Process**: Merged the Roblox Executor MCP tools directly into this server, running both API/WebSocket relays and all 25 tools on port `16384`.
- **Premium Web Dashboard**: Replaced the basic table view with a premium dark-mode, glassmorphic UI featuring active stats counters, circular Roblox profile avatars, and click-to-trigger control actions (restart, close, copy).
- **Chrome Token Sync Extension**: Added a custom Google Chrome extension under `chrome-extension/` to query, extract, and automatically sync `.ROBLOSECURITY` cookies from roblox.com to the local instance manager database.
- **Native Authenticated Launches**: Implemented a two-step `X-CSRF-TOKEN` and authentication ticket exchange (`auth.roblox.com`) to spawn Roblox Player instances logged into the correct profile automatically.

## v1.0.0 (2026-06-15)

### Initial build
- MCP server for managing Roblox client processes
- Tools: launch_client, join_game, list_clients, get_client_status, restart_client, close_client, manage_accounts, take_screenshot, get_executor_info
- AES-256-GCM encrypted account storage machine-bound
- Roblox launcher with auto-discovery of RobloxPlayerBeta.exe
- Process manager with health checking and auto-restart
- Executor MCP coordinator (checks status, lists tools)
- Cross-MCP coordination support — references roblox-executor-masp throughout
- Dashboard at http://localhost:16385/ with live client/account status

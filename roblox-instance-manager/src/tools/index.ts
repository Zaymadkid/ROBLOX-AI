import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AccountStore } from "../accounts/store.js";
import { ProcessManager } from "../process/manager.js";
import { ExecutorCoordinator } from "../bridge/coordinator.js";
import { ScriptLibrary } from "../scripts/library.js";
import { handleLaunchClient } from "./impl/launch-client.js";
import { handleJoinGame } from "./impl/join-game.js";
import { handleListClients } from "./impl/list-clients.js";
import { handleClientStatus } from "./impl/client-status.js";
import { handleRestartClient } from "./impl/restart-client.js";
import { handleCloseClient } from "./impl/close-client.js";
import { handleManageAccounts } from "./impl/manage-accounts.js";
import { handleScreenshot } from "./impl/screenshot.js";
import { handleExecutorInfo } from "./impl/executor-info.js";
import { handleSaveScript } from "./impl/save-script.js";
import {
  LaunchClientShape, JoinGameShape, ListClientsShape,
  ClientStatusShape, RestartClientShape, CloseClientShape,
  ManageAccountsShape, ScreenshotShape, ExecutorInfoShape,
  SaveScriptShape,
} from "./schemas.js";

export function registerAllTools(
  server: McpServer,
  accountStore: AccountStore,
  processManager: ProcessManager,
  coordinator: ExecutorCoordinator,
  scriptLibrary?: ScriptLibrary | null
): void {
  server.tool(
    "launch_client",
    "Launch a Roblox client process with a stored account. Finds RobloxPlayerBeta.exe, spawns it, and tracks the process. " +
    "Optionally join a place immediately. The client is registered in the process manager and returned with a clientId. " +
    "IMPORTANT: After launching, you MUST manually connect the executor (roblox-executor-mcp) to this Roblox window. " +
    "Use this together with roblox-executor-mcp tools: launch_client → user manually connects executor → use executor tools for in-game operations. " +
    "Accounts are managed via manage_accounts tool first.",
    LaunchClientShape,
    async (params) => handleLaunchClient(params, accountStore, processManager)
  );

  server.tool(
    "join_game",
    "Direct a running Roblox client to join a specific game by place ID. " +
    "Uses the robloclient:// URL protocol to trigger a teleport. " +
    "The client must be running and logged in. " +
    "After the client joins the game, use roblox-executor-mcp tools to analyze the game (execute Luau, decompile scripts, spy remotes, etc.). " +
    "Typical workflow: launch_client → join_game → roblox-executor tools for in-game analysis.",
    JoinGameShape,
    async (params) => handleJoinGame(params, processManager)
  );

  server.tool(
    "list_clients",
    "List all managed Roblox client processes with their current status. " +
    "Returns: clientId (UUID), PID, account alias, current place ID, status (running/crashed/restarting), uptime, and start time. " +
    "Use this to get client IDs for other tools like get_client_status, join_game, restart_client, close_client, take_screenshot. " +
    "Also useful for monitoring — check if clients are still alive or have crashed.",
    ListClientsShape,
    async (params) => handleListClients(params, processManager)
  );

  server.tool(
    "get_client_status",
    "Get detailed health and status information for a specific Roblox client. " +
    "Checks if the process is actually running (via process kill(0)), calculates uptime, and returns current place and account info. " +
    "More detailed than list_clients — use this when you need to verify a specific client is healthy before running executor operations on it.",
    ClientStatusShape,
    async (params) => handleClientStatus(params, processManager)
  );

  server.tool(
    "restart_client",
    "Kill and automatically relaunch a Roblox client with the same account. " +
    "Waits 2 seconds for cleanup before restarting. The client gets a new PID but keeps the same clientId. " +
    "Use this when a client crashes or becomes unresponsive. " +
    "NOTE: After restart, the executor connection is lost — you will need to reconnect the executor manually to the new Roblox window. " +
    "Health check with get_client_status first to confirm the client actually needs restarting.",
    RestartClientShape,
    async (params) => handleRestartClient(params, processManager)
  );

  server.tool(
    "close_client",
    "Gracefully close a Roblox client process and remove it from the managed list. " +
    "Sends SIGTERM first, then force-kills with taskkill if needed. " +
    "Use this when you're done with a client or need to free up system resources. " +
    "The clientId is no longer valid after closing.",
    CloseClientShape,
    async (params) => handleCloseClient(params, processManager)
  );

  server.tool(
    "manage_accounts",
    "Manage stored Roblox accounts for launching clients. " +
    "Cookies (authentication tokens) are stored encrypted at rest using AES-256-GCM. " +
    "Three actions:" +
    " 'add' — store a new account with an alias (e.g. 'alt1') and a .ROBLOSECURITY cookie. " +
    " 'list' — show all stored accounts (shows aliases and dates only, never exposes cookies). " +
    " 'remove' — delete a stored account by alias. " +
    "How to get a .ROBLOSECURITY cookie: Open Roblox in Chrome/Edge → F12 DevTools → Application tab → Cookies → https://www.roblox.com → copy .ROBLOSECURITY value. " +
    "After adding accounts, use launch_client with the alias to start Roblox authenticated as that user.",
    ManageAccountsShape,
    async (params) => handleManageAccounts(params, accountStore)
  );

  server.tool(
    "take_screenshot",
    "Capture a full-screen screenshot and save it as a PNG file. " +
    "Uses PowerShell's System.Drawing to capture the primary display. " +
    "Returns the file path to the screenshot image. " +
    "Useful for seeing what's happening on a client — especially combined with roblox-executor-mcp's screenshot-window tool for Roblox-specific captures.",
    ScreenshotShape,
    async (params) => handleScreenshot(params, processManager)
  );

  server.tool(
    "get_executor_info",
    "Check if the roblox-executor-mcp server is running and list all available executor tools. " +
    "This tool helps the AI understand what in-game operations are possible. " +
    "The executor MCP provides: execute Luau code, decompile scripts, search scripts, spy on remotes, click buttons, type text, search instances, and more. " +
    "Workflow: launch_client (this MCP) → join_game (this MCP) → executor MCP tools for in-game analysis and development. " +
    "If the executor is not running, the tools are still listed but marked as unavailable.",
    ExecutorInfoShape,
    async (params) => handleExecutorInfo(params, coordinator)
  );

  if (scriptLibrary) {
    server.tool(
      "save_script_to_library",
      "Save a working Luau script to the user's script library. " +
      "The script will be saved with PENDING status — the user must review and approve it from the dashboard. " +
      "Always ask the user before calling this tool. " +
      "Use this after successfully creating or verifying a script works.",
      SaveScriptShape,
      async (params) => handleSaveScript(params, scriptLibrary!)
    );
  }
}
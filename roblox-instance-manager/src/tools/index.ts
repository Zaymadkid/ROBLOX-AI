import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProcessManager } from "../process/manager.js";
import { ExecutorCoordinator } from "../bridge/coordinator.js";
import { ScriptLibrary } from "../scripts/library.js";
import { handleJoinGame } from "./impl/join-game.js";
import { handleListClients } from "./impl/list-clients.js";
import { handleClientStatus } from "./impl/client-status.js";
import { handleCloseClient } from "./impl/close-client.js";
import { handleScreenshot } from "./impl/screenshot.js";
import { handleExecutorInfo } from "./impl/executor-info.js";
import { handleSaveScript } from "./impl/save-script.js";
import {
  handleListScripts,
  handleGetScript,
  handleDeleteScript,
  handleUpdateScript,
  handleApproveScript,
} from "./impl/script-library.js";
import {
  JoinGameShape, ListClientsShape,
  ClientStatusShape, CloseClientShape,
  ScreenshotShape, ExecutorInfoShape,
  SaveScriptShape,
  ListScriptsShape, GetScriptShape, DeleteScriptShape,
  UpdateScriptShape, ApproveScriptShape,
} from "./schemas.js";

export function registerAllTools(
  server: McpServer,
  processManager: ProcessManager,
  coordinator: ExecutorCoordinator,
  scriptLibrary?: ScriptLibrary | null
): void {
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
    "close_client",
    "Gracefully close a Roblox client process and remove it from the managed list. " +
    "Sends SIGTERM first, then force-kills with taskkill if needed. " +
    "Use this when you're done with a client or need to free up system resources. " +
    "The clientId is no longer valid after closing.",
    CloseClientShape,
    async (params) => handleCloseClient(params, processManager)
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

    server.tool(
      "list_scripts",
      "List scripts saved in the user's script library. " +
      "Returns script IDs, names, games, descriptions, features, status (approved/pending), and timestamps. " +
      "Use this to browse available scripts or find a specific script's ID before calling get_script, update_script, or delete_script.",
      ListScriptsShape,
      (params) => handleListScripts(params, scriptLibrary!)
    );

    server.tool(
      "get_script",
      "Get a specific script from the library by ID, including its full Luau code. " +
      "Use list_scripts first to find the script ID.",
      GetScriptShape,
      (params) => handleGetScript(params, scriptLibrary!)
    );

    server.tool(
      "update_script",
      "Update an existing script in the library. " +
      "Only the fields you provide are changed — omit any field to leave it unchanged. " +
      "Updates the updatedAt timestamp automatically. " +
      "Use list_scripts to find the script ID first.",
      UpdateScriptShape,
      (params) => handleUpdateScript(params, scriptLibrary!)
    );

    server.tool(
      "delete_script",
      "Permanently delete a script from the library by ID. " +
      "This cannot be undone. Always confirm with the user before calling this. " +
      "Use list_scripts to find the script ID first.",
      DeleteScriptShape,
      (params) => handleDeleteScript(params, scriptLibrary!)
    );

    server.tool(
      "approve_script",
      "Approve a pending script in the library, making it visible as an approved script. " +
      "Scripts saved by the AI start as pending — use this if the user confirms approval via chat instead of the dashboard.",
      ApproveScriptShape,
      (params) => handleApproveScript(params, scriptLibrary!)
    );
  }
}

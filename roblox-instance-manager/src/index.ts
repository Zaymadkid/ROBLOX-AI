import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";
import { AccountStore } from "./accounts/store.js";
import { ProcessManager } from "./process/manager.js";
import { ExecutorCoordinator } from "./bridge/coordinator.js";
import { boot } from "./bridge/boot.js";
import { registerAllTools as registerExecutorTools } from "./executor-tools/index.js";
import { setManagerInstances } from "./http/manager-registry.js";

const config = loadConfig();

const accountStore = new AccountStore(config.dataDir);
const processManager = new ProcessManager(accountStore);
const coordinator = new ExecutorCoordinator(config.executorUrl);

setManagerInstances(processManager, accountStore, config.dataDir);

const server = new McpServer({
  name: "roblox-instance-manager",
  version: "1.0.0",
  description:
    "MANAGES ROBLOX CLIENT PROCESSES & EXECUTOR. Launch clients with stored accounts, join games, health monitoring, " +
    "execute Luau in active client, decompile/grep scripts, spy on remote signals, take screenshots, type/click in GUI.",
});

registerAllTools(server, accountStore, processManager, coordinator);
registerExecutorTools(server);

const transport = new StdioServerTransport();
server.connect(transport);
console.error("Roblox Instance Manager MCP started.");
console.error(`  Data directory: ${config.dataDir}`);
console.error("  Integrated Dashboard running on port 16384:");
console.error("  👉 http://localhost:16384/");
console.error("");

void boot();

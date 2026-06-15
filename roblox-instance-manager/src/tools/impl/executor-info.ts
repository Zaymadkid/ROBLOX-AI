import { ExecutorCoordinator } from "../../bridge/coordinator.js";

export async function handleExecutorInfo(
  _params: Record<string, never>,
  coordinator: ExecutorCoordinator
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const status = await coordinator.getStatus();
  const tools = coordinator.getTools();

  if (!status.running) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          running: false,
          url: status.url,
          message: "Executor MCP not running. Start it to use in-game tools.",
          availableExecutorTools: tools,
        }, null, 2),
      }],
    };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        running: true,
        url: status.url,
        version: status.version ?? "unknown",
        message: "Executor MCP is running. Use its tools for in-game operations (execute Luau, decompile scripts, spy remotes, etc.).",
        availableExecutorTools: tools,
      }, null, 2),
    }],
  };
}
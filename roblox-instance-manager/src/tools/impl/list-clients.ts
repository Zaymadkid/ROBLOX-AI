import { ProcessManager } from "../../process/manager.js";

export async function handleListClients(
  _params: Record<string, never>,
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const clients = processManager.listClients();

  if (clients.length === 0) {
    return { content: [{ type: "text", text: "No active clients." }] };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify(clients, null, 2),
    }],
  };
}
import { isProcessRunning } from "../../process/launcher.js";
import { ProcessManager } from "../../process/manager.js";

export async function handleClientStatus(
  params: { clientId: string },
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const client = processManager.getClient(params.clientId);
  if (!client) {
    return { content: [{ type: "text", text: `Client "${params.clientId}" not found.` }] };
  }

  const alive = isProcessRunning(client.pid);
  const uptime = alive
    ? Math.floor((Date.now() - new Date(client.startedAt).getTime()) / 1000)
    : 0;

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        clientId: client.clientId,
        pid: client.pid,
        accountName: client.accountName,
        placeId: client.placeId,
        status: alive ? "running" : "crashed",
        uptimeSeconds: uptime,
        startedAt: client.startedAt,
      }, null, 2),
    }],
  };
}
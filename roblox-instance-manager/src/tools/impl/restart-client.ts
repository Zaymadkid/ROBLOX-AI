import { ProcessManager } from "../../process/manager.js";

export async function handleRestartClient(
  params: { clientId: string },
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const client = processManager.getClient(params.clientId);
  if (!client) {
    return { content: [{ type: "text", text: `Client "${params.clientId}" not found.` }] };
  }

  try {
    const newPid = await processManager.restartClient(params.clientId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          clientId: params.clientId,
          newPid,
          message: `Client restarted. New PID: ${newPid}`,
        }, null, 2),
      }],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Failed to restart client: ${(err as Error).message}` }] };
  }
}
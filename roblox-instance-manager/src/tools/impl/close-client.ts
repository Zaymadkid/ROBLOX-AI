import { ProcessManager } from "../../process/manager.js";

export async function handleCloseClient(
  params: { clientId: string },
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const success = processManager.closeClient(params.clientId);
  if (!success) {
    return { content: [{ type: "text", text: `Client "${params.clientId}" not found.` }] };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        success: true,
        clientId: params.clientId,
        message: "Client closed.",
      }, null, 2),
    }],
  };
}
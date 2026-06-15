import { execSync } from "child_process";
import { ProcessManager } from "../../process/manager.js";

export async function handleJoinGame(
  params: { clientId: string; placeId: number },
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const client = processManager.getClient(params.clientId);
  if (!client) {
    return { content: [{ type: "text", text: `Client "${params.clientId}" not found.` }] };
  }

  try {
    const robloxUrl = `roblox://placeId=${params.placeId}`;
    execSync(`start "" "${robloxUrl}"`, { stdio: "ignore" });

    processManager.updatePlaceId(params.clientId, params.placeId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          clientId: params.clientId,
          placeId: params.placeId,
          message: `Joining place ${params.placeId} on client ${params.clientId}.`,
        }, null, 2),
      }],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Failed to join game: ${(err as Error).message}` }] };
  }
}
import { ProcessManager } from "../../process/manager.js";
import { getActiveClients } from "../../bridge/handlers/shared/registry.js";

export async function handleListClients(
  _params: Record<string, never>,
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  // Get active connected WebSocket/HTTP clients (connector injected)
  const connectedClients = getActiveClients();
  
  // Get clients from ProcessManager (launched)
  const pmClients = processManager.listClients();

  // Create a merged list of clients
  const mergedClients = connectedClients.map(conn => {
    // Try to find matching launched client by username/accountName
    const pmMatch = pmClients.find(
      p => p.accountName.toLowerCase() === conn.username.toLowerCase()
    );

    return {
      clientId: conn.clientId, // Target connection ID for executor tools
      pid: pmMatch ? pmMatch.pid : null,
      accountName: conn.username,
      placeId: conn.placeId,
      placeName: conn.placeName,
      jobId: conn.jobId,
      transport: conn.transport,
      startedAt: pmMatch ? pmMatch.startedAt : new Date().toISOString(), // Use now if manual
      status: pmMatch ? pmMatch.status : "running",
      isManual: !pmMatch,
    };
  });

  // Add any launched clients that haven't connected yet
  for (const pm of pmClients) {
    const isConnected = connectedClients.some(
      c => c.username.toLowerCase() === pm.accountName.toLowerCase()
    );
    if (!isConnected) {
      mergedClients.push({
        clientId: pm.clientId, // Default to process clientId until connection
        pid: pm.pid,
        accountName: pm.accountName,
        placeId: pm.placeId ?? 0,
        placeName: "Connecting...",
        jobId: "",
        transport: "none" as any,
        startedAt: pm.startedAt,
        status: pm.status,
        isManual: false,
      });
    }
  }

  if (mergedClients.length === 0) {
    return { content: [{ type: "text", text: "No active clients." }] };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify(mergedClients, null, 2),
    }],
  };
}
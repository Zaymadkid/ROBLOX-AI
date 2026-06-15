import type { IncomingMessage, ServerResponse } from "http";
import { serverStartTime } from "../../../executor-config.js";
import { getActiveClients } from "../../../bridge/handlers/shared/registry.js";


export function GET(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      startTime: serverStartTime,
      clientCount: getActiveClients().length,
      version: "1.0.0",
    })
  );
}

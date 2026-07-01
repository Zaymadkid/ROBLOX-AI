import type { IncomingMessage, ServerResponse } from "http";
import { getClientById } from "../../bridge/handlers/shared/registry.js";

export function GET(_req: IncomingMessage, res: ServerResponse, url: URL): void {
  const clientId = url.searchParams.get("clientId");
  if (!clientId) {
    res.writeHead(400);
    res.end("Missing clientId query parameter");
    return;
  }

  const client = getClientById(clientId);
  if (!client) {
    res.writeHead(404);
    res.end("Unknown clientId");
    return;
  }

  client.lastHttpPoll = Date.now();

  if (client.commandQueue.length === 0) {
    res.writeHead(204);
    res.end();
    return;
  }

  // Drain the entire queue atomically and return all pending commands.
  // Each entry is already a serialized JSON string — parse then re-wrap so
  // the client gets a single well-formed envelope:
  //   { commands: [ { type, id, ... }, ... ] }
  const commands = client.commandQueue.map((raw) => JSON.parse(raw));
  client.commandQueue = [];

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ commands }));
}

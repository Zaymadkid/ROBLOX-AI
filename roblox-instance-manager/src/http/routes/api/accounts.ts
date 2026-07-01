import type { IncomingMessage, ServerResponse } from "http";

// Account management has been removed. This stub returns 410 Gone.
export async function GET(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.writeHead(410, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Account management has been removed." }));
}

export async function POST(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.writeHead(410, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Account management has been removed." }));
}

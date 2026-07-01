import type { IncomingMessage, ServerResponse } from "http";
import { readJsonBody } from "../../body.js";
import { getScriptLibrary } from "../../manager-registry.js";

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function GET(_req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const lib = getScriptLibrary();
  if (!lib) return json(res, 503, { error: "Script library not initialized" });

  const id = url.searchParams.get("id");
  if (id) {
    const script = lib.getScript(id);
    if (!script) return json(res, 404, { error: "Script not found" });
    return json(res, 200, script);
  }

  const status = url.searchParams.get("status") as "approved" | "pending" | undefined ?? undefined;
  const game = url.searchParams.get("game") ?? undefined;
  return json(res, 200, lib.listScripts({ status, game }));
}

export async function POST(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const lib = getScriptLibrary();
  if (!lib) return json(res, 503, { error: "Script library not initialized" });

  // Approve action
  const action = url.searchParams.get("action");
  const id = url.searchParams.get("id");

  if (action === "approve" && id) {
    const ok = lib.approveScript(id);
    return json(res, ok ? 200 : 404, { success: ok });
  }

  if (action === "update" && id) {
    try {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const ok = lib.updateScript(id, body as any);
      return json(res, ok ? 200 : 404, { success: ok });
    } catch {
      return json(res, 400, { error: "Invalid JSON" });
    }
  }

  // Create new script
  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const script = lib.addScript({
      name: String(body.name ?? "Untitled Script"),
      description: String(body.description ?? ""),
      game: body.game ? String(body.game) : undefined,
      placeId: body.placeId ? Number(body.placeId) : undefined,
      features: Array.isArray(body.features) ? body.features.map(String) : [],
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      code: String(body.code ?? ""),
      status: (body.status as any) ?? "approved",
      addedBy: (body.addedBy as any) ?? "user",
    });
    return json(res, 201, script);
  } catch {
    return json(res, 400, { error: "Invalid JSON" });
  }
}

export async function DELETE(_req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const lib = getScriptLibrary();
  if (!lib) return json(res, 503, { error: "Script library not initialized" });

  const id = url.searchParams.get("id");
  if (!id) return json(res, 400, { error: "Missing id" });

  const ok = lib.deleteScript(id);
  return json(res, ok ? 200 : 404, { success: ok });
}

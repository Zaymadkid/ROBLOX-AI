import type { IncomingMessage, ServerResponse } from "http";
import { readJsonBody } from "../../body.js";
import { getScriptBloxClient } from "../../manager-registry.js";

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/** GET /api/scriptblox — return config status */
export function GET(_req: IncomingMessage, res: ServerResponse): void {
  const client = getScriptBloxClient();
  json(res, 200, {
    configured: client?.isConfigured() ?? false,
    hasToken: !!client?.getToken(),
    hasCfClearance: !!client?.getCfClearance(),
  });
}

/** POST /api/scriptblox?action=set-token  { token }
 *  POST /api/scriptblox?action=publish    { title, script, game?, isUniversal? }
 */
export async function POST(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const client = getScriptBloxClient();
  if (!client) return json(res, 503, { error: "ScriptBlox client not initialized" });

  const action = url.searchParams.get("action");

  if (action === "set-token") {
    try {
      const body = await readJsonBody<{ token?: string }>(req);
      client.setToken(body.token ?? null);
      return json(res, 200, { success: true, hasToken: !!client.getToken(), configured: client.isConfigured() });
    } catch {
      return json(res, 400, { error: "Invalid JSON" });
    }
  }

  if (action === "set-cf-clearance") {
    try {
      const body = await readJsonBody<{ value?: string }>(req);
      client.setCfClearance(body.value ?? null);
      return json(res, 200, { success: true, hasCfClearance: !!client.getCfClearance(), configured: client.isConfigured() });
    } catch {
      return json(res, 400, { error: "Invalid JSON" });
    }
  }

  if (action === "publish") {
    try {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const result = await client.publish({
        title: String(body.title ?? "Untitled"),
        script: String(body.script ?? ""),
        game: body.game ? String(body.game) : undefined,
        isUniversal: body.isUniversal !== false,
        isPatched: Boolean(body.isPatched),
      });
      return json(res, result.success ? 200 : 400, result);
    } catch (err) {
      return json(res, 500, { error: (err as Error).message });
    }
  }

  return json(res, 400, { error: "Missing action param. Use ?action=set-token or ?action=publish" });
}

import type { IncomingMessage, ServerResponse } from "http";
import { getDiffHistory } from "../../manager-registry.js";

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function GET(_req: IncomingMessage, res: ServerResponse, url: URL): void {
  const history = getDiffHistory();
  if (!history) return json(res, 503, { error: "Diff history not initialized" });

  const id      = url.searchParams.get("id");
  const placeId = url.searchParams.get("placeId");
  const path    = url.searchParams.get("path") ?? undefined;
  const limit   = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  if (id) {
    const entry = history.getDiff(id);
    if (!entry) return json(res, 404, { error: "Diff not found" });
    return json(res, 200, entry);
  }

  const diffs = history.getDiffs({
    placeId: placeId ? parseInt(placeId, 10) : undefined,
    path,
    limit,
  });

  return json(res, 200, {
    count: diffs.length,
    pendingAlerts: history.getPendingAlertCount(),
    diffs: diffs.map(d => ({
      id: d.id,
      path: d.path,
      placeId: d.placeId,
      placeName: d.placeName,
      detectedAt: d.detectedAt,
      linesAdded: d.linesAdded,
      linesRemoved: d.linesRemoved,
      // Don't include full diff by default — use ?id= for that
    })),
  });
}

export function DELETE(_req: IncomingMessage, res: ServerResponse, url: URL): void {
  const history = getDiffHistory();
  if (!history) return json(res, 503, { error: "Diff history not initialized" });

  const placeId = url.searchParams.get("placeId");
  history.clearDiffs(placeId ? parseInt(placeId, 10) : undefined);
  return json(res, 200, { success: true });
}

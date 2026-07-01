import type { ScriptLibrary, ScriptEntry } from "../../scripts/library.js";

type Response = { content: Array<{ type: "text"; text: string }> };

function ok(data: unknown): Response {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(msg: string): Response {
  return { content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }] };
}

function scriptSummary(s: ScriptEntry) {
  return {
    id: s.id,
    name: s.name,
    game: s.game ?? null,
    placeId: s.placeId ?? null,
    description: s.description,
    features: s.features,
    tags: s.tags,
    status: s.status,
    addedBy: s.addedBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function handleListScripts(
  params: { status?: "approved" | "pending"; game?: string },
  library: ScriptLibrary
): Response {
  const scripts = library.listScripts({ status: params.status, game: params.game });
  return ok({
    count: scripts.length,
    scripts: scripts.map(scriptSummary),
  });
}

export function handleGetScript(
  params: { id: string; includeCode?: boolean },
  library: ScriptLibrary
): Response {
  const script = library.getScript(params.id);
  if (!script) return err(`Script "${params.id}" not found.`);
  const result = scriptSummary(script);
  if (params.includeCode !== false) {
    return ok({ ...result, code: script.code });
  }
  return ok(result);
}

export function handleDeleteScript(
  params: { id: string },
  library: ScriptLibrary
): Response {
  const script = library.getScript(params.id);
  if (!script) return err(`Script "${params.id}" not found.`);
  const name = script.name;
  const deleted = library.deleteScript(params.id);
  if (!deleted) return err(`Failed to delete script "${params.id}".`);
  return ok({ success: true, message: `Script "${name}" deleted from the library.` });
}

export function handleUpdateScript(
  params: {
    id: string;
    name?: string;
    description?: string;
    game?: string;
    placeId?: number;
    features?: string[];
    tags?: string[];
    code?: string;
  },
  library: ScriptLibrary
): Response {
  const script = library.getScript(params.id);
  if (!script) return err(`Script "${params.id}" not found.`);

  const updates: Parameters<ScriptLibrary["updateScript"]>[1] = {};
  if (params.name        !== undefined) updates.name        = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.game        !== undefined) updates.game        = params.game;
  if (params.placeId     !== undefined) updates.placeId     = params.placeId;
  if (params.features    !== undefined) updates.features    = params.features;
  if (params.tags        !== undefined) updates.tags        = params.tags;
  if (params.code        !== undefined) updates.code        = params.code;

  if (Object.keys(updates).length === 0) {
    return err("No fields provided to update.");
  }

  library.updateScript(params.id, updates);
  const updated = library.getScript(params.id)!;
  return ok({
    success: true,
    message: `Script "${updated.name}" updated.`,
    script: scriptSummary(updated),
  });
}

export function handleApproveScript(
  params: { id: string },
  library: ScriptLibrary
): Response {
  const script = library.getScript(params.id);
  if (!script) return err(`Script "${params.id}" not found.`);
  if (script.status === "approved") return ok({ success: true, message: `Script "${script.name}" is already approved.` });
  library.approveScript(params.id);
  return ok({ success: true, message: `Script "${script.name}" approved.` });
}

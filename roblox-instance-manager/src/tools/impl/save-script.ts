import { ScriptLibrary } from "../../scripts/library.js";

export async function handleSaveScript(
  params: {
    name: string;
    description: string;
    code: string;
    game?: string;
    placeId?: number;
    features?: string[];
    tags?: string[];
  },
  library: ScriptLibrary
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const script = library.addScript({
    name: params.name,
    description: params.description,
    code: params.code,
    game: params.game,
    placeId: params.placeId,
    features: params.features ?? [],
    tags: params.tags ?? [],
    status: "pending",
    addedBy: "ai",
  } as any);

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        success: true,
        id: script.id,
        message: `Script "${script.name}" saved to the library as PENDING. The user needs to review and approve it in the dashboard at http://localhost:16384/ (Scripts page).`,
      }, null, 2),
    }],
  };
}

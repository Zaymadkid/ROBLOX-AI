import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isSecondaryRelay, relayToolToApi, toolTextResponse } from "../../factory.js";
import { maxOutputCharsSchema } from "../../schemas.js";
import { getDiffHistory } from "../../../http/manager-registry.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "get-script-diffs",
    {
      title: "Get script diffs between game sessions",
      description:
        "Show what Luau scripts changed since the last time this game was analyzed. " +
        "Each diff shows added/removed lines in unified diff format. " +
        "Use after re-joining a game that has had an update to see what the developers changed.",
      inputSchema: z.object({
        placeId: z
          .number()
          .describe("Filter diffs to a specific place ID. Omit to see diffs across all games.")
          .optional(),
        path: z
          .string()
          .describe("Filter by script path substring (e.g. 'AntiCheat', 'Shop').")
          .optional(),
        limit: z
          .number()
          .describe("Maximum number of diffs to return (default: 20).")
          .optional()
          .default(20),
        includeDiff: z
          .boolean()
          .describe("Include the full unified diff in the response (default: true). Set false for a summary only.")
          .optional()
          .default(true),
        maxOutputChars: maxOutputCharsSchema,
      }),
    },
    async ({ placeId, path, limit, includeDiff, maxOutputChars }) => {
      if (isSecondaryRelay()) {
        return relayToolToApi("get-script-diffs", { placeId, path, limit, includeDiff, maxOutputChars }, 10000, {
          maxOutputChars,
          truncationHint: "Use placeId or path filter, or set includeDiff=false for summary only.",
        });
      }

      const history = getDiffHistory();
      if (!history) return toolTextResponse("Diff history not initialized.", {}, true);

      const diffs = history.getDiffs({ placeId, path, limit: Math.min(limit, 50) });

      if (!diffs.length) {
        const msg = placeId
          ? `No script changes detected for place ${placeId} yet. Connect to the game, let scripts index, then reconnect after an update.`
          : "No script changes detected yet. Analyze a game twice (before and after an update) to see diffs.";
        return toolTextResponse(msg, { maxOutputChars });
      }

      const parts = diffs.map((d, i) => {
        const header = `${i + 1}. [${d.path}] — ${d.linesAdded} added, ${d.linesRemoved} removed (${d.placeName || `place ${d.placeId}`}, ${new Date(d.detectedAt).toLocaleString()})`;
        return includeDiff ? `${header}\n\n${d.diff}` : header;
      });

      const summary = `${diffs.length} script change${diffs.length !== 1 ? "s" : ""} detected:`;
      return toolTextResponse(summary + "\n\n" + parts.join("\n\n---\n\n"), {
        maxOutputChars,
        truncationHint: "Use placeId or path filter, or set includeDiff=false for summary only.",
      });
    }
  );
}

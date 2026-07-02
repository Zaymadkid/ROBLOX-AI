import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { clientStampPrefix, isSecondaryRelay, relayToolToApi, toolTextResponse } from "../../factory.js";
import { maxOutputCharsSchema } from "../../schemas.js";
import { fetchScriptSearchIndex } from "./script-sources.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "list-script-paths",
    {
      title: "List all indexed script paths",
      description:
        "Return the paths of every decompiled script in the index without their source code. " +
        "Use this first to discover what scripts exist before calling get-script-content or script-grep. " +
        "Significantly cheaper than semantic-search-scripts when you just need to know what's available.",
      inputSchema: z.object({
        filter: z
          .string()
          .describe("Optional substring filter — only return paths containing this string (case-insensitive).")
          .optional(),
        maxOutputChars: maxOutputCharsSchema,
      }),
    },
    async ({ filter, maxOutputChars }) => {
      if (isSecondaryRelay()) {
        return relayToolToApi("list-script-paths", { filter, maxOutputChars }, 30000, {
          maxOutputChars,
          truncationHint: "Use the filter parameter to narrow results.",
        });
      }

      const indexResult = fetchScriptSearchIndex({ allowIncomplete: true });
      if (!indexResult.ok) return indexResult.response;

      const { index } = indexResult;
      let scripts = index.scripts;

      if (filter) {
        const q = filter.toLowerCase();
        scripts = scripts.filter(s => s.path.toLowerCase().includes(q));
      }

      const paths = scripts.map(s => s.path);

      const syncNote = index.hasFinishedMapping
        ? ""
        : `\n(Index incomplete: ${index.mappedSources}/${index.sourcesToMap} scripts mapped so far)`;

      const header = `${paths.length} script${paths.length !== 1 ? "s" : ""} indexed${filter ? ` matching "${filter}"` : ""}${syncNote}`;
      const body = paths.join("\n");

      return toolTextResponse(
        clientStampPrefix() + header + "\n\n" + body,
        {
          maxOutputChars,
          truncationHint: "Use the filter parameter to narrow results.",
        }
      );
    }
  );
}

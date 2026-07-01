import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sendAndWait } from "../../factory.js";
import { maxOutputCharsSchema } from "../../schemas.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "get-remote-spy-logs",
    {
      title: "Get captured remote spy logs from Cobalt",
      description:
        "List captured Cobalt remote and bindable call logs. Requires ensure-remote-spy first; supports direction and name filters to narrow noisy logs.",
      inputSchema: z.object({
        direction: z
          .enum(["Incoming", "Outgoing", "Both"])
          .describe("Filter by call direction (default: Both)")
          .optional()
          .default("Both"),
        remoteNameFilter: z
          .string()
          .describe(
            "Optional filter — only return logs for remotes whose name contains this string (case-insensitive)"
          )
          .optional(),
        limit: z
          .number()
          .describe("Maximum number of remote logs to return (default: 50)")
          .optional()
          .default(50),
        maxCallsPerRemote: z
          .number()
          .describe("Maximum number of recent calls to return per remote (default: 5)")
          .optional()
          .default(5),
        maxOutputChars: maxOutputCharsSchema,
      }),
    },
    async ({ direction, remoteNameFilter, limit, maxCallsPerRemote, maxOutputChars }) =>
      sendAndWait({
        type: "get-remote-spy-logs",
        data: {
          direction,
          remoteNameFilter: remoteNameFilter || "",
          limit,
          maxCallsPerRemote,
        },
        maxOutputChars,
        stampClient: true,
        truncationHint: "Rerun with a remoteNameFilter, lower limit, or smaller maxCallsPerRemote.",
        failureMessage: (response) =>
          "Failed to get remote spy logs. Response: " + JSON.stringify(response),
      })
  );
}
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sendAndWait } from "../../factory.js";
import { maxOutputCharsSchema, threadContextSchema } from "../../schemas.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "get-data-by-code",
    {
      title: "Get data by code",
      description:
        "Execute Luau in the active Roblox client and return serialized raw Lua values. The code must return values; do not manually JSON-encode them.",
      inputSchema: z.object({
        code: z
          .string()
          .describe(
            "The code to execute in the Roblox Game Client (MUST return one or more values). Return raw Lua values - do NOT manually serialize tables or use JSONEncode, the connector handles serialization automatically."
          ),
        threadContext: threadContextSchema,
        timeout: z
          .number()
          .describe(
            "Timeout in milliseconds for the response (default: 15000, max: 120000). Increase for long-running operations like decompiling many modules."
          )
          .optional()
          .default(15000),
        maxOutputChars: maxOutputCharsSchema,
      }),
    },
    async ({ code, threadContext, timeout, maxOutputChars }) => {
      console.error(`Executing code in thread ${threadContext}...`);
      const clampedTimeout = Math.min(Math.max(timeout, 1000), 120000);

      return sendAndWait({
        type: "get-data-by-code",
        data: { source: `setthreadidentity(${threadContext});${code}` },
        timeoutMs: clampedTimeout,
        maxOutputChars,
        stampClient: true,
        truncationHint: "Rerun get-data-by-code with a more targeted query or raise maxOutputChars.",
        failureMessage: (response) =>
          "Failed to get data by code. Response: " + JSON.stringify(response),
      });
    }
  );
}
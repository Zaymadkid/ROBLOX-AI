import { z } from "zod";

export const ScreenshotShape = {
  clientId: z.string().describe(
    "The client ID to screenshot (UUID format). " +
    "Captures the entire screen via PowerShell and saves to TEMP folder. " +
    "Returns the file path to the PNG screenshot."
  ),
};

export const ExecutorInfoShape = {};

export const ListScriptsShape = {
  status: z.enum(["approved", "pending"]).optional().describe(
    "Filter by approval status. Omit to return all scripts."
  ),
  game: z.string().optional().describe(
    "Filter by game name (partial match, case-insensitive)."
  ),
};

export const GetScriptShape = {
  id: z.string().describe("The script ID returned by list_scripts or save_script_to_library."),
  includeCode: z.boolean().optional().default(true).describe(
    "Whether to include the full Luau code in the response (default: true). Set false to get metadata only."
  ),
};

export const DeleteScriptShape = {
  id: z.string().describe("The ID of the script to permanently delete."),
};

export const UpdateScriptShape = {
  id: z.string().describe("The ID of the script to update."),
  name: z.string().optional().describe("New name for the script."),
  description: z.string().optional().describe("New description."),
  game: z.string().optional().describe("New target game name."),
  placeId: z.number().optional().describe("New target place ID."),
  features: z.array(z.string()).optional().describe("New feature list (replaces existing)."),
  tags: z.array(z.string()).optional().describe("New tag list (replaces existing)."),
  code: z.string().optional().describe("New Luau script code (replaces existing)."),
};

export const ApproveScriptShape = {
  id: z.string().describe("The ID of the pending script to approve."),
};

export const SaveScriptShape = {
  name: z.string().describe("A short, descriptive name for the script (e.g. 'Infinite Jump', 'ESP Walls')."),
  description: z.string().describe("What the script does — explain its purpose and behavior clearly."),
  code: z.string().describe("The complete Luau script code."),
  game: z.string().optional().describe("The Roblox game this script is made for (e.g. 'Blox Fruits', 'Arsenal'). Omit if it works in any game."),
  placeId: z.number().optional().describe("The Roblox place ID of the target game, if known."),
  features: z.array(z.string()).optional().describe("List of specific features the script provides (e.g. ['Aimbot', 'No Recoil', 'Speed Hack'])."),
  tags: z.array(z.string()).optional().describe("Tags for categorization (e.g. ['combat', 'movement', 'utility'])."),
};
import { z } from "zod";

export const LaunchClientShape = {
  account: z.string().describe(
    "The alias of a stored account from the account store (e.g. 'alt1', 'main', 'bot1'). " +
    "Add accounts first using the manage_accounts tool with action='add'. " +
    "The account's .ROBLOSECURITY cookie will be used to authenticate the Roblox client."
  ),
  placeId: z.number().optional().describe(
    "Optional Roblox place/experience ID to join immediately after launch (e.g. 4483381587 for Brookhaven). " +
    "If omitted, the client launches to the Roblox home screen. " +
    "You can use join_game later to send them to a specific place. " +
    "Find place IDs by visiting a game's page in browser — the URL contains the place ID."
  ),
};

export const JoinGameShape = {
  clientId: z.string().describe(
    "The client ID returned by launch_client or list_clients. " +
    "Format is a UUID string (e.g., 'a1b2c3d4-...'). " +
    "Use list_clients to see all active clients and their IDs."
  ),
  placeId: z.number().describe(
    "The Roblox place/experience ID to join (e.g. 4483381587 for Brookhaven, 6284583030 for Pet Simulator 99). " +
    "This uses the robloclient:// URL protocol to trigger the teleport. " +
    "The client must be running and logged in for this to work."
  ),
};

export const ListClientsShape = {};

export const ClientStatusShape = {
  clientId: z.string().describe(
    "The client ID to check (UUID format). " +
    "Returns detailed health info: process running, uptime, current place, memory/PID. " +
    "Use list_clients first to get available client IDs."
  ),
};

export const RestartClientShape = {
  clientId: z.string().describe(
    "The client ID to restart (UUID format). " +
    "This kills the Roblox process and relaunches it with the same account. " +
    "Useful when a client crashes or freezes. " +
    "You will need to reconnect the executor after restart."
  ),
};

export const CloseClientShape = {
  clientId: z.string().describe(
    "The client ID to close (UUID format). " +
    "Gracefully kills the Roblox process and removes it from the managed list. " +
    "The executor connection to this client will be lost."
  ),
};

export const ManageAccountsShape = {
  action: z.enum(["add", "list", "remove"]).describe(
    "The action to perform on the account store:\n" +
    "- 'add': Store a new account. Requires both 'alias' and 'cookie'.\n" +
    "- 'list': Show all stored accounts (shows aliases and dates, NOT cookies).\n" +
    "- 'remove': Delete a stored account. Requires 'alias'."
  ),
  alias: z.string().optional().describe(
    "A human-readable name for the account (e.g. 'main', 'alt1', 'bot2'). " +
    "Required for 'add' and 'remove' actions. " +
    "Use this alias later with launch_client to start Roblox with this account."
  ),
  cookie: z.string().optional().describe(
    "The .ROBLOSECURITY cookie from Roblox. " +
    "This is the auth token — keep it secret, treat it like a password. " +
    "Required for 'add' action. " +
    "To get it: open Roblox in browser → DevTools → Application → Cookies → .ROBLOSECURITY. " +
    "Cookies are encrypted at rest using AES-256-GCM with a machine-derived key."
  ),
};

export const ScreenshotShape = {
  clientId: z.string().describe(
    "The client ID to screenshot (UUID format). " +
    "Captures the entire screen via PowerShell and saves to TEMP folder. " +
    "Returns the file path to the PNG screenshot."
  ),
};

export const ExecutorInfoShape = {};

export const SaveScriptShape = {
  name: z.string().describe("A short, descriptive name for the script (e.g. 'Infinite Jump', 'ESP Walls')."),
  description: z.string().describe("What the script does — explain its purpose and behavior clearly."),
  code: z.string().describe("The complete Luau script code."),
  game: z.string().optional().describe("The Roblox game this script is made for (e.g. 'Blox Fruits', 'Arsenal'). Omit if it works in any game."),
  placeId: z.number().optional().describe("The Roblox place ID of the target game, if known."),
  features: z.array(z.string()).optional().describe("List of specific features the script provides (e.g. ['Aimbot', 'No Recoil', 'Speed Hack'])."),
  tags: z.array(z.string()).optional().describe("Tags for categorization (e.g. ['combat', 'movement', 'utility'])."),
};
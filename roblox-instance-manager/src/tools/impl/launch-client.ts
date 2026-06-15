import { AccountStore } from "../../accounts/store.js";
import { ProcessManager } from "../../process/manager.js";
import { launchRoblox, getAuthTicket } from "../../process/launcher.js";

export async function handleLaunchClient(
  params: { account: string; placeId?: number },
  accountStore: AccountStore,
  processManager: ProcessManager
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const cookie = accountStore.getCookie(params.account);
  if (!cookie) {
    return { content: [{ type: "text", text: `Account "${params.account}" not found. Add it first with manage_accounts.` }] };
  }

  try {
    const authTicket = await getAuthTicket(cookie);
    const result = launchRoblox(authTicket, params.placeId);
    const clientId = processManager.registerClient(result.pid, params.account, params.placeId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          clientId,
          pid: result.pid,
          accountName: params.account,
          placeId: params.placeId ?? null,
          message: `Client launched for "${params.account}"${params.placeId ? `, joining place ${params.placeId}` : ""}. Connect the executor manually to this Roblox window.`,
        }, null, 2),
      }],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Failed to launch Roblox: ${(err as Error).message}` }] };
  }
}
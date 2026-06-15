import type { IncomingMessage, ServerResponse } from "http";
import { getAccountStore, getProcessManager } from "../../manager-registry.js";
import { getAuthTicket, launchRoblox } from "../../../process/launcher.js";
import { readJsonBody } from "../../body.js";

export async function GET(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const accountStore = getAccountStore();
  if (!accountStore) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "AccountStore not initialized." }));
    return;
  }
  const accounts = accountStore.listAccounts();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ accounts }));
}

interface AccountsActionBody {
  action: "add" | "remove" | "launch";
  alias?: string;
  cookie?: string;
  account?: string;
  placeId?: number;
}

export async function POST(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const accountStore = getAccountStore();
  const processManager = getProcessManager();

  if (!accountStore || !processManager) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Managers not initialized." }));
    return;
  }

  try {
    const body = await readJsonBody<AccountsActionBody>(req);

    switch (body.action) {
      case "add": {
        if (!body.alias || !body.cookie) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Both 'alias' and 'cookie' are required for add action." }));
          return;
        }
        await accountStore.addAccount(body.alias, body.cookie);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: `Account "${body.alias}" added.` }));
        break;
      }
      case "remove": {
        if (!body.alias) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "'alias' is required for remove action." }));
          return;
        }
        const removed = accountStore.removeAccount(body.alias);
        if (!removed) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Account "${body.alias}" not found.` }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: `Account "${body.alias}" removed.` }));
        break;
      }
      case "launch": {
        const targetAccount = body.account || body.alias;
        if (!targetAccount) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Account/alias is required for launch." }));
          return;
        }
        const cookie = accountStore.getCookie(targetAccount);
        if (!cookie) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Account "${targetAccount}" not found.` }));
          return;
        }

        const authTicket = await getAuthTicket(cookie);
        const result = launchRoblox(authTicket, body.placeId);
        const clientId = processManager.registerClient(result.pid, targetAccount, body.placeId);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            clientId,
            pid: result.pid,
            accountName: targetAccount,
            placeId: body.placeId ?? null,
            message: `Client launched for "${targetAccount}".`
          })
        );
        break;
      }
      default:
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid action. Use 'add', 'remove', or 'launch'." }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
}

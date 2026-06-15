import { randomUUID } from "crypto";
import { AccountStore } from "../accounts/store.js";
import { launchRoblox, killProcess, isProcessRunning, getAuthTicket } from "./launcher.js";

export interface ClientInfo {
  clientId: string;
  pid: number;
  accountName: string;
  placeId: number | null;
  startedAt: string;
  status: "running" | "crashed" | "restarting";
}

export class ProcessManager {
  private clients: Map<string, ClientInfo> = new Map();

  constructor(private accountStore?: AccountStore) {}

  registerClient(pid: number, accountName: string, placeId?: number): string {
    const clientId = randomUUID();
    this.clients.set(clientId, {
      clientId,
      pid,
      accountName,
      placeId: placeId ?? null,
      startedAt: new Date().toISOString(),
      status: "running",
    });
    return clientId;
  }

  unregisterClient(clientId: string): boolean {
    return this.clients.delete(clientId);
  }

  getClient(clientId: string): ClientInfo | undefined {
    return this.clients.get(clientId);
  }

  listClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }

  updatePlaceId(clientId: string, placeId: number): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.placeId = placeId;
    }
  }

  healthCheck(): ClientInfo[] {
    const dead: ClientInfo[] = [];
    for (const [, info] of this.clients) {
      if (!isProcessRunning(info.pid)) {
        info.status = "crashed";
        dead.push(info);
      }
    }
    return dead;
  }

  async restartClient(clientId: string): Promise<number> {
    const client = this.clients.get(clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);

    client.status = "restarting";
    killProcess(client.pid);

    await new Promise((r) => setTimeout(r, 2000));

    let authTicket: string | undefined;
    if (this.accountStore && client.accountName) {
      const cookie = this.accountStore.getCookie(client.accountName);
      if (cookie) {
        try {
          authTicket = await getAuthTicket(cookie);
        } catch (err) {
          console.error(`[ProcessManager] Failed to get auth ticket for restart:`, err);
        }
      }
    }

    const result = launchRoblox(authTicket, client.placeId ?? undefined);
    client.pid = result.pid;
    client.startedAt = new Date().toISOString();
    client.status = "running";
    return result.pid;
  }

  closeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    killProcess(client.pid);
    return this.clients.delete(clientId);
  }
}
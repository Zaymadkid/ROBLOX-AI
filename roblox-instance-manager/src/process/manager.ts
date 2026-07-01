import { randomUUID } from "crypto";
import { killProcess, isProcessRunning } from "./launcher.js";

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
    if (client) client.placeId = placeId;
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

  closeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    killProcess(client.pid);
    return this.clients.delete(clientId);
  }
}

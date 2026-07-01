import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ProcessManager } from "../process/manager.js";
import { AccountStore, AccountInfo } from "../accounts/store.js";
import { ExecutorCoordinator } from "../bridge/coordinator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
};

export class DashboardServer {
  private server;
  private port: number;

  constructor(
    port: number,
    private processManager: ProcessManager,
    private accountStore: AccountStore,
    private coordinator: ExecutorCoordinator,
    private dataDir: string = "",
    private executorUrl: string = ""
  ) {
    this.port = port;
    this.server = createServer((req, res) => this.handleRequest(req, res));
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
    const path = url.pathname;

    if (path === "/api/clients") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(this.processManager.listClients()));
      return;
    }

    if (path === "/api/accounts") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(this.accountStore.listAccounts()));
      return;
    }

    if (path === "/api/executor") {
      const status = await this.coordinator.getStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    if (path === "/api/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        version: "1.0.0",
        port: this.port,
        executorUrl: this.executorUrl,
        dataDir: this.dataDir,
        uptime: process.uptime(),
      }));
      return;
    }

    if (path === "/api/clients/close") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing clientId" }));
        return;
      }
      const success = this.processManager.closeClient(clientId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success }));
      return;
    }

    let filePath: string;
    if (path === "/" || path === "/index.html") {
      filePath = join(__dirname, "dashboard.html");
    } else {
      filePath = join(__dirname, path);
    }

    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  }

  start(): void {
    this.server.listen(this.port, "127.0.0.1", () => {
      console.error(`Dashboard: http://localhost:${this.port}/`);
    });
  }

  stop(): void {
    this.server.close();
  }
}
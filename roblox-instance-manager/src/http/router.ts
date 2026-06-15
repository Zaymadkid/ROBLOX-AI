import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { IncomingMessage, ServerResponse } from "http";
import type { WebSocket } from "ws";
import {
  HTTP_METHODS,
  type HttpMethod,
  type RouteHandler,
  type WsRouteHandler,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, "routes");

interface RegisteredHttpRoute {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

interface RegisteredWsRoute {
  path: string;
  handler: WsRouteHandler;
}

const httpRoutes: RegisteredHttpRoute[] = [];
const wsRoutes: RegisteredWsRoute[] = [];
let defaultWsHandler: WsRouteHandler | null = null;

const WS_FALLBACK_NAME = "_ws-fallback";

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

const GROUP_SEGMENT = /^\(.+\)$/;

function fileToUrlPath(file: string): string {
  const rel = path.relative(routesDir, file);
  const parsed = path.parse(rel);
  const segments = parsed.dir
    ? parsed.dir.split(path.sep).filter((seg) => !GROUP_SEGMENT.test(seg))
    : [];
  const dir = segments.join("/");
  const name = parsed.name;

  if (!dir && name === "index") return "/";
  if (name === "index") return "/" + dir;
  return "/" + (dir ? `${dir}/${name}` : name);
}

let loadPromise: Promise<void> | null = null;

export function loadRoutes(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const files = await walk(routesDir);

    for (const file of files) {
      const base = path.basename(file, path.extname(file));
      const isReserved = base.startsWith("_");
      const isFallback = base === WS_FALLBACK_NAME;

      if (isReserved && !isFallback) continue;

      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;

      if (isFallback) {
        if (typeof mod.WS === "function") {
          defaultWsHandler = mod.WS as WsRouteHandler;
        } else {
          console.error(`[Router] ${WS_FALLBACK_NAME} must export a WS handler. Skipping.`);
        }
        continue;
      }

      const urlPath = fileToUrlPath(file);
      let registered = false;

      for (const method of HTTP_METHODS) {
        const handler = mod[method];
        if (typeof handler === "function") {
          httpRoutes.push({ method, path: urlPath, handler: handler as RouteHandler });
          registered = true;
        }
      }

      if (typeof mod.WS === "function") {
        wsRoutes.push({ path: urlPath, handler: mod.WS as WsRouteHandler });
        registered = true;
      }

      if (!registered) {
        console.error(
          `[Router] ${file} exports no recognized method handlers (GET/POST/\u2026/WS). Skipping.`
        );
      }
    }

    console.error(
      `[Router] Loaded ${httpRoutes.length} HTTP route(s), ${wsRoutes.length} WS route(s)` +
        (defaultWsHandler ? " + WS fallback" : "") +
        "."
    );
  })();

  return loadPromise;
}

import { getProcessManager, getAccountStore, getDataDir } from "./manager-registry.js";
import { WS_PORT } from "../executor-config.js";

export async function dispatchHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost`);
  const pm = getProcessManager();
  const store = getAccountStore();

  if (pm && store) {
    if (url.pathname === "/api/accounts/add") {
      const alias = url.searchParams.get("alias");
      const cookie = url.searchParams.get("cookie");
      if (!alias || !cookie) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing alias or cookie" }));
        return;
      }
      try {
        await store.addAccount(alias, cookie);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      const htmlPath = path.join(__dirname, "dashboard.html");
      res.end(fs.readFileSync(htmlPath));
      return;
    }
    if (url.pathname === "/api/clients") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(pm.listClients()));
      return;
    }
    if (url.pathname === "/api/accounts") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(store.listAccounts()));
      return;
    }
    if (url.pathname === "/api/executor") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ running: true, version: "1.1.0" }));
      return;
    }
    if (url.pathname === "/api/system-status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        version: "1.1.0",
        port: WS_PORT,
        executorUrl: `http://localhost:${WS_PORT}`,
        dataDir: getDataDir(),
        uptime: process.uptime(),
      }));
      return;
    }
    if (url.pathname === "/api/clients/restart") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing clientId" }));
        return;
      }
      try {
        const newPid = await pm.restartClient(clientId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, pid: newPid }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
      return;
    }
    if (url.pathname === "/api/clients/close") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing clientId" }));
        return;
      }
      const success = pm.closeClient(clientId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success }));
      return;
    }
  }

  for (const route of httpRoutes) {
    if (route.path === url.pathname && route.method === req.method) {
      try {
        await route.handler(req, res, url);
      } catch (err) {
        console.error(`[Router] Handler error for ${req.method} ${url.pathname}:`, err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal server error");
        }
      }
      return;
    }
  }

  res.writeHead(200);
  res.end("MCP Server Running");
}

export function dispatchWs(ws: WebSocket, req: IncomingMessage): void {
  const urlPath = req.url || "/";
  const match = wsRoutes.find((r) => r.path === urlPath);
  if (match) {
    match.handler(ws, req);
    return;
  }
  defaultWsHandler?.(ws, req);
}
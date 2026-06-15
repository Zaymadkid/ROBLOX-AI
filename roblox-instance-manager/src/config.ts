import { homedir } from "os";
import { join } from "path";

export interface Config {
  executorUrl: string;
  dataDir: string;
  port: number;
}

export function loadConfig(): Config {
  const args = process.argv.slice(2);
  let executorUrl = "http://localhost:16384";
  let dataDir = join(homedir(), ".roblox-instance-manager");
  let port = 16385;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--executor-url":
        executorUrl = args[++i] ?? executorUrl;
        break;
      case "--data-dir":
        dataDir = args[++i] ?? dataDir;
        break;
      case "--port":
        port = parseInt(args[++i] ?? "16385", 10);
        break;
      case "--help":
        console.error("Usage: roblox-instance-manager [options]");
        console.error("Options:");
        console.error("  --executor-url <url>  Executor MCP URL (default: http://localhost:16384)");
        console.error("  --data-dir <path>     Data directory (default: ~/.roblox-instance-manager)");
        console.error("  --port <number>       Dashboard port (default: 16385)");
        console.error("  --help                Show this help");
        process.exit(0);
    }
  }

  return { executorUrl, dataDir, port };
}
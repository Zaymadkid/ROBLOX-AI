#!/usr/bin/env node
import { createInterface } from "readline";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=== Roblox Instance Manager MCP Setup ===\n");

  const url = (await ask("Executor MCP URL [http://localhost:16384]: ")) || "http://localhost:16384";

  console.log("\nInstalling dependencies...");
  execSync("npm install", { cwd: root, stdio: "inherit" });

  console.log("\nBuilding...");
  execSync("npm run build", { cwd: root, stdio: "inherit" });

  console.log("\n=== Setup Complete ===");
  console.log("\nTo use with your AI client:");
  console.log("");
  console.log("Claude Code:");
  console.log(`  claude mcp add roblox-instance-manager node ${join(root, "dist", "index.js")} -- --executor-url ${url}`);
  console.log("");
  console.log("Cursor:");
  console.log("  Add a new MCP tool with command: node");
  console.log(`  Args: ${join(root, "dist", "index.js")} --executor-url ${url}`);
  console.log("");
  console.log("Run with: npm start");
  console.log(`  (or: node ${join(root, "dist", "index.js")})`);

  rl.close();
}

main().catch(console.error);
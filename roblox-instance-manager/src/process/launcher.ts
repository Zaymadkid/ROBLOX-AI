import { spawn, execSync, ChildProcess } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const ROBLOX_PATHS = [
  join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Roblox", "Versions"),
  "C:\\Program Files (x86)\\Roblox\\Versions",
  "C:\\Program Files\\Roblox\\Versions",
];

function findRobloxExecutable(): string | null {
  for (const basePath of ROBLOX_PATHS) {
    if (!existsSync(basePath)) continue;
    try {
      const dirs = readdirSync(basePath);
      const sortedDirs = dirs
        .map(dir => ({ name: dir, path: join(basePath, dir) }))
        .filter(item => existsSync(join(item.path, "RobloxPlayerBeta.exe")))
        .sort((a, b) => {
          try {
            return statSync(b.path).mtimeMs - statSync(a.path).mtimeMs;
          } catch {
            return 0;
          }
        });

      if (sortedDirs.length > 0) {
        return join(sortedDirs[0].path, "RobloxPlayerBeta.exe");
      }
    } catch {
      continue;
    }
  }
  return null;
}

function getProtocolLauncher(): { exePath: string; argsPattern: string[] } | null {
  try {
    let regOutput = "";
    try {
      regOutput = execSync('reg query "HKCU\\Software\\Classes\\roblox-player\\shell\\open\\command" /ve', { encoding: "utf-8" });
    } catch {
      regOutput = execSync('reg query "HKCR\\roblox-player\\shell\\open\\command" /ve', { encoding: "utf-8" });
    }

    const match = regOutput.match(/REG_SZ\s+(.*)/);
    if (!match) return null;

    const rawCmd = match[1].trim();
    let exePath = "";
    let argsStr = "";

    if (rawCmd.startsWith('"')) {
      const closingQuote = rawCmd.indexOf('"', 1);
      if (closingQuote !== -1) {
        exePath = rawCmd.slice(1, closingQuote);
        argsStr = rawCmd.slice(closingQuote + 1).trim();
      } else {
        exePath = rawCmd;
      }
    } else {
      const spaceIdx = rawCmd.indexOf(' ');
      if (spaceIdx !== -1) {
        exePath = rawCmd.slice(0, spaceIdx);
        argsStr = rawCmd.slice(spaceIdx + 1).trim();
      } else {
        exePath = rawCmd;
      }
    }

    const argsPattern = argsStr.split(/\s+/).filter(Boolean);
    return { exePath, argsPattern };
  } catch (err) {
    console.error("[Launcher] Failed to parse protocol launcher from registry:", err);
    return null;
  }
}

function getRobloxPlayerPids(): number[] {
  try {
    const output = execSync('powershell -Command "Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"', { encoding: "utf8" });
    return output.trim().split(/\s+/).map(Number).filter(Boolean);
  } catch {
    return [];
  }
}

export interface LaunchResult {
  pid: number;
  process: ChildProcess;
}

export async function getAuthTicket(cookie: string): Promise<string> {
  const url = "https://auth.roblox.com/v1/authentication-ticket";
  const formattedCookie = cookie.startsWith(".ROBLOSECURITY=") ? cookie : `.ROBLOSECURITY=${cookie}`;

  const initRes = await fetch(url, {
    method: "POST",
    headers: {
      "Cookie": formattedCookie,
      "Referer": "https://www.roblox.com",
      "Content-Length": "0",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });

  const csrfToken = initRes.headers.get("x-csrf-token");

  const headers: Record<string, string> = {
    "Cookie": formattedCookie,
    "Referer": "https://www.roblox.com",
    "Content-Length": "0",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  };
  if (csrfToken) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  }

  const res = await fetch(url, {
    method: "POST",
    headers
  });

  const ticket = res.headers.get("rbx-authentication-ticket");
  if (!ticket) {
    const text = await res.text();
    throw new Error(`Failed to get authentication ticket: Status ${res.status}, Response: ${text}`);
  }

  return ticket;
}

export function launchRoblox(authTicket?: string, placeId?: number): LaunchResult {
  const protocolLauncher = getProtocolLauncher();
  
  let exePath = "";
  let args: string[] = [];
  
  const launchTime = Date.now();
  const protocolUrl = authTicket ? (
    placeId ? (
      `roblox-player:1+launchmode:play+gameinfo:${authTicket}+launchtime:${launchTime}+placelauncherurl:${encodeURIComponent(`https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${placeId}&isPlayTogetherGame=false`)}`
    ) : (
      `roblox-player:1+launchmode:app+gameinfo:${authTicket}+launchtime:${launchTime}`
    )
  ) : "";

  if (protocolLauncher && authTicket) {
    exePath = protocolLauncher.exePath;
    args = protocolLauncher.argsPattern.map(arg => {
      let cleaned = arg;
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      if (cleaned.includes("%1")) {
        return cleaned.replace(/%1/g, protocolUrl);
      }
      return cleaned;
    });
  } else {
    const directPath = findRobloxExecutable();
    if (!directPath) {
      throw new Error("RobloxPlayerBeta.exe not found. Please install Roblox.");
    }
    exePath = directPath;
    if (authTicket) {
      args.push(protocolUrl);
    }
  }

  const existingPids = getRobloxPlayerPids();

  console.error(`[Launcher] Spawning launcher: "${exePath}" with args:`, args);
  const proc = spawn(exePath, args, {
    detached: true,
    windowsHide: false,
    stdio: ["ignore", "ignore", "ignore"],
  });
  proc.unref();

  let spawnedPid = proc.pid ?? 0;

  if (protocolLauncher && authTicket) {
    const start = Date.now();
    let foundPid = 0;
    while (Date.now() - start < 15000) {
      const currentPids = getRobloxPlayerPids();
      const newPids = currentPids.filter(p => !existingPids.includes(p));
      if (newPids.length > 0) {
        foundPid = newPids[0];
        break;
      }
      if (currentPids.length > 0 && existingPids.length === 0) {
        foundPid = currentPids[0];
        break;
      }
      try {
        execSync("powershell -Command Start-Sleep -Milliseconds 250");
      } catch {}
    }
    if (foundPid) {
      console.error(`[Launcher] Detected spawned RobloxPlayerBeta.exe with PID: ${foundPid}`);
      spawnedPid = foundPid;
    }
  }

  return { pid: spawnedPid, process: proc };
}

export function killProcess(pid: number): boolean {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
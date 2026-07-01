import { spawn, execSync, ChildProcess } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const ROBLOX_PATHS = [
  join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Roblox", "Versions"),
  "C:\\Program Files (x86)\\Roblox\\Versions",
  "C:\\Program Files\\Roblox\\Versions",
];

export function findRobloxExecutable(): string | null {
  for (const basePath of ROBLOX_PATHS) {
    if (!existsSync(basePath)) continue;
    try {
      const dirs = readdirSync(basePath);
      const sortedDirs = dirs
        .map(dir => ({ name: dir, path: join(basePath, dir) }))
        .filter(item => existsSync(join(item.path, "RobloxPlayerBeta.exe")))
        .sort((a, b) => {
          try { return statSync(b.path).mtimeMs - statSync(a.path).mtimeMs; }
          catch { return 0; }
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

function getRobloxPlayerPids(): number[] {
  try {
    const output = execSync(
      'powershell -Command "Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"',
      { encoding: "utf8" }
    );
    return output.trim().split(/\s+/).map(Number).filter(Boolean);
  } catch {
    return [];
  }
}

function sleepMs(ms: number): void {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: "ignore" });
}

export interface LaunchResult {
  pid: number;
  process: ChildProcess;
}

export async function getAuthTicket(cookie: string): Promise<string> {
  const url = "https://auth.roblox.com/v1/authentication-ticket";

  let cookieVal = cookie.trim();
  if (cookieVal.startsWith("_|WARNING")) {
    const idx = cookieVal.lastIndexOf("|_");
    if (idx !== -1) cookieVal = cookieVal.slice(idx + 2).trim();
  }
  if (cookieVal.startsWith(".ROBLOSECURITY=")) cookieVal = cookieVal.slice(".ROBLOSECURITY=".length);
  const formattedCookie = `.ROBLOSECURITY=${cookieVal}`;

  // Validate cookie
  const authCheck = await fetch("https://users.roblox.com/v1/users/authenticated", {
    headers: {
      "Cookie": formattedCookie,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!authCheck.ok) {
    throw new Error(
      `Cookie is invalid or expired (status ${authCheck.status}). ` +
      `Please provide a fresh .ROBLOSECURITY cookie.`
    );
  }

  // Get CSRF token
  const csrfRes = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: {
      "Cookie": formattedCookie,
      "Content-Length": "0",
      "Origin": "https://www.roblox.com",
      "Referer": "https://www.roblox.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  const csrfToken = csrfRes.headers.get("x-csrf-token");
  if (!csrfToken) throw new Error(`Could not obtain CSRF token (status ${csrfRes.status}).`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Cookie": formattedCookie,
      "X-CSRF-TOKEN": csrfToken,
      "Origin": "https://www.roblox.com",
      "Referer": "https://www.roblox.com/",
      "Content-Length": "0",
      "Content-Type": "application/json;charset=UTF-8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
    },
  });

  const ticket = res.headers.get("rbx-authentication-ticket");
  if (!ticket) {
    const text = await res.text();
    throw new Error(`Failed to get authentication ticket: Status ${res.status}, Response: ${text}`);
  }
  return ticket;
}

export function launchRoblox(authTicket?: string, placeId?: number): LaunchResult {
  const exePath = findRobloxExecutable();
  if (!exePath) {
    throw new Error("RobloxPlayerBeta.exe not found. Please install Roblox.");
  }

  const launchTime = Date.now();
  const args: string[] = [];

  if (authTicket) {
    if (placeId) {
      const placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${placeId}&isPlayTogetherGame=false`;
      args.push("--play", "-t", authTicket, "-j", placeLauncherUrl, "--launchtime", String(launchTime), "--rloc", "en_us", "--culturecode", "en-us");
    } else {
      args.push("--app", "-t", authTicket, "--launchtime", String(launchTime), "--rloc", "en_us", "--culturecode", "en-us");
    }
  }

  const existingPids = getRobloxPlayerPids();
  console.error(`[Launcher] Spawning RobloxPlayerBeta.exe`);

  const proc = spawn("cmd.exe", ["/c", "start", "", exePath, ...args], {
    detached: true,
    windowsHide: false,
    stdio: ["ignore", "ignore", "ignore"],
  });
  proc.unref();

  // Wait for the RobloxPlayerBeta process to appear (up to 20s)
  let spawnedPid = proc.pid ?? 0;
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const current = getRobloxPlayerPids();
    const newPids = current.filter(p => !existingPids.includes(p));
    if (newPids.length > 0) {
      spawnedPid = newPids[0];
      console.error(`[Launcher] Detected RobloxPlayerBeta.exe PID: ${spawnedPid}`);
      break;
    }
    sleepMs(300);
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

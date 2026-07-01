import { spawn, execSync, ChildProcess } from "child_process";
import { existsSync, readdirSync, statSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";

// ── PowerShell script that closes Roblox's singleton mutex inside a target process ──
// Uses NtQuerySystemInformation to enumerate handles, finds mutexes with "singleton"
// or "roblox" in their name, and closes them via DuplicateHandle + DUPLICATE_CLOSE_SOURCE.
const MUTEX_KILLER_PS1 = `
param([int]$TargetPid)

$typeDef = @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class RobloxMutexKiller {
    [DllImport("ntdll.dll")]
    static extern int NtQuerySystemInformation(int cls, IntPtr buf, int len, ref int ret);
    [DllImport("ntdll.dll")]
    static extern int NtQueryObject(IntPtr h, int cls, IntPtr buf, int len, ref int ret);
    [DllImport("kernel32.dll")]
    static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll")]
    static extern bool DuplicateHandle(IntPtr srcProc, IntPtr srcHandle, IntPtr dstProc, out IntPtr dstHandle, uint access, bool inherit, uint opts);
    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr h);

    [StructLayout(LayoutKind.Sequential)]
    struct HandleEntry {
        public int PID;
        public byte TypeNum;
        public byte Flags;
        public ushort Handle;
        public IntPtr Object;
        public int Access;
    }

    const int SystemHandleInformation = 16;
    const uint PROCESS_DUP = 0x40;
    const uint DUP_CLOSE_SOURCE = 1;

    public static int Kill(int pid) {
        int sz = 0x200000, retLen = 0;
        IntPtr buf = IntPtr.Zero;
        while (true) {
            buf = Marshal.AllocHGlobal(sz);
            int s = NtQuerySystemInformation(SystemHandleInformation, buf, sz, ref retLen);
            if (s == 0) break;
            Marshal.FreeHGlobal(buf);
            buf = IntPtr.Zero;
            if ((uint)s == 0xC0000004) { sz *= 2; continue; }
            return -1;
        }
        int n = Marshal.ReadInt32(buf);
        int esz = Marshal.SizeOf(typeof(HandleEntry));
        IntPtr arr = new IntPtr(buf.ToInt64() + 4);
        IntPtr proc = OpenProcess(PROCESS_DUP, false, pid);
        IntPtr self = Process.GetCurrentProcess().Handle;
        int killed = 0;
        for (int i = 0; i < n; i++) {
            var e = (HandleEntry)Marshal.PtrToStructure(new IntPtr(arr.ToInt64() + i * esz), typeof(HandleEntry));
            if (e.PID != pid) continue;
            IntPtr dup;
            if (!DuplicateHandle(proc, new IntPtr(e.Handle), self, out dup, 0, false, 2)) continue;
            int nLen = 0;
            IntPtr nBuf = Marshal.AllocHGlobal(2048);
            NtQueryObject(dup, 1, nBuf, 2048, ref nLen);
            string name = "";
            try {
                short len2 = Marshal.ReadInt16(nBuf);
                if (len2 > 0) {
                    IntPtr sp = Marshal.ReadIntPtr(nBuf, IntPtr.Size);
                    if (sp != IntPtr.Zero) name = Marshal.PtrToStringUni(sp, len2 / 2) ?? "";
                }
            } catch {}
            Marshal.FreeHGlobal(nBuf);
            CloseHandle(dup);
            string nl = name.ToLowerInvariant();
            if (nl.Contains("singleton") || nl.Contains("robloxmutex") || nl.Contains("roblox_mutex")) {
                IntPtr dummy;
                DuplicateHandle(proc, new IntPtr(e.Handle), IntPtr.Zero, out dummy, 0, false, DUP_CLOSE_SOURCE);
                killed++;
            }
        }
        CloseHandle(proc);
        Marshal.FreeHGlobal(buf);
        return killed;
    }
}
"@

Add-Type -TypeDefinition $typeDef -ErrorAction SilentlyContinue
try {
    $result = [RobloxMutexKiller]::Kill($TargetPid)
    Write-Output $result
} catch {
    Write-Output 0
}
`;

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

/**
 * Releases Roblox's singleton mutex inside the target process so a subsequent
 * instance can be launched. Writes a temp PS1 file, executes it, then deletes it.
 */
function releaseSingletonMutex(pid: number): void {
  const scriptPath = join(tmpdir(), `roblox-mutex-${pid}-${Date.now()}.ps1`);
  try {
    writeFileSync(scriptPath, MUTEX_KILLER_PS1, "utf-8");
    const result = execSync(
      `powershell -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -TargetPid ${pid}`,
      { encoding: "utf8", timeout: 8000 }
    ).trim();
    console.error(`[Launcher] Released ${result} mutex handle(s) in PID ${pid}`);
  } catch (err) {
    console.error(`[Launcher] Mutex release failed for PID ${pid}:`, err);
  } finally {
    try { unlinkSync(scriptPath); } catch {}
  }
}

function sleepMs(ms: number): void {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: "ignore" });
}

export interface LaunchResult {
  pid: number;
  process: ChildProcess;
}

/**
 * Strips the browser warning prefix Roblox sometimes embeds at the start of
 * the .ROBLOSECURITY cookie value, and ensures the `Cookie:` header value is
 * in the correct `name=value` format without double-prefixing.
 */
function formatCookie(raw: string): string {
  // Remove the "_|WARNING:..." prefix that Chrome DevTools copies
  let value = raw.trim();
  if (value.startsWith("_|WARNING")) {
    const idx = value.lastIndexOf("|_");
    if (idx !== -1) value = value.slice(idx + 2).trim();
  }
  // Strip any existing `.ROBLOSECURITY=` prefix so we don't double it
  if (value.startsWith(".ROBLOSECURITY=")) value = value.slice(".ROBLOSECURITY=".length);
  return `.ROBLOSECURITY=${value}`;
}

/**
 * Fetches a Roblox CSRF token by hitting a lightweight authenticated endpoint.
 * Roblox returns 403 + x-csrf-token header on any mutating request without one.
 */
async function getCsrfToken(formattedCookie: string): Promise<string> {
  const res = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: {
      "Cookie": formattedCookie,
      "Content-Length": "0",
      "Origin": "https://www.roblox.com",
      "Referer": "https://www.roblox.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  const token = res.headers.get("x-csrf-token");
  if (!token) throw new Error(`Could not obtain CSRF token (status ${res.status}). The cookie may be expired.`);
  return token;
}

export async function getAuthTicket(cookie: string): Promise<string> {
  const formattedCookie = formatCookie(cookie);

  // Validate the cookie first — fast check before expensive CSRF flow
  const authCheck = await fetch("https://users.roblox.com/v1/users/authenticated", {
    headers: {
      "Cookie": formattedCookie,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!authCheck.ok) {
    throw new Error(
      `Cookie is invalid or expired (status ${authCheck.status}). ` +
      `Please update the stored cookie with manage_accounts: open Roblox in your browser → ` +
      `DevTools → Application → Cookies → copy the .ROBLOSECURITY value.`
    );
  }

  const csrfToken = await getCsrfToken(formattedCookie);

  const res = await fetch("https://auth.roblox.com/v1/authentication-ticket", {
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

/**
 * Launches a Roblox instance directly via RobloxPlayerBeta.exe, bypassing any
 * bootstrapper (Fishstrap, Bloxstrap, etc.) to allow multiple concurrent instances.
 *
 * After the process is confirmed running, releases its singleton mutex so the
 * next call to launchRoblox can successfully start another instance.
 */
export function launchRoblox(authTicket?: string, placeId?: number): LaunchResult {
  const exePath = findRobloxExecutable();
  if (!exePath) {
    throw new Error("RobloxPlayerBeta.exe not found. Please install Roblox.");
  }

  const launchTime = Date.now();
  const args: string[] = [];

  if (authTicket) {
    if (placeId) {
      // Join a specific place
      const placeLauncherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&placeId=${placeId}&isPlayTogetherGame=false`;
      args.push(
        "--play",
        "-t", authTicket,
        "-j", placeLauncherUrl,
        "--launchtime", String(launchTime),
        "--rloc", "en_us",
        "--culturecode", "en-us",
      );
    } else {
      // Launch to home screen / app mode
      args.push(
        "--app",
        "-t", authTicket,
        "--launchtime", String(launchTime),
        "--rloc", "en_us",
        "--culturecode", "en-us",
      );
    }
  }

  // Snapshot existing Roblox PIDs so we can identify the new one
  const existingPids = getRobloxPlayerPids();

  console.error(`[Launcher] Spawning RobloxPlayerBeta.exe directly:`, exePath, args.slice(0, 2));

  const proc = spawn("cmd.exe", ["/c", "start", "", exePath, ...args], {
    detached: true,
    windowsHide: false,
    stdio: ["ignore", "ignore", "ignore"],
  });
  proc.unref();

  // Wait for the actual RobloxPlayerBeta process to appear (up to 20s)
  let spawnedPid = proc.pid ?? 0;
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const current = getRobloxPlayerPids();
    const newPids = current.filter(p => !existingPids.includes(p));
    if (newPids.length > 0) {
      spawnedPid = newPids[0];
      console.error(`[Launcher] Detected new RobloxPlayerBeta.exe PID: ${spawnedPid}`);
      break;
    }
    sleepMs(300);
  }

  // Give Roblox ~2.5s to fully initialize and grab the mutex
  sleepMs(2500);

  // Release the singleton mutex so a subsequent instance can be launched
  if (spawnedPid) {
    releaseSingletonMutex(spawnedPid);
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

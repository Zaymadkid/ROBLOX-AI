import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { encrypt, decrypt } from "./crypto.js";

export interface AccountEntry {
  cookie: string;
  created: string;
  lastUsed: string;
  userId?: number;
  username?: string;
  avatarUrl?: string;
}

export interface AccountInfo {
  alias: string;
  created: string;
  lastUsed: string;
  userId?: number;
  username?: string;
  avatarUrl?: string;
}

export class AccountStore {
  private filePath: string;
  private accounts: Record<string, AccountEntry> = {};

  constructor(dataDir: string) {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = join(dataDir, "accounts.json");
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      this.accounts = {};
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      this.accounts = JSON.parse(raw);
    } catch {
      this.accounts = {};
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.accounts, null, 2), "utf-8");
  }

  async addAccount(alias: string, cookie: string): Promise<void> {
    // Normalize cookie before storing — strip browser warning prefix
    let normalizedCookie = cookie.trim();
    if (normalizedCookie.startsWith("_|WARNING")) {
      const idx = normalizedCookie.lastIndexOf("|_");
      if (idx !== -1) normalizedCookie = normalizedCookie.slice(idx + 2).trim();
    }
    if (normalizedCookie.startsWith(".ROBLOSECURITY=")) {
      normalizedCookie = normalizedCookie.slice(".ROBLOSECURITY=".length);
    }
    cookie = normalizedCookie;
    const encrypted = encrypt(cookie);
    let userId: number | undefined;
    let username: string | undefined;
    let avatarUrl: string | undefined;

    try {
      // Strip warning prefix and avoid double-prefixing
      let cookieVal = cookie.trim();
      if (cookieVal.startsWith("_|WARNING")) {
        const idx = cookieVal.lastIndexOf("|_");
        if (idx !== -1) cookieVal = cookieVal.slice(idx + 2).trim();
      }
      if (cookieVal.startsWith(".ROBLOSECURITY=")) cookieVal = cookieVal.slice(".ROBLOSECURITY=".length);
      const formattedCookie = `.ROBLOSECURITY=${cookieVal}`;

      const userRes = await fetch("https://users.roblox.com/v1/users/authenticated", {
        headers: {
          "Cookie": formattedCookie,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        }
      });
      if (userRes.ok) {
        const userData = await userRes.json() as { id: number; name: string };
        userId = userData.id;
        username = userData.name;

        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json() as { data: Array<{ imageUrl: string }> };
          avatarUrl = thumbData.data?.[0]?.imageUrl;
        }
      }
    } catch (err) {
      console.error("[AccountStore] Failed to fetch Roblox profile details:", err);
    }

    this.accounts[alias] = {
      cookie: encrypted,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      userId,
      username,
      avatarUrl,
    };
    this.save();
  }

  removeAccount(alias: string): boolean {
    if (!this.accounts[alias]) return false;
    delete this.accounts[alias];
    this.save();
    return true;
  }

  getCookie(alias: string): string | null {
    const entry = this.accounts[alias];
    if (!entry) return null;
    try {
      entry.lastUsed = new Date().toISOString();
      this.save();
      return decrypt(entry.cookie);
    } catch {
      return null;
    }
  }

  listAccounts(): AccountInfo[] {
    return Object.entries(this.accounts).map(([alias, entry]) => ({
      alias,
      created: entry.created,
      lastUsed: entry.lastUsed,
      userId: entry.userId,
      username: entry.username,
      avatarUrl: entry.avatarUrl,
    }));
  }

  hasAccount(alias: string): boolean {
    return alias in this.accounts;
  }
}
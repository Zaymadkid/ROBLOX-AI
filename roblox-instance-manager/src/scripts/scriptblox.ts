import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface ScriptBloxSettings {
  token: string | null;
}

export interface ScriptBloxPublishParams {
  title: string;
  script: string;
  game?: string;
  isUniversal?: boolean;
  isPatched?: boolean;
}

export interface ScriptBloxPublishResult {
  success: boolean;
  slug?: string;
  url?: string;
  error?: string;
}

const SB_BASE = "https://scriptblox.com";

export class ScriptBloxClient {
  private filePath: string;
  private settings: ScriptBloxSettings;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "scriptblox.json");
    this.settings = this.load();
  }

  private load(): ScriptBloxSettings {
    if (!existsSync(this.filePath)) return { token: null };
    try {
      return JSON.parse(readFileSync(this.filePath, "utf-8"));
    } catch {
      return { token: null };
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), "utf-8");
  }

  getToken(): string | null {
    return this.settings.token;
  }

  setToken(token: string | null): void {
    this.settings.token = token ? token.trim() : null;
    this.save();
  }

  isConfigured(): boolean {
    return !!this.settings.token;
  }

  async publish(params: ScriptBloxPublishParams): Promise<ScriptBloxPublishResult> {
    const token = this.settings.token;
    if (!token) {
      return { success: false, error: "No ScriptBlox token configured. Add it in the dashboard settings." };
    }

    const body: Record<string, unknown> = {
      title: params.title,
      script: params.script,
      scriptType: "free",
      isUniversal: params.game ? false : (params.isUniversal ?? true),
      isPatched: params.isPatched ?? false,
    };

    if (params.game) {
      body.game = { name: params.game };
    }

    try {
      const res = await fetch(`${SB_BASE}/api/script/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": SB_BASE,
          "Referer": `${SB_BASE}/`,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { /* not JSON */ }

      if (!res.ok) {
        const msg = (json.message as string) ?? (json.error as string) ?? `HTTP ${res.status}`;
        return { success: false, error: msg };
      }

      const result = (json.result ?? json) as Record<string, unknown>;
      const slug = (result.slug as string) ?? (result._id as string) ?? "";
      return {
        success: true,
        slug,
        url: slug ? `${SB_BASE}/script/${slug}` : SB_BASE,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /** Search scripts on ScriptBlox (public, no auth needed). */
  async search(query: string, page = 1): Promise<unknown> {
    const url = `${SB_BASE}/api/script/search?q=${encodeURIComponent(query)}&page=${page}&max=12`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`ScriptBlox search failed: ${res.status}`);
    return res.json();
  }
}

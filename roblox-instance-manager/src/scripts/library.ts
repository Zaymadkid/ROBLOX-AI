import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

export interface ScriptEntry {
  id: string;
  name: string;
  description: string;
  game?: string;          // target game name
  placeId?: number;       // target place ID
  features: string[];
  tags: string[];
  code: string;
  createdAt: string;
  status: "approved" | "pending";
  addedBy: "ai" | "user";
}

export class ScriptLibrary {
  private filePath: string;
  private scripts: ScriptEntry[] = [];

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "script-library.json");
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      this.scripts = [];
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      this.scripts = JSON.parse(raw);
    } catch {
      this.scripts = [];
    }
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.scripts, null, 2), "utf-8");
  }

  addScript(entry: Omit<ScriptEntry, "id" | "createdAt">): ScriptEntry {
    const script: ScriptEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.scripts.unshift(script);
    this.save();
    return script;
  }

  listScripts(filter?: { status?: ScriptEntry["status"]; game?: string }): ScriptEntry[] {
    let result = [...this.scripts];
    if (filter?.status) result = result.filter((s) => s.status === filter.status);
    if (filter?.game) {
      const q = filter.game.toLowerCase();
      result = result.filter((s) => s.game?.toLowerCase().includes(q));
    }
    return result;
  }

  getScript(id: string): ScriptEntry | undefined {
    return this.scripts.find((s) => s.id === id);
  }

  approveScript(id: string): boolean {
    const script = this.scripts.find((s) => s.id === id);
    if (!script) return false;
    script.status = "approved";
    this.save();
    return true;
  }

  deleteScript(id: string): boolean {
    const idx = this.scripts.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.scripts.splice(idx, 1);
    this.save();
    return true;
  }

  updateScript(id: string, updates: Partial<Pick<ScriptEntry, "name" | "description" | "game" | "placeId" | "features" | "tags" | "code" | "status">>): boolean {
    const script = this.scripts.find((s) => s.id === id);
    if (!script) return false;
    Object.assign(script, updates);
    this.save();
    return true;
  }
}

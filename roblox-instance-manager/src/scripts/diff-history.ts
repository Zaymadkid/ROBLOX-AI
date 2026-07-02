import crypto from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ── Minimal Myers-style line diff ────────────────────────────────────────────

function computeUnifiedDiff(oldSrc: string, newSrc: string, path: string): string {
  const oldLines = oldSrc.split(/\r?\n/);
  const newLines = newSrc.split(/\r?\n/);

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;

  // Build edit script using DP (capped at reasonable sizes)
  const MAX_LINES = 2000;
  if (m > MAX_LINES || n > MAX_LINES) {
    const added   = newLines.filter(l => !oldLines.includes(l)).length;
    const removed = oldLines.filter(l => !newLines.includes(l)).length;
    return `--- a/${path}\n+++ b/${path}\n@@ Script too large for full diff (${m} → ${n} lines, ~${added} added, ~${removed} removed) @@\n`;
  }

  // dp[i][j] = LCS length of oldLines[0..i-1] and newLines[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Trace back to get edit operations
  type Op = { type: "keep" | "add" | "del"; line: string };
  const ops: Op[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: "keep", line: oldLines[i - 1]! });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "add", line: newLines[j - 1]! });
      j--;
    } else {
      ops.unshift({ type: "del", line: oldLines[i - 1]! });
      i--;
    }
  }

  // Build unified diff hunks (3 lines context)
  const CONTEXT = 3;
  const hunks: string[] = [];
  let hunkLines: string[] = [];
  let hunkOldStart = 1, hunkNewStart = 1;
  let oldLine = 1, newLine = 1;
  let inHunk = false;
  let lastChangeIdx = -1;

  // find last change
  for (let k = ops.length - 1; k >= 0; k--) {
    if (ops[k]!.type !== "keep") { lastChangeIdx = k; break; }
  }

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    const isChange = op.type !== "keep";
    const nearChange = ops.slice(Math.max(0, k - CONTEXT), k + CONTEXT + 1).some(o => o.type !== "keep");

    if (!isChange && !nearChange) {
      if (inHunk) {
        hunks.push(
          `@@ -${hunkOldStart},${hunkLines.filter(l => !l.startsWith("+")).length} +${hunkNewStart},${hunkLines.filter(l => !l.startsWith("-")).length} @@\n` +
          hunkLines.join("\n")
        );
        hunkLines = [];
        inHunk = false;
      }
      if (op.type === "keep") { oldLine++; newLine++; }
      continue;
    }

    if (!inHunk) {
      hunkOldStart = oldLine;
      hunkNewStart = newLine;
      inHunk = true;
    }

    if (op.type === "keep") {
      hunkLines.push(` ${op.line}`);
      oldLine++; newLine++;
    } else if (op.type === "del") {
      hunkLines.push(`-${op.line}`);
      oldLine++;
    } else {
      hunkLines.push(`+${op.line}`);
      newLine++;
    }

    if (inHunk && k === lastChangeIdx) {
      const tail = ops.slice(k + 1, k + 1 + CONTEXT).filter(o => o.type === "keep");
      tail.forEach(o => hunkLines.push(` ${o.line}`));
      hunks.push(
        `@@ -${hunkOldStart},${hunkLines.filter(l => !l.startsWith("+")).length} +${hunkNewStart},${hunkLines.filter(l => !l.startsWith("-")).length} @@\n` +
        hunkLines.join("\n")
      );
      hunkLines = [];
      inHunk = false;
      break;
    }
  }

  if (!hunks.length) return "";
  return `--- a/${path}\n+++ b/${path}\n` + hunks.join("\n");
}

// ── Data types ────────────────────────────────────────────────────────────────

export interface ScriptDiffEntry {
  id: string;
  path: string;
  placeId: number;
  placeName: string;
  detectedAt: string;
  oldHash: string;
  newHash: string;
  linesAdded: number;
  linesRemoved: number;
  diff: string;
}

interface Baseline {
  hash: string;
  source: string;
  placeName: string;
  indexedAt: string;
}

const MAX_DIFFS = 500;
const MAX_BASELINES = 2000;

export class DiffHistory {
  private diffsPath: string;
  private baselinesPath: string;
  private diffs: ScriptDiffEntry[] = [];
  /** key: `${placeId}::${path}` */
  private baselines: Map<string, Baseline> = new Map();

  constructor(dataDir: string) {
    this.diffsPath    = join(dataDir, "script-diffs.json");
    this.baselinesPath = join(dataDir, "script-baselines.json");
    this.loadDiffs();
    this.loadBaselines();
  }

  private loadDiffs(): void {
    if (!existsSync(this.diffsPath)) return;
    try { this.diffs = JSON.parse(readFileSync(this.diffsPath, "utf-8")); } catch { this.diffs = []; }
  }

  private saveDiffs(): void {
    writeFileSync(this.diffsPath, JSON.stringify(this.diffs, null, 2), "utf-8");
  }

  private loadBaselines(): void {
    if (!existsSync(this.baselinesPath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.baselinesPath, "utf-8")) as Record<string, Baseline>;
      this.baselines = new Map(Object.entries(raw));
    } catch { this.baselines = new Map(); }
  }

  private saveBaselines(): void {
    const obj = Object.fromEntries(this.baselines.entries());
    writeFileSync(this.baselinesPath, JSON.stringify(obj, null, 2), "utf-8");
  }

  private baselineKey(placeId: number, path: string): string {
    return `${placeId}::${path}`;
  }

  /**
   * Called when a new script source arrives. If a baseline exists and the hash
   * differs, computes and stores a diff. Always updates the baseline.
   * Returns the diff entry if one was created, null otherwise.
   */
  processScript(
    placeId: number,
    placeName: string,
    path: string,
    source: string,
    sourceHash: string
  ): ScriptDiffEntry | null {
    const key = this.baselineKey(placeId, path);
    const existing = this.baselines.get(key);

    // Update baseline always
    this.baselines.set(key, { hash: sourceHash, source, placeName, indexedAt: new Date().toISOString() });
    if (this.baselines.size > MAX_BASELINES) {
      // Evict oldest
      const oldest = this.baselines.keys().next().value;
      if (oldest) this.baselines.delete(oldest);
    }
    this.saveBaselines();

    // No previous baseline → first time seeing this script, no diff
    if (!existing || existing.hash === sourceHash) return null;

    const diff = computeUnifiedDiff(existing.source, source, path);
    if (!diff) return null;

    const linesAdded   = (diff.match(/^\+(?!\+\+)/gm) ?? []).length;
    const linesRemoved = (diff.match(/^-(?!--)/gm) ?? []).length;

    const entry: ScriptDiffEntry = {
      id: crypto.randomUUID(),
      path,
      placeId,
      placeName,
      detectedAt: new Date().toISOString(),
      oldHash: existing.hash,
      newHash: sourceHash,
      linesAdded,
      linesRemoved,
      diff,
    };

    this.diffs.unshift(entry);
    if (this.diffs.length > MAX_DIFFS) this.diffs.length = MAX_DIFFS;
    this.saveDiffs();

    return entry;
  }

  getDiffs(options: { placeId?: number; path?: string; limit?: number } = {}): ScriptDiffEntry[] {
    let result = this.diffs;
    if (options.placeId) result = result.filter(d => d.placeId === options.placeId);
    if (options.path)    result = result.filter(d => d.path.includes(options.path!));
    return result.slice(0, options.limit ?? 50);
  }

  getDiff(id: string): ScriptDiffEntry | undefined {
    return this.diffs.find(d => d.id === id);
  }

  clearDiffs(placeId?: number): void {
    if (placeId) {
      this.diffs = this.diffs.filter(d => d.placeId !== placeId);
    } else {
      this.diffs = [];
    }
    this.saveDiffs();
  }

  getPendingAlertCount(): number {
    // Count diffs from the last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.diffs.filter(d => new Date(d.detectedAt).getTime() > cutoff).length;
  }
}

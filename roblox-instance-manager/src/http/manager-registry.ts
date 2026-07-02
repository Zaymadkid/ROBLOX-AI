import { ProcessManager } from "../process/manager.js";
import { ScriptLibrary } from "../scripts/library.js";
import { ScriptBloxClient } from "../scripts/scriptblox.js";
import { DiffHistory } from "../scripts/diff-history.js";
import { registerDiffHook } from "../bridge/handlers/shared/script-source-store.js";

let processManager: ProcessManager | null = null;
let scriptLibrary: ScriptLibrary | null = null;
let scriptBloxClient: ScriptBloxClient | null = null;
let diffHistory: DiffHistory | null = null;
let dataDir: string = "";

export function setManagerInstances(pm: ProcessManager, dir: string) {
  processManager = pm;
  dataDir = dir;
  scriptLibrary = new ScriptLibrary(dir);
  scriptBloxClient = new ScriptBloxClient(dir);
  diffHistory = new DiffHistory(dir);

  // Wire diff hook: every time a new/changed script arrives, compare against baseline
  registerDiffHook((placeId, placeName, path, source, hash) => {
    diffHistory!.processScript(placeId, placeName, path, source, hash);
  });
}

export function getProcessManager(): ProcessManager | null {
  return processManager;
}

export function getDataDir(): string {
  return dataDir;
}

export function getScriptLibrary(): ScriptLibrary | null {
  return scriptLibrary;
}

export function getScriptBloxClient(): ScriptBloxClient | null {
  return scriptBloxClient;
}

export function getDiffHistory(): DiffHistory | null {
  return diffHistory;
}

import { ProcessManager } from "../process/manager.js";
import { ScriptLibrary } from "../scripts/library.js";
import { ScriptBloxClient } from "../scripts/scriptblox.js";

let processManager: ProcessManager | null = null;
let scriptLibrary: ScriptLibrary | null = null;
let scriptBloxClient: ScriptBloxClient | null = null;
let dataDir: string = "";

export function setManagerInstances(pm: ProcessManager, dir: string) {
  processManager = pm;
  dataDir = dir;
  scriptLibrary = new ScriptLibrary(dir);
  scriptBloxClient = new ScriptBloxClient(dir);
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

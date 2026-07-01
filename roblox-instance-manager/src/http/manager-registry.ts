import { ProcessManager } from "../process/manager.js";
import { ScriptLibrary } from "../scripts/library.js";

let processManager: ProcessManager | null = null;
let scriptLibrary: ScriptLibrary | null = null;
let dataDir: string = "";

export function setManagerInstances(pm: ProcessManager, dir: string) {
  processManager = pm;
  dataDir = dir;
  scriptLibrary = new ScriptLibrary(dir);
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

import { ProcessManager } from "../process/manager.js";
import { AccountStore } from "../accounts/store.js";

let processManager: ProcessManager | null = null;
let accountStore: AccountStore | null = null;
let dataDir: string = "";

export function setManagerInstances(pm: ProcessManager, store: AccountStore, dir: string) {
  processManager = pm;
  accountStore = store;
  dataDir = dir;
}

export function getProcessManager(): ProcessManager | null {
  return processManager;
}

export function getAccountStore(): AccountStore | null {
  return accountStore;
}

export function getDataDir(): string {
  return dataDir;
}
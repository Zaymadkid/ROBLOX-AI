export interface ExecutorStatus {
  running: boolean;
  url: string;
  version?: string;
}

export interface ExecutorTool {
  name: string;
  description: string;
}

export class ExecutorCoordinator {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:16384") {
    this.baseUrl = baseUrl;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<ExecutorStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        return { running: false, url: this.baseUrl };
      }
      const data = await response.json() as Record<string, unknown>;
      return {
        running: true,
        url: this.baseUrl,
        version: data.version as string | undefined,
      };
    } catch {
      return { running: false, url: this.baseUrl };
    }
  }

  getTools(): ExecutorTool[] {
    return [
      { name: "execute", description: "Run Lua code in a connected client" },
      { name: "get-data-by-code", description: "Run Luau and return data" },
      { name: "execute-file", description: "Run a .luau/.lua file in a client" },
      { name: "get-script-content", description: "Decompile a script by path" },
      { name: "script-grep", description: "Search decompiled scripts" },
      { name: "semantic-search-scripts", description: "Find scripts by behavior" },
      { name: "search-instances", description: "Find game objects with selectors" },
      { name: "get-descendants-tree", description: "Get instance hierarchy" },
      { name: "ensure-remote-spy", description: "Load remote spy" },
      { name: "get-remote-spy-logs", description: "View captured remote calls" },
      { name: "click-button", description: "Click a GUI button" },
      { name: "type-text-box", description: "Type into a text box" },
      { name: "list-clients", description: "List connected Roblox clients" },
      { name: "set-active-client", description: "Set active client" },
      { name: "screenshot-window", description: "Screenshot a Roblox window" },
    ];
  }
}
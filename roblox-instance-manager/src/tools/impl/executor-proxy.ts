const EXECUTOR_TOOL_URL = "http://localhost:16384/api/tool";

async function callExecutorTool(type: string, params: Record<string, unknown>): Promise<string> {
  try {
    const response = await fetch(EXECUTOR_TOOL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...params }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      return `Executor error: HTTP ${response.status}`;
    }
    const data = await response.json() as Record<string, unknown>;
    if (data.error) return `Executor error: ${data.error}`;
    return (data.result as string) ?? JSON.stringify(data);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg?.includes("fetch")) {
      return "Executor MCP not running. Start roblox-executor-mcp first.";
    }
    return `Executor request failed: ${msg}`;
  }
}

export async function handleExecute(params: { code: string; threadContext?: number }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("execute", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleGetDataByCode(params: { code: string; threadContext?: number; timeout?: number }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("get-data-by-code", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleGetScriptContent(params: { scriptPath?: string; scriptGetterSource?: string; startLine?: number; endLine?: number }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("get-script-content", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleScriptGrep(params: { query: string; limit?: number; literal?: boolean; caseSensitive?: boolean }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("script-grep", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleSemanticSearch(params: { query: string; limit?: number }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("semantic-search", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleSearchInstances(params: { selector: string; root?: string; limit?: number }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("search-instances", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleGetConsoleOutput(params: { limit?: number; logsOrder?: string; filter?: string }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("get-console-output", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleGetDescendantsTree(params: { root: string; maxDepth?: number; classFilter?: string }): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("get-descendants-tree", params);
  return { content: [{ type: "text", text: result }] };
}

export async function handleGetGameInfo(): Promise<{ content: Array<{ type: string; text: string }> }> {
  const result = await callExecutorTool("get-game-info", {});
  return { content: [{ type: "text", text: result }] };
}
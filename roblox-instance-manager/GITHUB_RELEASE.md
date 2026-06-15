# Roblox Instance Manager & Executor (Unified MCP)

<p align="center">
  <img src="https://img.shields.io/badge/Roblox-Unified%20MCP-blueviolet?style=for-the-badge&logo=roblox" alt="Roblox Unified MCP">
  <img src="https://img.shields.io/badge/Node.js-%E2%89%B5%2018-green?style=for-the-badge&logo=node.design" alt="Node Version">
  <img src="https://img.shields.io/badge/Port-16384-orange?style=for-the-badge&logo=socket.io" alt="Port Configuration">
  <img src="https://img.shields.io/badge/Status-Complete-success?style=for-the-badge" alt="Status">
</p>

## Overview

Unified MCP server merging Roblox process lifecycle management (launch, auth, place joins, health monitoring) with in-game Luau execution (code execution, console logs, remote spy, instance tree search, decompilation, GUI input emulation).
Features a premium glassmorphic web dashboard and Chrome/Edge/Opera extension for cookie auto-capture.

## Quick Start

```bash
npm install
npm run build

copy and run this in your third-party executor or Auto Execute roblox script:

---
local url = "https://raw.githubusercontent.com/Zaymadkid/ROBLOX-AI/main/roblox-executor-mcp-real/connector.luau"
local success, err = pcall(function()
    loadstring(game:HttpGet(url))()
end)

if success then
    print("[MCP] Harness loaded and connected successfully!")
else
    warn("[MCP] Failed to load harness: ", tostring(err))
end
---

```

Integrated with Composio & multi-MCP workflows.

Use stored accounts with encrypted cookies (AES-256-GCM). See {{source}/accounts/store.ts} for details.

# Roblox Instance Manager MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that manages Roblox client processes — launching, account auth, game joining, health monitoring, crash recovery — alongside the existing roblox-executor-mcp.

**Architecture:** Node.js MCP server using `@modelcontextprotocol/sdk`. Separate modules for process management, encrypted account storage, and executor MCP coordination. Windows-only (Roblox process management).

**Tech Stack:** Node.js ≥18, TypeScript, MCP SDK, Zod, crypto (built-in), child_process (built-in)

**Location:** `C:\Users\fpsko\Downloads\ROBLOX AI\roblox-instance-manager\`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/config.ts`
- Create: `src/index.ts`
- Create: `src/tools/index.ts`
- Create: `src/tools/schemas.ts`

- [ ] **Create package.json** — same pattern as executor MCP, dependencies: `@modelcontextprotocol/sdk`, `zod`, devDeps: `typescript`, `@types/node`
- [ ] **Create tsconfig.json** — target ES2022, module NodeNext, outDir dist, strict
- [ ] **Create src/config.ts** — CLI arg parsing for --executor-url (default localhost:16384), --data-dir
- [ ] **Create src/index.ts** — MCP server entry, register tools, connect stdio transport. Server name: `roblox-instance-manager`. Description mentions executor MCP
- [ ] **Create src/tools/schemas.ts** — Zod schemas for all tool inputs
- [ ] **Create src/tools/index.ts** — registerAllTools function that wires all tools

### Task 2: Account System

**Files:**
- Create: `src/accounts/crypto.ts`
- Create: `src/accounts/store.ts`

- [ ] **Create src/accounts/crypto.ts** — AES-256-GCM encryption using Node crypto. Functions: `encrypt(plaintext, key)`, `decrypt(ciphertext, key)`. Machine-derived key via crypto.randomUUID or stable machine ID
- [ ] **Create src/accounts/store.ts** — load/save accounts.json with encryption. Functions: `loadAccounts()`, `saveAccount(alias, cookie)`, `removeAccount(alias)`, `listAccounts()`. Returns account list without exposing cookies

### Task 3: Process Management

**Files:**
- Create: `src/process/launcher.ts`
- Create: `src/process/manager.ts`

- [ ] **Create src/process/launcher.ts** — Find RobloxPlayerBeta.exe (check common paths like `%LOCALAPPDATA%\Roblox\Versions`). Launch with optional args. Return PID. Handle "not found" error
- [ ] **Create src/process/manager.ts** — Track running clients (Map<clientId, {pid, accountName, placeId, startedAt, status}>). Functions: register, unregister, get, list, healthCheck (polling). Auto-restart logic with threshold. Periodic health sweep

### Task 4: MCP Tools

**Files:**
- Create: `src/tools/impl/launch-client.ts`
- Create: `src/tools/impl/join-game.ts`
- Create: `src/tools/impl/list-clients.ts`
- Create: `src/tools/impl/client-status.ts`
- Create: `src/tools/impl/restart-client.ts`
- Create: `src/tools/impl/close-client.ts`
- Create: `src/tools/impl/manage-accounts.ts`
- Create: `src/tools/impl/screenshot.ts`
- Create: `src/tools/impl/executor-info.ts`

Each tool gets its own file following the pattern: export a function that takes params + context, returns MCP-compatible response.

- [ ] `launch-client.ts` — launch Roblox with account cookie, optional placeId join
- [ ] `join-game.ts` — use `roblox://placeId` protocol URL to join a game
- [ ] `list-clients.ts` — return all tracked clients with status
- [ ] `client-status.ts` — health check a specific client (process alive? uptime?)
- [ ] `restart-client.ts` — kill + relaunch with same account
- [ ] `close-client.ts` — kill process, remove from tracking
- [ ] `manage-accounts.ts` — add/list/remove accounts (CRUD on encrypted store)
- [ ] `screenshot.ts` — use Windows screenshot APIs or PowerShell
- [ ] `executor-info.ts` — ping executor MCP, return status + tool list

### Task 5: Executor Bridge

**Files:**
- Create: `src/bridge/coordinator.ts`

- [ ] **Create src/bridge/coordinator.ts** — HTTP client to executor MCP at configurable URL. Functions: `pingExecutor()` (GET /api/status), `registerClient(clientId, pid, alias)` (POST /api/tool or similar), `getExecutorTools()` (list available tools). Gracefully handle executor not running

### Task 6: Setup Script + Docs

**Files:**
- Create: `scripts/setup.mjs`
- Create: `README.md`
- Create: `CHANGELOG.md`

- [ ] **Create README.md** — Overview of both MCP servers, setup instructions, tool reference, account management, how to configure in AI clients (Cursor, Claude Desktop, etc.)
- [ ] **Create CHANGELOG.md** — Start with v1.0.0, note this is initial build
- [ ] **Create scripts/setup.mjs** — Interactive setup: prompts for executor URL, installs deps, builds, prints instructions

### Task 7: Build & Verify

- [ ] **Run `npm run build`** — verify TypeScript compiles without errors
- [ ] **Verify output** — check dist/index.js exists and runs
- [ ] **Final check** — verify all tools registered, no missing imports

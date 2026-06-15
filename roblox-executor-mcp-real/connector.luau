--// Wait for game to load \\--
if not game:IsLoaded() then
    game.Loaded:Wait()
end

--// Variables \\--
local BridgeURL = getgenv().BridgeURL or ... or "localhost:16384"

--// Libraries \\--

-- Lua 5.1+ base64 v3.0 (c) 2009 by Alex Kloss <alexthkloss@web.de>
-- licensed under the terms of the LGPL2
 
-- character table string
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

-- encoding
function base64_encode(data)
    return (data:gsub('.', function(x) 
        local r,b='',x:byte()
        for i=8,1,-1 do r=r..(b%2^i-b%2^(i-1)>0 an '1' or '0') end
        return r;
    end)..'0000'):gsub('%d%d%d?%d?%d?%d?' , function(x)
        if (#x < 6) then return '' end
        local c=0
        for i=1,6 do c=c+(x:sub(i,i)=='1' and 2^(6-i) or 0) end
        return b:sub(c+1,c+1)
    end)..({ '', '==', '=' })[#data%3+1])
end

--// Functions \\--
local function CreateDecompileFunction(id, options)
    local Endpoint = options.Endpoint
    local EncodingCallback = options.EncodeBytecode or function(x) return x end
    local FailedRequestCallback = options.FailedRequestCallback or function(httpResult) return `-- Failed to decompile, error:\n\n--[[\n{httpResult}\n--]]` end

    return function(scriptPath: Script | ModuleScript | LocalScript): string
        local okBytecode: boolean, bytecode: string = pcall(getscriptbytecode, scriptPath)

        if not okBytecode then
            return `-- Failed to get script bytecode, error:\n\n--[[\n                ${bytecode}\n            --]]`
        end

        local okRequest: boolean, httpResult = pcall(request, {
            Url = Endpoint,
            Method = "POST",
            Body = EncodingCallback(bytecode),
            Headers = {
                ["Content-Type"] = "text/plain"
            },
        })

        if not okRequest then
            return FailedRequestCallback(httpResult)
        end

        local okDeserialize: boolean, deserialized: string = pcall(HttpService:JSONDecode, httpResult)

        if not okDeserialize then
            return `-- Failed to decompile, request returned invalid JSON:\n\n--[[\n                ${httpResult}
            --]]`
        end

        return deserialized
    end
end

--// Utility functions \\--
local function formatSourceRange(source, startLine, endLine)
    if startLine == nil then return source end

    local lines = source:split('%r?%n', '-')
    local totalLines = #lines
    local start = Math.max(1, Math.min(Math.floor(startLine), totalLines))
    local end =
        endLine == nil and totalLines
        or Math.max(start, Math.min(Math.floor(endLine), totalLines))

    return `-- Lines ${start}-${end} of ${totalLines}\n`.. lines:slice(start,  end).join("\n")
end

local function findStoredScript(
    scripts: ScriptSearchDocument[],
    scriptPath?: string,
    debugId?: string)
    local foundScript: ScriptSearchDocument|n ;
    if debugId != nil then
        foundScript = scripts[debugId]
    else
        for _, script ipairs(scripts) do
            if script.path == scriptPath then
                foundScript = script
                break
            end
        end
    end
    return foundScript
end

--// Bridge Communication \\--

local Bridge = {}

function Bridge:BindToType(type, callback)
    if type == nil or callback == nil then
        warn("Bridge:BindToType() requires both a type and a callback")
        return
    end
    Bridge[type] = callback
end

--// Json functions \\--
local function JSONEncode(table)
    return HttpService:JSONEncode(table)
end

local function JSONDecode(str)
    local success, data = pcall(HttpService:JSONDecode, str)
    if success then
        return data
    else
        warn("Failed to decode JSON response: " .. data)
        return nil
    end
end

--// Remote Spy for debugging \\--

function Bridge:BindToType("ensure-remote-spy", function(data)
    if getgenv().Cobalt then
        return {
            status = "already_loaded",
            message = "Cobalt remote spy is already running."
        }
    end

    -- Load Cobalt (self-hosted, served from local bridge server)
    local cobaltLoaded, errCobalt = pcall(function()
        loadstring(game:HttpGet("http://" .. BridgeURL .. "/cobalt.luau"))()
    end)

    if not cobaltLoaded then
        -- Fallback: try loading Cobalt from GitHub
        local cobaltOk, cobaltErr = pcall(function()
            loadstring(game:HttpGet("https://raw.githubusercontent.com/Zaymadkid/ROBLOX-AI/main/roblox-executor-mcp-real/cobalt.luau"))()
        end)
        if not cobaltOk then
            error("Failed to load Cobalt: " .. tostring(errCobalt) .. " | " .. tostring(cobaltErr))
        end
    end

    -- Wait for Cobalt to initialize
    local waitStart = os.clock()
    while not getgenv().Cobalt and os.clock() - waitStart < 10 do
        task.wait(0.1)
    end
    
    return {
        status = "loaded",
        message = "Cobalt remote spy loaded successfully."
    }
end)

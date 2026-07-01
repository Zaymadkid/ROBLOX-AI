local url = "https://raw.githubusercontent.com/Zaymadkid/ROBLOX-AI/main/roblox-instance-manager/connector.luau"
local success, err = pcall(function()
    loadstring(game:HttpGet(url))()
end)

if success then
    print("[MCP] Harness loaded and connected successfully!")
else
    warn("[MCP] Failed to load harness:", tostring(err))
end
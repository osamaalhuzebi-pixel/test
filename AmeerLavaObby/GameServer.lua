--[[
	ESCAPE AMEER'S LAVA OBBY
	Server script: builds the whole map and runs the game.

	Where to put it:  ServerScriptService  ->  + Script  (a normal "Script")
	Paste ALL of this file into that Script.
]]

---------------------------------------------------------------------
-- SETTINGS (you can change these)
---------------------------------------------------------------------
local CONFIG = {
	OwnerName = "Ameer",                -- name shown on the crown, the statue and the announcements
	OwnerUsernames = { "Pttttttte_3" }, -- Roblox username(s) that get the secret powers
	OwnerUserIds = {},                  -- optional, safer than usernames, e.g. { 123456789 }
	NumStages = 21,                     -- how many stages the obby has
	LobbyCoinValue = 1,
	CourseCoinValue = 5,
	WinCoins = 50,
	RespawnDelay = 1.5,
}

---------------------------------------------------------------------
-- SERVICES
---------------------------------------------------------------------
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local DataStoreService = game:GetService("DataStoreService")
local TextService = game:GetService("TextService")
local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")

-- We spawn characters ourselves so saved progress is loaded first
Players.CharacterAutoLoads = false

local LAVA_COLOR = Color3.fromRGB(255, 80, 0)
local GOLD = Color3.fromRGB(255, 205, 40)
local FONT = Enum.Font.FredokaOne

---------------------------------------------------------------------
-- REMOTES (server <-> player screen)
---------------------------------------------------------------------
local oldRemotes = ReplicatedStorage:FindFirstChild("ObbyRemotes")
if oldRemotes then
	oldRemotes:Destroy()
end
local remotes = Instance.new("Folder")
remotes.Name = "ObbyRemotes"
remotes:SetAttribute("NumStages", CONFIG.NumStages)
remotes:SetAttribute("OwnerName", CONFIG.OwnerName)
remotes.Parent = ReplicatedStorage

local function newRemote(name)
	local remote = Instance.new("RemoteEvent")
	remote.Name = name
	remote.Parent = remotes
	return remote
end

local NotifyEvent = newRemote("Notify")
local AnnounceEvent = newRemote("Announce")
local OwnerActionEvent = newRemote("OwnerAction")

local function notify(player, text, kind)
	NotifyEvent:FireClient(player, text, kind or "info")
end

local function announce(text)
	AnnounceEvent:FireAllClients(text)
end

---------------------------------------------------------------------
-- OWNER CHECK (the secret powers only work for these accounts)
---------------------------------------------------------------------
local function isOwner(player)
	for _, id in ipairs(CONFIG.OwnerUserIds) do
		if player.UserId == id then
			return true
		end
	end
	for _, name in ipairs(CONFIG.OwnerUsernames) do
		if string.lower(player.Name) == string.lower(name) then
			return true
		end
	end
	if game.CreatorType == Enum.CreatorType.User and game.CreatorId ~= 0 and player.UserId == game.CreatorId then
		return true
	end
	return false
end

---------------------------------------------------------------------
-- BUILD HELPERS
---------------------------------------------------------------------
local oldMap = workspace:FindFirstChild("AmeerObbyMap")
if oldMap then
	oldMap:Destroy()
end
local map = Instance.new("Folder")
map.Name = "AmeerObbyMap"
map.Parent = workspace

-- The course goes forward in the -Z direction (the way players face when they spawn).
-- "d" is the distance forward from the lobby.
local function at(x, y, d)
	return Vector3.new(x, y, -d)
end

local function part(props)
	local p = Instance.new(props.ClassName or "Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if props.Shape then
		p.Shape = props.Shape
	end
	for key, value in pairs(props) do
		if key ~= "Parent" and key ~= "ClassName" and key ~= "Shape" then
			p[key] = value
		end
	end
	p.Parent = props.Parent or map
	return p
end

-- A flat platform whose top surface is at yTop and which starts at distance dNear
local function platform(x, yTop, dNear, sizeX, sizeD, color, material)
	return part({
		Size = Vector3.new(sizeX, 1, sizeD),
		Position = at(x, yTop - 0.5, dNear + sizeD / 2),
		Color = color or Color3.fromRGB(240, 240, 240),
		Material = material or Enum.Material.SmoothPlastic,
	})
end

local function billboard(adornee, text, color, offsetY, width, height)
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromScale(width or 8, height or 2)
	gui.StudsOffset = Vector3.new(0, offsetY or 3, 0)
	gui.MaxDistance = 150
	gui.LightInfluence = 0
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = color or Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0
	label.TextScaled = true
	label.Font = FONT
	label.Parent = gui
	gui.Parent = adornee
	return gui, label
end

local function surfaceText(target, face, text, textColor, bgColor)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.LightInfluence = 0
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundColor3 = bgColor or Color3.new(0, 0, 0)
	label.BackgroundTransparency = bgColor and 0 or 1
	label.Text = text
	label.TextColor3 = textColor or Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0
	label.TextScaled = true
	label.Font = FONT
	label.Parent = gui
	gui.Parent = target
	return label
end

-- Move a player safely (also works when StreamingEnabled is on)
local function teleport(player, cframe)
	local character = player.Character
	if not character then
		return
	end
	if workspace.StreamingEnabled then
		pcall(function()
			player:RequestStreamAroundAsync(cframe.Position, 3)
		end)
	end
	if character.Parent then
		character:PivotTo(cframe)
	end
end

-- Invisible anchor for floating signs
local function signAnchor(position)
	return part({
		Name = "SignAnchor",
		Size = Vector3.new(1, 1, 1),
		Position = position,
		Transparency = 1,
		CanCollide = false,
		CanTouch = false,
		CanQuery = false,
	})
end

---------------------------------------------------------------------
-- LAVA (kills on touch, unless the owner has God Mode on)
---------------------------------------------------------------------
local function killFromHit(hit)
	local character = hit.Parent
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid or humanoid.Health <= 0 then
		return
	end
	local player = Players:GetPlayerFromCharacter(character)
	if player and player:GetAttribute("GodMode") then
		return
	end
	humanoid.Health = 0
end

local function makeKill(p)
	p.Touched:Connect(killFromHit)
end

---------------------------------------------------------------------
-- COINS
---------------------------------------------------------------------
local function makeCoin(position, value, respawnTime, parent, skipTag)
	local coin = part({
		Name = "Coin",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.6, 3, 3),
		Position = position,
		Color = GOLD,
		Material = Enum.Material.Neon,
		CanCollide = false,
		Parent = parent,
	})
	if not skipTag then
		CollectionService:AddTag(coin, "Coin")
	end

	local active = true
	coin.Touched:Connect(function(hit)
		if not active then
			return
		end
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		local leaderstats = player and player:FindFirstChild("leaderstats")
		if not leaderstats then
			return
		end
		active = false
		leaderstats.Coins.Value += value
		notify(player, "+" .. value .. " 💰", "coin")
		if respawnTime then
			coin.Transparency = 1
			task.delay(respawnTime, function()
				coin.Transparency = 0
				active = true
			end)
		else
			coin:Destroy()
		end
	end)
	return coin
end

---------------------------------------------------------------------
-- LOBBY
---------------------------------------------------------------------
local spawnLocation = workspace:FindFirstChildOfClass("SpawnLocation")
if not spawnLocation then
	spawnLocation = Instance.new("SpawnLocation")
	spawnLocation.Anchored = true
	spawnLocation.Size = Vector3.new(12, 1, 12)
	spawnLocation.Position = Vector3.new(0, 0.5, 0)
	spawnLocation.Parent = workspace
end
local LOBBY_CFRAME = spawnLocation.CFrame + Vector3.new(0, 4, 0)

Lighting.ClockTime = 14

-- Colorful tiled floor
local tileColors = {
	Color3.fromRGB(255, 170, 200),
	Color3.fromRGB(170, 220, 255),
	Color3.fromRGB(200, 255, 180),
	Color3.fromRGB(255, 240, 170),
}
for gx = -4, 4 do
	for gz = -3, 3 do
		part({
			Name = "LobbyTile",
			Size = Vector3.new(10, 1, 10),
			Position = Vector3.new(gx * 10, -0.45, gz * 10),
			Color = tileColors[(gx + gz) % 4 + 1],
		})
	end
end

-- Steps and start block
part({ Name = "Step", Size = Vector3.new(14, 2, 3), Position = at(0, 1, 34.5), Color = Color3.fromRGB(255, 150, 60) })
part({ Name = "StartBlock", Size = Vector3.new(14, 4, 12), Position = at(0, 2, 42), Color = Color3.fromRGB(255, 120, 40) })

-- Title gate
for _, x in ipairs({ -9, 9 }) do
	part({ Name = "GatePillar", Size = Vector3.new(3, 20, 3), Position = at(x, 10, 42), Color = Color3.fromRGB(60, 20, 20) })
end
local gateBeam = part({ Name = "GateSign", Size = Vector3.new(24, 6, 2), Position = at(0, 23, 42), Color = Color3.fromRGB(60, 20, 20) })
surfaceText(gateBeam, Enum.NormalId.Back, "🌋 ESCAPE " .. string.upper(CONFIG.OwnerName) .. "'S LAVA OBBY 🌋", Color3.fromRGB(255, 220, 60))

-- Lobby signs
billboard(signAnchor(Vector3.new(0, 9, 14)), "👍 LIKE + ⭐ FAVORITE\nfor more stages!", Color3.fromRGB(255, 255, 255), 0, 14, 4)
billboard(signAnchor(Vector3.new(0, 7, -24)), "Don't touch the LAVA! 🔥", LAVA_COLOR, 0, 12, 2)

-- Lobby coins
for n = 1, 12 do
	local angle = (n / 12) * math.pi * 2
	makeCoin(Vector3.new(math.cos(angle) * 18, 3, math.sin(angle) * 18), CONFIG.LobbyCoinValue, 15)
end

---------------------------------------------------------------------
-- OBSTACLES (each one returns where the next part of the course starts)
---------------------------------------------------------------------
local spinners = {}
local OBSTACLES = {}

-- Jump across small blocks
function OBSTACLES.jumps(d, y, i)
	local gap = 4 + math.min(i, 12) * 0.15
	for k = 1, 4 do
		local near = d + gap + (k - 1) * (5 + gap)
		local x = (k % 2 == 0) and 3 or -3
		local yTop = y + ((k % 2 == 0) and 1 or 0)
		platform(x, yTop, near, 5, 5, Color3.fromHSV((k * 0.15 + i * 0.05) % 1, 0.6, 1))
	end
	return d + 4 * (5 + gap), y
end

-- Thin zig-zag beam
function OBSTACLES.beam(d, y, i)
	local w = math.max(1.5, 3 - i * 0.08)
	local color = Color3.fromRGB(170, 100, 255)
	platform(-3, y, d + 4, w, 15, color)
	platform(0, y, d + 19 - w, 6 + w, w, color)
	platform(3, y, d + 19 - w, w, 15, color)
	return d + 34 - w, y
end

-- Spinning lava bar, jump over it
function OBSTACLES.spinner(d, y, i)
	local length = 30
	platform(0, y, d + 4, 16, length, Color3.fromRGB(60, 60, 80))
	local center = at(0, y + 1.5, d + 4 + length / 2)
	local bar = part({
		Name = "SpinBar",
		Size = Vector3.new(26, 1, 1),
		Position = center,
		Color = LAVA_COLOR,
		Material = Enum.Material.Neon,
		CanCollide = false,
	})
	makeKill(bar)
	table.insert(spinners, { part = bar, cframe = CFrame.new(center), speed = 1.5 + i * 0.05, angle = 0 })
	return d + 4 + length, y
end

-- Glass blocks that disappear after you step on them
function OBSTACLES.vanish(d, y, i)
	local gap = 4
	for k = 1, 5 do
		local near = d + gap + (k - 1) * (5 + gap)
		local x = (k % 2 == 0) and 2 or -2
		local block = platform(x, y, near, 5, 5, Color3.fromRGB(120, 220, 255), Enum.Material.Glass)
		block.Transparency = 0.15
		local busy = false
		block.Touched:Connect(function(hit)
			if busy or not Players:GetPlayerFromCharacter(hit.Parent) then
				return
			end
			busy = true
			TweenService:Create(block, TweenInfo.new(0.6), { Transparency = 0.85 }):Play()
			task.wait(0.6)
			block.CanCollide = false
			task.wait(2.5)
			block.Transparency = 0.15
			block.CanCollide = true
			busy = false
		end)
	end
	return d + 5 * (5 + gap), y
end

-- Lava walls sliding left and right
function OBSTACLES.sliders(d, y, i)
	local length = 36
	platform(0, y, d + 4, 14, length, Color3.fromRGB(50, 50, 70))
	for k = 1, 3 do
		local dd = d + 4 + k * 9
		local wall = part({
			Name = "LavaWall",
			Size = Vector3.new(4, 5, 2),
			Position = at(-5, y + 2.5, dd),
			Color = LAVA_COLOR,
			Material = Enum.Material.Neon,
		})
		makeKill(wall)
		local duration = math.max(0.8, 1.8 - i * 0.03) + k * 0.2
		local info = TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
		TweenService:Create(wall, info, { Position = at(5, y + 2.5, dd) }):Play()
	end
	return d + 4 + length, y
end

-- Climb up a ladder
function OBSTACLES.climb(d, y, i)
	local lower = platform(0, y, d + 4, 12, 10, Color3.fromRGB(255, 220, 120))
	billboard(lower, "CLIMB! ⬆️", Color3.fromRGB(255, 255, 255), 4, 6, 2)
	local edge = d + 14
	part({
		ClassName = "TrussPart",
		Size = Vector3.new(2, 16, 2),
		Position = at(0, y + 8, edge + 1),
		Color = Color3.fromRGB(220, 220, 220),
	})
	platform(0, y + 16, edge + 2, 12, 12, Color3.fromRGB(255, 220, 120))
	return edge + 14, y + 16
end

-- Bounce pad that launches you up
function OBSTACLES.bounce(d, y, i)
	local pad = platform(0, y, d + 4, 8, 8, Color3.fromRGB(80, 255, 120), Enum.Material.Neon)
	pad.Name = "BouncePad"
	pad:SetAttribute("Power", 100)
	CollectionService:AddTag(pad, "BouncePad")
	billboard(pad, "BOUNCE! 🚀", Color3.fromRGB(255, 255, 255), 4, 6, 2)
	platform(0, y + 14, d + 13, 12, 12, Color3.fromRGB(80, 200, 255))
	return d + 25, y + 14
end

local ORDER = { "jumps", "beam", "spinner", "vanish", "sliders", "climb", "bounce" }

---------------------------------------------------------------------
-- BUILD THE COURSE
---------------------------------------------------------------------
local checkpoints = {}
local d, y = 48, 4

for i = 1, CONFIG.NumStages do
	local kind = ORDER[(i - 1) % #ORDER + 1]
	d, y = OBSTACLES[kind](d, y, i)

	local near = d + 4
	local color = Color3.fromHSV((i / CONFIG.NumStages) % 1, 0.75, 1)
	local checkpoint = platform(0, y, near, 12, 12, color)
	checkpoint.Name = "Checkpoint" .. i
	surfaceText(checkpoint, Enum.NormalId.Top, tostring(i), Color3.new(1, 1, 1))
	makeCoin(at(4, y + 3, near + 6), CONFIG.CourseCoinValue, 30)

	local stageNumber = i
	checkpoint.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		local leaderstats = player and player:FindFirstChild("leaderstats")
		if leaderstats and leaderstats.Stage.Value < stageNumber then
			leaderstats.Stage.Value = stageNumber
			notify(player, "✅ Stage " .. stageNumber .. " / " .. CONFIG.NumStages, "good")
		end
	end)

	checkpoints[i] = checkpoint
	d = near + 12
end

-- Win area
local winNear = d + 4
platform(0, y, winNear, 30, 30, GOLD)
local winPad = part({
	Name = "WinPad",
	Size = Vector3.new(10, 1, 10),
	Position = at(0, y + 0.1, winNear + 15),
	Color = Color3.fromRGB(255, 240, 120),
	Material = Enum.Material.Neon,
})
billboard(winPad, "🏆 TOUCH TO WIN! 🏆", GOLD, 6, 14, 3)
local sparkle = Instance.new("ParticleEmitter")
sparkle.Color = ColorSequence.new(GOLD)
sparkle.LightEmission = 1
sparkle.Rate = 15
sparkle.Speed = NumberRange.new(6, 12)
sparkle.Lifetime = NumberRange.new(1, 2)
sparkle.Parent = winPad
local END_CFRAME = CFrame.new(at(0, y + 4, winNear + 4))

-- Lava sea under the whole course
local lavaLength = winNear + 40 - 50
local lava = part({
	Name = "LavaSea",
	Size = Vector3.new(400, 1, lavaLength),
	Position = at(0, 0.5, 50 + lavaLength / 2),
	Color = LAVA_COLOR,
	Material = Enum.Material.CrackedLava,
})
makeKill(lava)

-- Spin all spinners
RunService.Heartbeat:Connect(function(dt)
	for _, spinner in ipairs(spinners) do
		spinner.angle += spinner.speed * dt
		spinner.part.CFrame = spinner.cframe * CFrame.Angles(0, spinner.angle, 0)
	end
end)

---------------------------------------------------------------------
-- SECRET ROOM (only the owner can get in)
---------------------------------------------------------------------
local ROOM = Vector3.new(0, 600, 300)
part({ Name = "SecretFloor", Size = Vector3.new(40, 1, 40), Position = ROOM, Color = GOLD, Material = Enum.Material.Marble })
for _, wall in ipairs({
	{ Vector3.new(0, 7, 20), Vector3.new(40, 14, 1) },
	{ Vector3.new(0, 7, -20), Vector3.new(40, 14, 1) },
	{ Vector3.new(20, 7, 0), Vector3.new(1, 14, 40) },
	{ Vector3.new(-20, 7, 0), Vector3.new(1, 14, 40) },
}) do
	part({
		Name = "SecretWall",
		Size = wall[2],
		Position = ROOM + wall[1],
		Color = Color3.fromRGB(170, 80, 255),
		Material = Enum.Material.Glass,
		Transparency = 0.4,
	})
end
part({ ClassName = "Seat", Name = "Throne", Size = Vector3.new(4, 1, 4), Position = ROOM + Vector3.new(0, 1.5, -14), Color = Color3.fromRGB(200, 30, 60) })
part({ Name = "ThroneBack", Size = Vector3.new(4, 8, 1), Position = ROOM + Vector3.new(0, 5, -16.5), Color = GOLD, Material = Enum.Material.Neon })
billboard(signAnchor(ROOM + Vector3.new(0, 12, 0)), "🤫 " .. string.upper(CONFIG.OwnerName) .. "'S SECRET ROOM", GOLD, 0, 20, 3)

local SECRET_CFRAME = CFrame.new(ROOM + Vector3.new(0, 4, 8))

local treasurePad = part({
	Name = "TreasurePad",
	Size = Vector3.new(6, 1, 6),
	Position = ROOM + Vector3.new(-12, 0.6, 0),
	Color = Color3.fromRGB(80, 255, 120),
	Material = Enum.Material.Neon,
})
billboard(treasurePad, "💎 +100 COINS", Color3.fromRGB(255, 255, 255), 4, 8, 2)
local treasureCooldown = {}
treasurePad.Touched:Connect(function(hit)
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	if not player or not isOwner(player) then
		return
	end
	local now = os.clock()
	if treasureCooldown[player] and now - treasureCooldown[player] < 60 then
		return
	end
	treasureCooldown[player] = now
	player.leaderstats.Coins.Value += 100
	notify(player, "💎 +100 secret coins!", "coin")
end)

local exitPad = part({
	Name = "ExitPad",
	Size = Vector3.new(6, 1, 6),
	Position = ROOM + Vector3.new(12, 0.6, 0),
	Color = Color3.fromRGB(80, 160, 255),
	Material = Enum.Material.Neon,
})
billboard(exitPad, "🚪 BACK TO LOBBY", Color3.fromRGB(255, 255, 255), 4, 8, 2)
exitPad.Touched:Connect(function(hit)
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	if player then
		teleport(player, LOBBY_CFRAME)
	end
end)

---------------------------------------------------------------------
-- AMEER STATUE (secret: only the owner can enter the secret room from it)
---------------------------------------------------------------------
local pedestal = part({
	Name = "StatuePedestal",
	Size = Vector3.new(10, 4, 10),
	Position = Vector3.new(30, 2, 0),
	Color = GOLD,
	Material = Enum.Material.Marble,
})
billboard(pedestal, "👑 " .. string.upper(CONFIG.OwnerName) .. " 👑\nTHE CREATOR", GOLD, 17, 12, 4)

local pedestalCooldown = {}
pedestal.Touched:Connect(function(hit)
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	if not player or not isOwner(player) or pedestalCooldown[player] then
		return
	end
	pedestalCooldown[player] = true
	task.delay(2, function()
		pedestalCooldown[player] = nil
	end)
	teleport(player, SECRET_CFRAME)
	notify(player, "🤫 Secret room unlocked!", "good")
end)

task.spawn(function()
	local userId = CONFIG.OwnerUserIds[1]
	if not userId and CONFIG.OwnerUsernames[1] then
		local ok, id = pcall(function()
			return Players:GetUserIdFromNameAsync(CONFIG.OwnerUsernames[1])
		end)
		if ok then
			userId = id
		end
	end
	if not userId then
		return
	end

	local ok, model = pcall(function()
		return Players:CreateHumanoidModelFromUserId(userId)
	end)
	if not ok or not model then
		warn("Could not build the statue:", model)
		return
	end

	model.Name = "OwnerStatue"
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("BasePart") then
			item.Anchored = true
		elseif item:IsA("LuaSourceContainer") then
			item:Destroy()
		end
	end
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end
	model.Parent = map
	model:ScaleTo(2)

	local top = pedestal.Position.Y + pedestal.Size.Y / 2
	local spot = Vector3.new(pedestal.Position.X, top + 10, pedestal.Position.Z)
	model:PivotTo(CFrame.lookAt(spot, Vector3.new(0, spot.Y, 0)))
	local boxCFrame, boxSize = model:GetBoundingBox()
	local feetY = boxCFrame.Position.Y - boxSize.Y / 2
	model:PivotTo(model:GetPivot() + Vector3.new(0, top - feetY, 0))
end)

---------------------------------------------------------------------
-- TRAIL SHOP
---------------------------------------------------------------------
local TRAILS = {
	Blue = { Price = 25, Colors = { Color3.fromRGB(0, 170, 255), Color3.fromRGB(0, 255, 255) } },
	Fire = { Price = 100, Colors = { Color3.fromRGB(255, 230, 0), Color3.fromRGB(255, 40, 0) } },
	Rainbow = { Price = 250, Rainbow = true },
	Golden = { Price = 0, OwnerOnly = true, Colors = { GOLD, Color3.fromRGB(255, 255, 220) } },
}

local sessionData = {}

local function trailColor(info)
	if info.Rainbow then
		local points = {}
		for k = 0, 6 do
			table.insert(points, ColorSequenceKeypoint.new(k / 6, Color3.fromHSV(k / 6, 1, 1)))
		end
		return ColorSequence.new(points)
	end
	return ColorSequence.new(info.Colors[1], info.Colors[2])
end

local function applyTrail(player)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root then
		return
	end
	for _, name in ipairs({ "ObbyTrail", "TrailTop", "TrailBottom" }) do
		local old = root:FindFirstChild(name)
		if old then
			old:Destroy()
		end
	end

	local data = sessionData[player]
	local info = data and data.Equipped and TRAILS[data.Equipped]
	if not info then
		return
	end

	local a0 = Instance.new("Attachment")
	a0.Name = "TrailTop"
	a0.Position = Vector3.new(0, 0.8, 0)
	a0.Parent = root
	local a1 = Instance.new("Attachment")
	a1.Name = "TrailBottom"
	a1.Position = Vector3.new(0, -0.8, 0)
	a1.Parent = root

	local trail = Instance.new("Trail")
	trail.Name = "ObbyTrail"
	trail.Attachment0 = a0
	trail.Attachment1 = a1
	trail.Color = trailColor(info)
	trail.Lifetime = 0.6
	trail.LightEmission = 0.6
	trail.Transparency = NumberSequence.new(0, 1)
	trail.Parent = root
end

local shopSpots = { { "Blue", 12 }, { "Fire", 4 }, { "Rainbow", -4 }, { "Golden", -12 } }
billboard(signAnchor(Vector3.new(-30, 9, 0)), "✨ TRAIL SHOP ✨", Color3.fromRGB(255, 255, 255), 0, 14, 3)

for _, spot in ipairs(shopSpots) do
	local name, z = spot[1], spot[2]
	local info = TRAILS[name]
	local pad = part({
		Name = name .. "TrailPad",
		Size = Vector3.new(7, 1, 7),
		Position = Vector3.new(-30, 0.1, z),
		Color = info.Rainbow and Color3.fromRGB(255, 100, 200) or info.Colors[1],
		Material = Enum.Material.Neon,
	})
	local priceText = info.OwnerOnly and "👑 OWNER ONLY" or (info.Price .. " 💰")
	billboard(pad, name .. " Trail\n" .. priceText, Color3.fromRGB(255, 255, 255), 3.5, 8, 3)

	local cooldown = {}
	pad.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player or cooldown[player] then
			return
		end
		local data = sessionData[player]
		local leaderstats = player:FindFirstChild("leaderstats")
		if not data or not leaderstats then
			return
		end
		cooldown[player] = true
		task.delay(1.5, function()
			cooldown[player] = nil
		end)

		if info.OwnerOnly then
			if not isOwner(player) then
				notify(player, "🔒 This trail is only for " .. CONFIG.OwnerName .. "!", "bad")
				return
			end
		elseif not table.find(data.Trails, name) then
			if leaderstats.Coins.Value < info.Price then
				notify(player, "You need " .. (info.Price - leaderstats.Coins.Value) .. " more coins 💰", "bad")
				return
			end
			leaderstats.Coins.Value -= info.Price
			table.insert(data.Trails, name)
			notify(player, "🎉 You bought the " .. name .. " Trail!", "good")
		end

		data.Equipped = name
		applyTrail(player)
		notify(player, "✨ " .. name .. " Trail equipped!", "good")
	end)
end

---------------------------------------------------------------------
-- SAVING (coins, wins, stage and trails)
---------------------------------------------------------------------
local dataStore
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore("AmeerLavaObby_v1")
	end)
	if ok then
		dataStore = result
	else
		warn("Saving is off. Publish the game and enable Studio Access to API Services.")
	end
end

local function loadData(player)
	local data = { Coins = 0, Wins = 0, Stage = 0, Trails = {}, Equipped = nil }
	if dataStore then
		local ok, saved = pcall(function()
			return dataStore:GetAsync("player_" .. player.UserId)
		end)
		if ok and type(saved) == "table" then
			for key, value in pairs(saved) do
				data[key] = value
			end
		elseif not ok then
			warn("Could not load data:", saved)
		end
	end
	return data
end

local function saveData(player)
	local data = sessionData[player]
	local leaderstats = player:FindFirstChild("leaderstats")
	if not dataStore or not data or not leaderstats then
		return
	end
	local toSave = {
		Coins = leaderstats.Coins.Value,
		Wins = leaderstats.Wins.Value,
		Stage = leaderstats.Stage.Value,
		Trails = data.Trails,
		Equipped = data.Equipped,
	}
	local ok, err = pcall(function()
		dataStore:SetAsync("player_" .. player.UserId, toSave)
	end)
	if not ok then
		warn("Could not save data:", err)
	end
end

---------------------------------------------------------------------
-- WINNING
---------------------------------------------------------------------
local winCooldown = {}
winPad.Touched:Connect(function(hit)
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	local leaderstats = player and player:FindFirstChild("leaderstats")
	if not leaderstats or winCooldown[player] then
		return
	end
	winCooldown[player] = true
	leaderstats.Wins.Value += 1
	leaderstats.Coins.Value += CONFIG.WinCoins
	leaderstats.Stage.Value = 0
	announce("🏆 " .. player.DisplayName .. " ESCAPED THE LAVA! 🏆")
	notify(player, "+" .. CONFIG.WinCoins .. " 💰 for winning!", "coin")
	task.wait(3)
	teleport(player, LOBBY_CFRAME)
	winCooldown[player] = nil
end)

---------------------------------------------------------------------
-- OWNER LOOK AND POWERS
---------------------------------------------------------------------
local function decorateOwner(character)
	local head = character:WaitForChild("Head", 5)
	local root = character:WaitForChild("HumanoidRootPart", 5)
	if not head or not root then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end
	local tag = billboard(head, "👑 " .. string.upper(CONFIG.OwnerName) .. " 👑\nTHE CREATOR", GOLD, 3, 8, 3)
	tag.Name = "OwnerTag"
	tag.MaxDistance = 250
	local sparkles = Instance.new("Sparkles")
	sparkles.SparkleColor = GOLD
	sparkles.Parent = root
end

local function applyPowers(player, character)
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		return
	end
	humanoid.UseJumpPower = true
	if player:GetAttribute("SuperSpeed") then
		humanoid.WalkSpeed = 50
		humanoid.JumpPower = 100
	else
		humanoid.WalkSpeed = 16
		humanoid.JumpPower = 50
	end
	local wantScale = player:GetAttribute("Giant") and 2.5 or 1
	if character:GetScale() ~= wantScale then
		character:ScaleTo(wantScale)
	end
end

local function toggleAttribute(player, name, label)
	local newValue = not player:GetAttribute(name)
	player:SetAttribute(name, newValue)
	notify(player, label .. (newValue and ": ON" or ": OFF"), newValue and "good" or "info")
	return newValue
end

local rainFolder = Instance.new("Folder")
rainFolder.Name = "CoinRain"
rainFolder.Parent = map

local function coinRain()
	for _ = 1, 40 do
		local angle = math.random() * math.pi * 2
		local radius = math.random(5, 25)
		local target = Vector3.new(math.cos(angle) * radius, 3, math.sin(angle) * radius)
		local coin = makeCoin(target + Vector3.new(0, 60, 0), 2, nil, rainFolder, true)
		local tween = TweenService:Create(coin, TweenInfo.new(1 + math.random(), Enum.EasingStyle.Bounce), { Position = target })
		tween.Completed:Connect(function()
			if coin.Parent then
				CollectionService:AddTag(coin, "Coin")
			end
		end)
		tween:Play()
		task.delay(30, function()
			if coin.Parent then
				coin:Destroy()
			end
		end)
	end
end

local lastAction = {}
OwnerActionEvent.OnServerEvent:Connect(function(player, action, argument)
	if not isOwner(player) or type(action) ~= "string" then
		return
	end
	local now = os.clock()
	if lastAction[player] and now - lastAction[player] < 0.3 then
		return
	end
	lastAction[player] = now

	local character = player.Character
	local leaderstats = player:FindFirstChild("leaderstats")

	if action == "Speed" then
		toggleAttribute(player, "SuperSpeed", "⚡ Super Speed")
		if character then
			applyPowers(player, character)
		end
	elseif action == "God" then
		toggleAttribute(player, "GodMode", "🛡️ God Mode (lava can't hurt you)")
	elseif action == "Giant" then
		toggleAttribute(player, "Giant", "🦖 Giant Mode")
		if character then
			applyPowers(player, character)
		end
	elseif action == "Skip" and leaderstats then
		if leaderstats.Stage.Value < CONFIG.NumStages then
			leaderstats.Stage.Value += 1
			local checkpoint = checkpoints[leaderstats.Stage.Value]
			if checkpoint then
				teleport(player, checkpoint.CFrame + Vector3.new(0, 4, 0))
			end
			notify(player, "⏭️ Skipped to stage " .. leaderstats.Stage.Value, "good")
		end
	elseif action == "End" and leaderstats then
		leaderstats.Stage.Value = CONFIG.NumStages
		teleport(player, END_CFRAME)
	elseif action == "CoinRain" then
		coinRain()
		announce("💰 " .. CONFIG.OwnerName .. " made it RAIN COINS in the lobby! 💰")
	elseif action == "SecretRoom" then
		teleport(player, SECRET_CFRAME)
	elseif action == "DayNight" then
		local isDay = Lighting.ClockTime > 6 and Lighting.ClockTime < 18
		Lighting.ClockTime = isDay and 0 or 14
		announce(isDay and "🌙 " .. CONFIG.OwnerName .. " turned on the NIGHT!" or "☀️ " .. CONFIG.OwnerName .. " brought back the DAY!")
	elseif action == "Announce" and type(argument) == "string" then
		local text = string.sub(argument, 1, 120)
		local ok, filtered = pcall(function()
			return TextService:FilterStringAsync(text, player.UserId):GetNonChatStringForBroadcastAsync()
		end)
		if ok and filtered ~= "" then
			announce("📢 " .. CONFIG.OwnerName .. ": " .. filtered)
		end
	end
end)

---------------------------------------------------------------------
-- PLAYERS
---------------------------------------------------------------------
local function onCharacterAdded(player, character)
	local humanoid = character:WaitForChild("Humanoid")
	character:WaitForChild("HumanoidRootPart")
	task.wait(0.1)

	local leaderstats = player:FindFirstChild("leaderstats")
	local checkpoint = leaderstats and checkpoints[leaderstats.Stage.Value]
	if checkpoint then
		teleport(player, checkpoint.CFrame + Vector3.new(0, 4, 0))
	end

	applyTrail(player)
	if isOwner(player) then
		decorateOwner(character)
		applyPowers(player, character)
	end

	humanoid.Died:Connect(function()
		task.wait(CONFIG.RespawnDelay)
		if player.Parent then
			player:LoadCharacter()
		end
	end)
end

local function onPlayerAdded(player)
	local data = loadData(player)
	if not player.Parent then
		return
	end

	local owner = isOwner(player)
	sessionData[player] = { Trails = data.Trails or {}, Equipped = data.Equipped }
	if owner and not sessionData[player].Equipped then
		sessionData[player].Equipped = "Golden"
	end

	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	for _, stat in ipairs({ { "Stage", math.clamp(data.Stage or 0, 0, CONFIG.NumStages) }, { "Coins", data.Coins or 0 }, { "Wins", data.Wins or 0 } }) do
		local value = Instance.new("IntValue")
		value.Name = stat[1]
		value.Value = stat[2]
		value.Parent = leaderstats
	end
	leaderstats.Parent = player

	player:SetAttribute("IsOwner", owner)
	player.CharacterAdded:Connect(function(character)
		onCharacterAdded(player, character)
	end)
	player:LoadCharacter()

	if owner then
		announce("👑 " .. string.upper(CONFIG.OwnerName) .. " THE CREATOR HAS JOINED! 👑")
	else
		notify(player, "Welcome! Reach the end without touching the lava 🌋", "info")
	end
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(onPlayerAdded, player)
end

Players.PlayerRemoving:Connect(function(player)
	saveData(player)
	sessionData[player] = nil
	lastAction[player] = nil
	winCooldown[player] = nil
	treasureCooldown[player] = nil
end)

game:BindToClose(function()
	for _, player in ipairs(Players:GetPlayers()) do
		saveData(player)
	end
end)

task.spawn(function()
	while true do
		task.wait(120)
		for _, player in ipairs(Players:GetPlayers()) do
			saveData(player)
		end
	end
end)

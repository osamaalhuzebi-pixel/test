--[[
	AMEER'S PRISON ESCAPE
	Parkour prison escape with a different police officer in every section,
	coins, a store (Robux and coins) and secret powers for the owner.

	Where to put it:  ServerScriptService  ->  + Script  (a normal "Script")
	Paste ALL of this file into that Script.
]]

---------------------------------------------------------------------
-- SETTINGS (you can change these)
---------------------------------------------------------------------
local CONFIG = {
	OwnerName = "Ameer",
	OwnerUsernames = { "Pttttttte_3" }, -- Roblox username(s) that get the secret powers and free items
	OwnerUserIds = {},                  -- optional, safer than usernames, e.g. { 123456789 }
	LobbyCoinValue = 1,
	CourseCoinValue = 3,
	WinCoins = 50,
	RespawnDelay = 1.5,
}

-- STORE
-- Robux items: create a Game Pass for each one on create.roblox.com,
-- then paste its ID into GamePassId. While the ID is 0, the item is free
-- inside Studio so you can test it, and not for sale in the real game.
local SHOP = {
	{ Id = "Sword", Name = "Stunner Sword", Emoji = "🗡️", Currency = "Robux", Price = 49, GamePassId = 0, Info = "Slash police to stun them for 3 seconds" },
	{ Id = "Blaster", Name = "Freeze Blaster", Emoji = "🔫", Currency = "Robux", Price = 99, GamePassId = 0, Info = "Shoot ice beams that freeze police" },
	{ Id = "Carpet", Name = "Flying Carpet", Emoji = "🧞", Currency = "Robux", Price = 199, GamePassId = 0, Info = "Fly over the whole prison!" },
	{ Id = "SpeedBoots", Name = "Speed Boots", Emoji = "👟", Currency = "Coins", Price = 100, Info = "Run faster than the police" },
	{ Id = "JumpCoil", Name = "Jump Coil", Emoji = "🌀", Currency = "Coins", Price = 200, Info = "Jump much higher" },
}

-- SECTIONS: each one has its own room, obstacles and police
local SECTIONS = {
	{
		Name = "Cell Block", Theme = "cells", Floor = Color3.fromRGB(150, 150, 160),
		Police = { { Name = "Officer Snooze", Emoji = "😴", Color = Color3.fromRGB(40, 70, 160), Speed = 9, Sight = 30, Scale = 1, ChaseTime = 4, RestTime = 4 } },
	},
	{
		Name = "Cafeteria", Theme = "cafeteria", Floor = Color3.fromRGB(230, 220, 190),
		Police = { { Name = "Officer Donut", Emoji = "🍩", Color = Color3.fromRGB(230, 120, 170), Speed = 12, Sight = 35, Scale = 1.4, ChaseTime = 6, RestTime = 3 } },
	},
	{
		Name = "Laundry Room", Theme = "laundry", Floor = Color3.fromRGB(170, 220, 255),
		Police = { { Name = "Sergeant Speedy", Emoji = "⚡", Color = Color3.fromRGB(250, 200, 0), Speed = 20, Sight = 20, Scale = 0.9, ChaseTime = 3, RestTime = 3 } },
	},
	{
		Name = "Prison Yard", Theme = "yard", Floor = Color3.fromRGB(120, 180, 90),
		Police = {
			{ Name = "Patrol Pete", Emoji = "🚨", Color = Color3.fromRGB(200, 40, 40), Speed = 13, Sight = 28, Scale = 1, ChaseTime = 5, RestTime = 3 },
			{ Name = "Patrol Paula", Emoji = "🚓", Color = Color3.fromRGB(40, 160, 200), Speed = 13, Sight = 28, Scale = 1, ChaseTime = 5, RestTime = 3 },
		},
	},
	{
		Name = "Warden's Tower", Theme = "warden", Floor = Color3.fromRGB(120, 20, 30),
		Police = { { Name = "Chief Warden Max", Emoji = "👮", Color = Color3.fromRGB(20, 20, 30), Speed = 15, Sight = 40, Scale = 2, ChaseTime = 6, RestTime = 2 } },
	},
}

---------------------------------------------------------------------
-- SERVICES
---------------------------------------------------------------------
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local DataStoreService = game:GetService("DataStoreService")
local MarketplaceService = game:GetService("MarketplaceService")
local TextService = game:GetService("TextService")
local CollectionService = game:GetService("CollectionService")
local Debris = game:GetService("Debris")
local Lighting = game:GetService("Lighting")

Players.CharacterAutoLoads = false

local FONT = Enum.Font.FredokaOne
local GOLD = Color3.fromRGB(255, 205, 40)
local LASER_RED = Color3.fromRGB(255, 30, 30)
local WATER_BLUE = Color3.fromRGB(0, 170, 255)
local CONCRETE = Color3.fromRGB(110, 110, 120)
local NUM_SECTIONS = #SECTIONS
local FLOOR_Y = 2

local SHOP_BY_ID = {}
for index, item in ipairs(SHOP) do
	item.Order = index
	SHOP_BY_ID[item.Id] = item
end

---------------------------------------------------------------------
-- REMOTES
---------------------------------------------------------------------
local oldRemotes = ReplicatedStorage:FindFirstChild("PrisonRemotes")
if oldRemotes then
	oldRemotes:Destroy()
end
local remotes = Instance.new("Folder")
remotes.Name = "PrisonRemotes"
remotes:SetAttribute("OwnerName", CONFIG.OwnerName)
local sectionNames = {}
for _, section in ipairs(SECTIONS) do
	table.insert(sectionNames, section.Name)
end
remotes:SetAttribute("SectionNames", table.concat(sectionNames, "|"))
remotes.Parent = ReplicatedStorage

local function newRemote(name)
	local remote = Instance.new("RemoteEvent")
	remote.Name = name
	remote.Parent = remotes
	return remote
end

local NotifyEvent = newRemote("Notify")
local AnnounceEvent = newRemote("Announce")
local BuyEvent = newRemote("Buy")
local BlastEvent = newRemote("Blast")
local OwnerActionEvent = newRemote("OwnerAction")

-- Store items for the player's screen
local shopFolder = Instance.new("Folder")
shopFolder.Name = "ShopItems"
for _, item in ipairs(SHOP) do
	local config = Instance.new("Configuration")
	config.Name = item.Id
	for _, key in ipairs({ "Id", "Name", "Emoji", "Currency", "Price", "Info", "Order" }) do
		config:SetAttribute(key, item[key])
	end
	config.Parent = shopFolder
end
shopFolder.Parent = remotes

local function notify(player, text, kind)
	NotifyEvent:FireClient(player, text, kind or "info")
end

local function announce(text)
	AnnounceEvent:FireAllClients(text)
end

---------------------------------------------------------------------
-- OWNER CHECK
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
local oldMap = workspace:FindFirstChild("PrisonMap")
if oldMap then
	oldMap:Destroy()
end
local map = Instance.new("Folder")
map.Name = "PrisonMap"
map.Parent = workspace

-- The course goes forward in the -Z direction. "d" is the distance from the lobby.
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

local function platform(x, yTop, dNear, sizeX, sizeD, color, material)
	return part({
		Size = Vector3.new(sizeX, 1, sizeD),
		Position = at(x, yTop - 0.5, dNear + sizeD / 2),
		Color = color or Color3.fromRGB(230, 230, 230),
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

local function surfaceText(target, face, text, textColor)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.LightInfluence = 0
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = textColor or Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0
	label.TextScaled = true
	label.Font = FONT
	label.Parent = gui
	gui.Parent = target
	return label
end

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

---------------------------------------------------------------------
-- DANGER (only hurts players, and never the owner in God Mode)
---------------------------------------------------------------------
local function killFromHit(hit)
	local character = hit.Parent
	local player = character and Players:GetPlayerFromCharacter(character)
	if not player or player:GetAttribute("GodMode") then
		return
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.Health > 0 then
		humanoid.Health = 0
	end
end

local function makeKill(p)
	p.Touched:Connect(killFromHit)
end

local spinners = {}
local decorSpinners = {}
local laserGates = {}

local function spinner(dCenter, length, speed)
	local center = at(0, FLOOR_Y + 1.5, dCenter)
	local bar = part({
		Name = "SpinBar",
		Size = Vector3.new(length, 1, 1),
		Position = center,
		Color = LASER_RED,
		Material = Enum.Material.Neon,
		CanCollide = false,
	})
	makeKill(bar)
	part({ Name = "SpinHub", Shape = Enum.PartType.Cylinder, Size = Vector3.new(2, 2.5, 2.5), CFrame = CFrame.new(center - Vector3.new(0, 1, 0)) * CFrame.Angles(0, 0, math.rad(90)), Color = Color3.fromRGB(50, 50, 50), CanCollide = false })
	table.insert(spinners, { part = bar, cframe = CFrame.new(center), speed = speed, angle = 0 })
end

local function laserGate(dPos, period, offset)
	local beams = {}
	for _, height in ipairs({ 0.8, 2.6, 4.4 }) do
		local beam = part({
			Name = "Laser",
			Size = Vector3.new(39, 0.3, 0.3),
			Position = at(0, FLOOR_Y + height, dPos),
			Color = LASER_RED,
			Material = Enum.Material.Neon,
			CanCollide = false,
		})
		beam.Touched:Connect(function(hit)
			if beam:GetAttribute("On") then
				killFromHit(hit)
			end
		end)
		table.insert(beams, beam)
	end
	for _, x in ipairs({ -19, 19 }) do
		part({ Name = "LaserPost", Size = Vector3.new(1, 6, 1), Position = at(x, FLOOR_Y + 3, dPos), Color = Color3.fromRGB(40, 40, 40) })
	end
	table.insert(laserGates, { beams = beams, period = period, offset = offset })
end

local function slidingWall(dPos, duration)
	local wall = part({
		Name = "LaserWall",
		Size = Vector3.new(6, 6, 1.5),
		Position = at(-15, FLOOR_Y + 3, dPos),
		Color = LASER_RED,
		Material = Enum.Material.Neon,
		Transparency = 0.2,
		CanCollide = false,
	})
	makeKill(wall)
	local info = TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
	TweenService:Create(wall, info, { Position = at(15, FLOOR_Y + 3, dPos) }):Play()
end

local function slime(x, dPos)
	local puddle = part({
		Name = "Slime",
		Size = Vector3.new(6, 0.2, 6),
		Position = at(x, FLOOR_Y + 0.1, dPos),
		Color = Color3.fromRGB(80, 255, 60),
		Material = Enum.Material.Neon,
		CanCollide = false,
	})
	makeKill(puddle)
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
		notify(player, "+" .. value .. " 🪙", "coin")
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

for gx = -4, 4 do
	for gz = -3, 3 do
		part({
			Name = "YardTile",
			Size = Vector3.new(10, 1, 10),
			Position = Vector3.new(gx * 10, -0.45, gz * 10),
			Color = ((gx + gz) % 2 == 0) and Color3.fromRGB(200, 200, 205) or Color3.fromRGB(170, 170, 180),
			Material = Enum.Material.Concrete,
		})
	end
end

-- Lobby fence with prison bars
for x = -44, 44, 4 do
	for _, z in ipairs({ 35, -35 }) do
		if z == 35 or math.abs(x) > 8 then
			part({ Name = "Bar", Size = Vector3.new(0.6, 10, 0.6), Position = Vector3.new(x, 5, z), Color = Color3.fromRGB(60, 60, 60), Material = Enum.Material.Metal })
		end
	end
end
for z = -32, 32, 4 do
	for _, x in ipairs({ -45, 45 }) do
		part({ Name = "Bar", Size = Vector3.new(0.6, 10, 0.6), Position = Vector3.new(x, 5, z), Color = Color3.fromRGB(60, 60, 60), Material = Enum.Material.Metal })
	end
end

-- Start block and gate
part({ Name = "StartBlock", Size = Vector3.new(14, FLOOR_Y, 10), Position = at(0, FLOOR_Y / 2, 43), Color = Color3.fromRGB(255, 140, 0) })
for _, x in ipairs({ -9, 9 }) do
	part({ Name = "GatePillar", Size = Vector3.new(3, 20, 3), Position = at(x, 10, 40), Color = CONCRETE, Material = Enum.Material.Concrete })
end
local gateSign = part({ Name = "GateSign", Size = Vector3.new(26, 6, 2), Position = at(0, 23, 40), Color = Color3.fromRGB(30, 30, 40) })
surfaceText(gateSign, Enum.NormalId.Back, "🚔 " .. string.upper(CONFIG.OwnerName) .. "'S PRISON ESCAPE 🚔", GOLD)

billboard(signAnchor(Vector3.new(0, 9, 14)), "Escape all " .. NUM_SECTIONS .. " sections!\nDon't get caught by the police 🚔", Color3.new(1, 1, 1), 0, 16, 4)
billboard(signAnchor(Vector3.new(-30, 8, 0)), "🛒 Press the STORE button\nfor swords, blasters & a flying carpet!", Color3.fromRGB(255, 230, 120), 0, 16, 4)

for n = 1, 12 do
	local angle = (n / 12) * math.pi * 2
	makeCoin(Vector3.new(math.cos(angle) * 18, 3, math.sin(angle) * 18), CONFIG.LobbyCoinValue, 15)
end

---------------------------------------------------------------------
-- PARKOUR BETWEEN ROOMS (over electric water)
---------------------------------------------------------------------
local function buildParkour(d, s)
	local styles = {
		{ count = 5, size = 5, gap = 4, heights = { 0, 1, 2, 1, 0 }, xs = { -3, 3, -3, 3, -3 } },
		{ count = 6, size = 4, gap = 4.5, heights = { 0, 1, 2, 3, 2, 0 }, xs = { 0, 4, 0, -4, 0, 0 } },
		{ count = 5, size = 5, gap = 4, heights = { 0, 0, 0, 0, 0 }, xs = { -2, 2, -2, 2, 0 }, vanish = true },
		{ count = 6, size = 3, gap = 4.5, heights = { 0, 1, 2, 2, 1, 0 }, xs = { -3, 0, 3, 0, -3, 0 } },
		{ count = 6, size = 3, gap = 5, heights = { 0, 1, 2, 3, 2, 1 }, xs = { 3, -3, 3, -3, 3, 0 } },
		{ count = 6, size = 5, gap = 4, heights = { 1, 2, 3, 4, 5, 6 }, xs = { 0, 3, 0, -3, 0, 0 } },
	}
	local style = styles[math.min(s, #styles)]
	local hue = (s * 0.17) % 1
	for k = 1, style.count do
		local near = d + style.gap + (k - 1) * (style.size + style.gap)
		local yTop = FLOOR_Y + style.heights[k]
		local block = platform(style.xs[k], yTop, near, style.size, style.size, Color3.fromHSV(hue, 0.6, 1), style.vanish and Enum.Material.Glass or Enum.Material.SmoothPlastic)
		if style.vanish then
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
		if k % 2 == 0 then
			makeCoin(at(style.xs[k], yTop + 3, near + style.size / 2), CONFIG.CourseCoinValue, 30)
		end
	end
	local lastTop = FLOOR_Y + style.heights[style.count]
	return d + style.count * (style.size + style.gap), lastTop
end

---------------------------------------------------------------------
-- ROOMS
---------------------------------------------------------------------
local ROOM_LENGTH = 60
local WALL_HEIGHT = 14

local function endWall(dPos, signText)
	for _, x in ipairs({ -12.5, 12.5 }) do
		part({ Name = "Wall", Size = Vector3.new(15, WALL_HEIGHT, 1), Position = at(x, FLOOR_Y + WALL_HEIGHT / 2, dPos), Color = CONCRETE, Material = Enum.Material.Concrete })
	end
	part({ Name = "Wall", Size = Vector3.new(10, 6, 1), Position = at(0, FLOOR_Y + 11, dPos), Color = CONCRETE, Material = Enum.Material.Concrete })
	if signText then
		local sign = part({ Name = "RoomSign", Size = Vector3.new(30, 5, 1), Position = at(0, FLOOR_Y + WALL_HEIGHT + 2.5, dPos), Color = Color3.fromRGB(30, 30, 40) })
		surfaceText(sign, Enum.NormalId.Back, signText, GOLD)
	end
end

local THEMES = {}

function THEMES.cells(near)
	for _, x in ipairs({ -17, 17 }) do
		for k = 0, 4 do
			local dd = near + 8 + k * 10
			for b = -2, 2 do
				part({ Name = "CellBar", Size = Vector3.new(0.4, 8, 0.4), Position = at(x + (x > 0 and -2.5 or 2.5), FLOOR_Y + 4, dd + b * 1.6), Color = Color3.fromRGB(60, 60, 60), Material = Enum.Material.Metal, CanCollide = false })
			end
		end
	end
	laserGate(near + 18, 1.6, 0)
	laserGate(near + 32, 1.6, 0.8)
	laserGate(near + 46, 1.4, 0.4)
end

function THEMES.cafeteria(near)
	for k = 0, 3 do
		local x = (k % 2 == 0) and 5.5 or -5.5
		part({ Name = "Table", Size = Vector3.new(28, 3, 4), Position = at(x, FLOOR_Y + 1.5, near + 14 + k * 11), Color = Color3.fromRGB(160, 110, 60), Material = Enum.Material.Wood })
	end
	slime(-12, near + 20)
	slime(12, near + 31)
	slime(-12, near + 42)
end

function THEMES.laundry(near)
	for _, x in ipairs({ -17, 17 }) do
		for k = 0, 4 do
			local washer = part({ Name = "Washer", Size = Vector3.new(4, 5, 4), Position = at(x, FLOOR_Y + 2.5, near + 8 + k * 10), Color = Color3.new(1, 1, 1) })
			surfaceText(washer, x > 0 and Enum.NormalId.Left or Enum.NormalId.Right, "🫧", Color3.fromRGB(0, 150, 255))
		end
	end
	spinner(near + 20, 30, 1.8)
	spinner(near + 42, 30, -2.2)
end

function THEMES.yard(near)
	part({ Name = "HoopPole", Size = Vector3.new(1, 12, 1), Position = at(16, FLOOR_Y + 6, near + 30), Color = Color3.fromRGB(60, 60, 60) })
	part({ Name = "Backboard", Size = Vector3.new(1, 4, 6), Position = at(15.5, FLOOR_Y + 11, near + 30), Color = Color3.new(1, 1, 1) })
	slidingWall(near + 16, 1.6)
	slidingWall(near + 28, 1.3)
	slidingWall(near + 40, 1.1)
	slidingWall(near + 50, 1.5)
end

function THEMES.warden(near)
	part({ Name = "RedCarpet", Size = Vector3.new(8, 0.1, ROOM_LENGTH - 4), Position = at(0, FLOOR_Y + 0.05, near + ROOM_LENGTH / 2), Color = Color3.fromRGB(200, 30, 40), Material = Enum.Material.Fabric, CanCollide = false })
	part({ Name = "WardenDesk", Size = Vector3.new(10, 4, 3), Position = at(-12, FLOOR_Y + 2, near + 52), Color = Color3.fromRGB(90, 50, 20), Material = Enum.Material.Wood })
	laserGate(near + 16, 1.2, 0)
	spinner(near + 30, 34, 2.4)
	laserGate(near + 45, 1.1, 0.5)
end

---------------------------------------------------------------------
-- POLICE
---------------------------------------------------------------------
local police = {}
local SKIN = Color3.fromRGB(234, 184, 146)
local WALK_ANIMATION = "rbxassetid://507777826"

local function weldTo(target, piece)
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = target
	weld.Part1 = piece
	weld.Parent = piece
end

local function buildBlockyCop(info)
	local model = Instance.new("Model")
	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = Vector3.new(2, 2, 1)
	root.Transparency = 1
	root.Parent = model
	local torso = Instance.new("Part")
	torso.Name = "Torso"
	torso.Size = Vector3.new(2, 2, 1)
	torso.Color = info.Color
	torso.CFrame = root.CFrame
	torso.Massless = true
	torso.Parent = model
	weldTo(root, torso)
	local head = Instance.new("Part")
	head.Name = "Head"
	head.Size = Vector3.new(1.2, 1.2, 1.2)
	head.Color = SKIN
	head.CFrame = root.CFrame * CFrame.new(0, 1.6, 0)
	head.Massless = true
	head.Parent = model
	weldTo(root, head)
	for _, x in ipairs({ -0.5, 0.5 }) do
		local leg = Instance.new("Part")
		leg.Name = "Leg"
		leg.Size = Vector3.new(1, 2, 1)
		leg.Color = Color3.fromRGB(25, 25, 50)
		leg.CFrame = root.CFrame * CFrame.new(x, -2, 0)
		leg.Massless = true
		leg.CanCollide = false
		leg.Parent = model
		weldTo(root, leg)
	end
	local humanoid = Instance.new("Humanoid")
	humanoid.RigType = Enum.HumanoidRigType.R15
	humanoid.HipHeight = 2
	humanoid.Parent = model
	model.PrimaryPart = root
	return model
end

local function buildCopModel(info)
	local description = Instance.new("HumanoidDescription")
	description.HeadColor = SKIN
	description.TorsoColor = info.Color
	description.LeftArmColor = info.Color
	description.RightArmColor = info.Color
	description.LeftLegColor = Color3.fromRGB(25, 25, 50)
	description.RightLegColor = Color3.fromRGB(25, 25, 50)
	local ok, model = pcall(function()
		return Players:CreateHumanoidModelFromDescription(description, Enum.HumanoidRigType.R15)
	end)
	if ok and model then
		return model, true
	end
	return buildBlockyCop(info), false
end

local function addPoliceHat(model, head)
	local hat = Instance.new("Part")
	hat.Name = "PoliceHat"
	hat.Shape = Enum.PartType.Cylinder
	hat.Size = Vector3.new(head.Size.Y * 0.45, head.Size.X * 1.15, head.Size.X * 1.15)
	hat.CFrame = head.CFrame * CFrame.new(0, head.Size.Y * 0.6, 0) * CFrame.Angles(0, 0, math.rad(90))
	hat.Color = Color3.fromRGB(20, 20, 50)
	hat.Massless = true
	hat.CanCollide = false
	hat.Parent = model
	weldTo(head, hat)
	local badge = Instance.new("Part")
	badge.Name = "Badge"
	badge.Size = Vector3.new(head.Size.X * 0.3, head.Size.Y * 0.25, 0.1)
	badge.CFrame = head.CFrame * CFrame.new(0, head.Size.Y * 0.62, -head.Size.Z * 0.58)
	badge.Color = GOLD
	badge.Material = Enum.Material.Neon
	badge.Massless = true
	badge.CanCollide = false
	badge.Parent = model
	weldTo(head, badge)
end

local function setCopStatus(cop, status)
	if cop.status ~= status then
		cop.status = status
		cop.label.Text = cop.info.Emoji .. " " .. cop.info.Name .. (status ~= "" and ("\n" .. status) or "")
	end
end

local function spawnCop(info, sectionIndex, home, bounds)
	local model, isRig = buildCopModel(info)
	model.Name = info.Name
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	local root = model:FindFirstChild("HumanoidRootPart")
	local head = model:FindFirstChild("Head")
	if not humanoid or not root or not head then
		model:Destroy()
		return
	end
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	humanoid.BreakJointsOnDeath = false
	humanoid.MaxHealth = math.huge
	humanoid.Health = math.huge
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("LuaSourceContainer") then
			item:Destroy()
		end
	end
	addPoliceHat(model, head)
	model:PivotTo(CFrame.new(home))
	model.Parent = map
	if info.Scale ~= 1 then
		model:ScaleTo(info.Scale)
	end
	CollectionService:AddTag(model, "Police")
	pcall(function()
		root:SetNetworkOwner(nil)
	end)

	local _, label = billboard(head, "", Color3.new(1, 1, 1), 2.5, 9, 2.5)
	local cop = {
		model = model,
		humanoid = humanoid,
		root = root,
		info = info,
		section = sectionIndex,
		home = home,
		bounds = bounds,
		label = label,
		stunnedUntil = 0,
		restUntil = 0,
		chaseStart = nil,
		waypoint = nil,
		status = nil,
	}
	setCopStatus(cop, "")

	if isRig then
		local animator = humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
		animator.Parent = humanoid
		local animation = Instance.new("Animation")
		animation.AnimationId = WALK_ANIMATION
		local ok, track = pcall(function()
			return animator:LoadAnimation(animation)
		end)
		if ok and track then
			humanoid.Running:Connect(function(speed)
				if speed > 0.5 then
					if not track.IsPlaying then
						track:Play()
					end
				elseif track.IsPlaying then
					track:Stop()
				end
			end)
		end
	end

	table.insert(police, cop)
end

local function stunCop(cop, seconds, status)
	cop.stunnedUntil = os.clock() + seconds
	cop.chaseStart = nil
	cop.humanoid:MoveTo(cop.root.Position)
	setCopStatus(cop, status or "🥶 FROZEN!")
	local highlight = cop.model:FindFirstChild("FreezeGlow") or Instance.new("Highlight")
	highlight.Name = "FreezeGlow"
	highlight.FillColor = Color3.fromRGB(120, 220, 255)
	highlight.FillTransparency = 0.4
	highlight.Parent = cop.model
	task.delay(seconds, function()
		if os.clock() >= cop.stunnedUntil - 0.05 and highlight.Parent then
			highlight:Destroy()
		end
	end)
end

---------------------------------------------------------------------
-- BUILD THE COURSE
---------------------------------------------------------------------
local checkpoints = {}
local sectionBounds = {}
local d = 48

for s, section in ipairs(SECTIONS) do
	d = buildParkour(d, s)

	-- Checkpoint (safe zone in front of the room)
	local cpNear = d + 4
	local checkpoint = platform(0, FLOOR_Y, cpNear, 16, 10, Color3.fromRGB(60, 220, 120), Enum.Material.Neon)
	checkpoint.Name = "Checkpoint" .. s
	surfaceText(checkpoint, Enum.NormalId.Top, "SAFE ✅ " .. s, Color3.new(1, 1, 1))
	local sectionNumber = s
	checkpoint.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		local leaderstats = player and player:FindFirstChild("leaderstats")
		if leaderstats and leaderstats.Stage.Value < sectionNumber then
			leaderstats.Stage.Value = sectionNumber
			notify(player, "✅ Section " .. sectionNumber .. ": " .. section.Name, "good")
		end
	end)
	checkpoints[s] = checkpoint

	-- Room
	local near = cpNear + 10
	local far = near + ROOM_LENGTH
	part({ Name = "RoomFloor", Size = Vector3.new(40, FLOOR_Y, ROOM_LENGTH), Position = at(0, FLOOR_Y / 2, near + ROOM_LENGTH / 2), Color = section.Floor, Material = Enum.Material.Concrete })
	for _, x in ipairs({ -20.5, 20.5 }) do
		part({ Name = "Wall", Size = Vector3.new(1, WALL_HEIGHT, ROOM_LENGTH), Position = at(x, FLOOR_Y + WALL_HEIGHT / 2, near + ROOM_LENGTH / 2), Color = CONCRETE, Material = Enum.Material.Concrete })
	end
	endWall(near, "SECTION " .. s .. ": " .. string.upper(section.Name))
	endWall(far, nil)
	THEMES[section.Theme](near)

	for k = 1, 4 do
		makeCoin(at(math.random(-15, 15), FLOOR_Y + 3, near + 8 + k * 11), CONFIG.CourseCoinValue, 30)
	end

	-- Police live inside the room and only chase players inside it
	local bounds = { minX = -17, maxX = 17, minZ = -(far - 3), maxZ = -(near + 3) }
	sectionBounds[s] = bounds
	for index, info in ipairs(section.Police) do
		local offsetX = (#section.Police > 1) and ((index == 1) and -8 or 8) or 0
		task.spawn(spawnCop, info, s, at(offsetX, FLOOR_Y + 4, near + ROOM_LENGTH / 2), bounds)
	end

	d = far
end

-- Final climb to the escape helicopter
local lastTop
d, lastTop = buildParkour(d, NUM_SECTIONS + 1)
local heliNear = d + 4
local heliTop = lastTop
platform(0, heliTop, heliNear, 30, 30, Color3.fromRGB(70, 70, 80), Enum.Material.Metal)
local helipad = part({ Name = "HelipadMark", Size = Vector3.new(14, 0.1, 14), Position = at(0, heliTop + 0.05, heliNear + 15), Color = Color3.fromRGB(240, 200, 0), CanCollide = false })
surfaceText(helipad, Enum.NormalId.Top, "H", Color3.fromRGB(30, 30, 30))
part({ Name = "HeliBody", Size = Vector3.new(10, 6, 14), Position = at(9, heliTop + 3, heliNear + 22), Color = Color3.fromRGB(40, 110, 60) })
part({ Name = "HeliTail", Size = Vector3.new(2, 2, 12), Position = at(9, heliTop + 4, heliNear + 34), Color = Color3.fromRGB(40, 110, 60) })
local rotorCenter = at(9, heliTop + 7, heliNear + 22)
local rotor = part({ Name = "HeliRotor", Size = Vector3.new(30, 0.4, 1.5), Position = rotorCenter, Color = Color3.fromRGB(30, 30, 30), CanCollide = false })
table.insert(decorSpinners, { part = rotor, cframe = CFrame.new(rotorCenter), speed = 12, angle = 0 })

local winPad = part({
	Name = "WinPad",
	Size = Vector3.new(10, 1, 10),
	Position = at(-6, heliTop + 0.1, heliNear + 12),
	Color = Color3.fromRGB(255, 240, 120),
	Material = Enum.Material.Neon,
})
billboard(winPad, "🚁 TOUCH TO ESCAPE! 🚁", GOLD, 6, 14, 3)
local END_CFRAME = CFrame.new(at(0, heliTop + 4, heliNear + 3))

-- Electric water under the whole prison
local waterLength = heliNear + 40 - 50
local water = part({
	Name = "ElectricWater",
	Size = Vector3.new(400, 1, waterLength),
	Position = at(0, 0, 50 + waterLength / 2),
	Color = WATER_BLUE,
	Material = Enum.Material.Neon,
	Transparency = 0.3,
})
makeKill(water)

-- Moving parts
RunService.Heartbeat:Connect(function(dt)
	for _, list in ipairs({ spinners, decorSpinners }) do
		for _, spin in ipairs(list) do
			spin.angle += spin.speed * dt
			spin.part.CFrame = spin.cframe * CFrame.Angles(0, spin.angle, 0)
		end
	end
	local now = os.clock()
	for _, gate in ipairs(laserGates) do
		local on = math.floor((now + gate.offset) / gate.period) % 2 == 0
		if on ~= gate.on then
			gate.on = on
			for _, beam in ipairs(gate.beams) do
				beam:SetAttribute("On", on)
				beam.Transparency = on and 0 or 0.85
				if on then
					for _, hit in ipairs(workspace:GetPartsInPart(beam)) do
						killFromHit(hit)
					end
				end
			end
		end
	end
end)

---------------------------------------------------------------------
-- POLICE BRAIN
---------------------------------------------------------------------
local function insideBounds(position, bounds)
	return position.X >= bounds.minX and position.X <= bounds.maxX
		and position.Z >= bounds.minZ and position.Z <= bounds.maxZ
		and position.Y < FLOOR_Y + 10
end

local function clampToBounds(position, bounds)
	return Vector3.new(
		math.clamp(position.X, bounds.minX, bounds.maxX),
		position.Y,
		math.clamp(position.Z, bounds.minZ, bounds.maxZ)
	)
end

local caughtCooldown = {}

local function catchPlayer(cop, player)
	if caughtCooldown[player] then
		return
	end
	caughtCooldown[player] = true
	task.delay(2, function()
		caughtCooldown[player] = nil
	end)
	local checkpoint = checkpoints[cop.section]
	if checkpoint then
		teleport(player, checkpoint.CFrame + Vector3.new(0, 4, 0))
	end
	notify(player, "🚔 " .. cop.info.Name .. " caught you! Try again!", "bad")
	cop.chaseStart = nil
	cop.restUntil = os.clock() + 1.5
	setCopStatus(cop, "😎 GOTCHA!")
end

local function findTarget(cop)
	local best, bestDistance = nil, cop.info.Sight
	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if root and humanoid and humanoid.Health > 0 and not player:GetAttribute("GodMode") and insideBounds(root.Position, cop.bounds) then
			local distance = (root.Position - cop.root.Position).Magnitude
			if distance < bestDistance then
				best, bestDistance = player, distance
			end
		end
	end
	return best, bestDistance
end

task.spawn(function()
	while true do
		task.wait(0.2)
		local now = os.clock()
		for _, cop in ipairs(police) do
			if not cop.model.Parent then
				continue
			end
			local humanoid, info = cop.humanoid, cop.info

			if now < cop.stunnedUntil then
				humanoid:MoveTo(cop.root.Position)
				continue
			end

			if not insideBounds(cop.root.Position, cop.bounds) then
				humanoid.WalkSpeed = info.Speed
				humanoid:MoveTo(cop.home)
				continue
			end

			local target, distance = findTarget(cop)
			if now < cop.restUntil then
				humanoid:MoveTo(cop.root.Position)
				if cop.status ~= "😎 GOTCHA!" then
					setCopStatus(cop, info.Name == "Officer Snooze" and "💤 Zzz..." or "😮‍💨 tired...")
				end
			elseif target then
				cop.chaseStart = cop.chaseStart or now
				if now - cop.chaseStart > info.ChaseTime then
					cop.chaseStart = nil
					cop.restUntil = now + info.RestTime
				else
					setCopStatus(cop, "❗ STOP RIGHT THERE!")
					humanoid.WalkSpeed = info.Speed
					local targetRoot = target.Character.HumanoidRootPart
					humanoid:MoveTo(clampToBounds(targetRoot.Position, cop.bounds))
					if distance < 4 * info.Scale then
						catchPlayer(cop, target)
					end
				end
			else
				cop.chaseStart = nil
				setCopStatus(cop, "")
				humanoid.WalkSpeed = info.Speed * 0.5
				if not cop.waypoint or (cop.root.Position - cop.waypoint).Magnitude < 4 then
					local b = cop.bounds
					cop.waypoint = Vector3.new(
						b.minX + math.random() * (b.maxX - b.minX),
						cop.home.Y,
						b.minZ + math.random() * (b.maxZ - b.minZ)
					)
				end
				humanoid:MoveTo(cop.waypoint)
			end
		end
	end
end)

---------------------------------------------------------------------
-- AMEER STATUE
---------------------------------------------------------------------
local pedestal = part({
	Name = "StatuePedestal",
	Size = Vector3.new(10, 4, 10),
	Position = Vector3.new(30, 2, 0),
	Color = GOLD,
	Material = Enum.Material.Marble,
})
billboard(pedestal, "👑 " .. string.upper(CONFIG.OwnerName) .. " 👑\nTHE PRISON BOSS", GOLD, 17, 12, 4)

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
	model:PivotTo(model:GetPivot() + Vector3.new(0, top - (boxCFrame.Position.Y - boxSize.Y / 2), 0))
end)

---------------------------------------------------------------------
-- SAVING
---------------------------------------------------------------------
local dataStore
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore("AmeerPrisonEscape_v1")
	end)
	if ok then
		dataStore = result
	else
		warn("Saving is off. Publish the game and enable Studio Access to API Services.")
	end
end

local sessionData = {}

local function loadData(player)
	local data = { Coins = 0, Wins = 0, Stage = 0, Owned = {} }
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
	local ok, err = pcall(function()
		dataStore:SetAsync("player_" .. player.UserId, {
			Coins = leaderstats.Coins.Value,
			Wins = leaderstats.Wins.Value,
			Stage = leaderstats.Stage.Value,
			Owned = data.Owned,
		})
	end)
	if not ok then
		warn("Could not save data:", err)
	end
end

---------------------------------------------------------------------
-- TOOLS (sword, blaster, flying carpet)
---------------------------------------------------------------------
local function policeNear(position, radius)
	local found = {}
	for _, cop in ipairs(police) do
		if cop.model.Parent and (cop.root.Position - position).Magnitude <= radius * math.max(1, cop.info.Scale) then
			table.insert(found, cop)
		end
	end
	return found
end

local function makeSword()
	local tool = Instance.new("Tool")
	tool.Name = "Stunner Sword"
	tool.CanBeDropped = false
	tool.GripPos = Vector3.new(0, 0, -1.5)
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.4, 0.8, 4.5)
	handle.Color = Color3.fromRGB(120, 220, 255)
	handle.Material = Enum.Material.Neon
	handle.CanCollide = false
	handle.Parent = tool
	local guard = Instance.new("Part")
	guard.Name = "Guard"
	guard.Size = Vector3.new(1.6, 0.3, 0.3)
	guard.Color = GOLD
	guard.CanCollide = false
	guard.Massless = true
	guard.CFrame = handle.CFrame * CFrame.new(0, 0, 1)
	guard.Parent = tool
	weldTo(handle, guard)

	local ready = true
	tool.Activated:Connect(function()
		local character = tool.Parent
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if not ready or not root then
			return
		end
		ready = false
		local slash = Instance.new("StringValue")
		slash.Name = "toolanim"
		slash.Value = "Slash"
		slash.Parent = tool
		for _, cop in ipairs(policeNear(root.Position, 9)) do
			stunCop(cop, 3, "😵 STUNNED!")
		end
		task.wait(0.5)
		ready = true
	end)
	return tool
end

local function makeBlaster()
	local tool = Instance.new("Tool")
	tool.Name = "Freeze Blaster"
	tool.CanBeDropped = false
	tool.GripPos = Vector3.new(0, -0.3, 0.6)
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.5, 1.2, 1.6)
	handle.Color = Color3.fromRGB(60, 60, 200)
	handle.CanCollide = false
	handle.Parent = tool
	local barrel = Instance.new("Part")
	barrel.Name = "Barrel"
	barrel.Size = Vector3.new(0.4, 0.4, 1.6)
	barrel.Color = Color3.fromRGB(120, 220, 255)
	barrel.Material = Enum.Material.Neon
	barrel.CanCollide = false
	barrel.Massless = true
	barrel.CFrame = handle.CFrame * CFrame.new(0, 0.4, -1.4)
	barrel.Parent = tool
	weldTo(handle, barrel)
	return tool
end

local function makeCarpet()
	local tool = Instance.new("Tool")
	tool.Name = "Flying Carpet"
	tool.CanBeDropped = false
	tool.RequiresHandle = false
	tool.TextureId = ""

	tool.Equipped:Connect(function()
		local character = tool.Parent
		local root = character and character:FindFirstChild("HumanoidRootPart")
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if not root or not humanoid then
			return
		end
		local old = character:FindFirstChild("CarpetRide")
		if old then
			old:Destroy()
		end
		local below = humanoid.HipHeight + root.Size.Y / 2 + 0.2
		local carpet = Instance.new("Part")
		carpet.Name = "CarpetRide"
		carpet.Size = Vector3.new(5, 0.3, 7)
		carpet.Color = Color3.fromRGB(170, 20, 60)
		carpet.Material = Enum.Material.Fabric
		carpet.CanCollide = false
		carpet.Massless = true
		carpet.CFrame = root.CFrame * CFrame.new(0, -below, 0)
		carpet.Parent = character
		weldTo(root, carpet)
		local trim = Instance.new("Part")
		trim.Name = "CarpetTrim"
		trim.Size = Vector3.new(5.4, 0.2, 7.4)
		trim.Color = GOLD
		trim.CanCollide = false
		trim.Massless = true
		trim.CFrame = carpet.CFrame * CFrame.new(0, -0.2, 0)
		trim.Parent = carpet
		weldTo(carpet, trim)
	end)
	tool.Unequipped:Connect(function()
		local player = Players:GetPlayerFromCharacter(tool.Parent) or tool:FindFirstAncestorOfClass("Player")
		local character = player and player.Character
		local carpet = character and character:FindFirstChild("CarpetRide")
		if carpet then
			carpet:Destroy()
		end
	end)
	return tool
end

local TOOL_MAKERS = { Sword = makeSword, Blaster = makeBlaster, Carpet = makeCarpet }

local lastBlast = {}
BlastEvent.OnServerEvent:Connect(function(player, targetPosition)
	if typeof(targetPosition) ~= "Vector3" then
		return
	end
	local character = player.Character
	local tool = character and character:FindFirstChild("Freeze Blaster")
	local handle = tool and tool:FindFirstChild("Handle")
	if not handle then
		return
	end
	local now = os.clock()
	if lastBlast[player] and now - lastBlast[player] < 0.5 then
		return
	end
	lastBlast[player] = now

	local origin = handle.Position
	local direction = targetPosition - origin
	if direction.Magnitude < 0.1 then
		return
	end
	direction = direction.Unit * 150
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { character }
	local result = workspace:Raycast(origin, direction, params)
	local hitPoint = result and result.Position or (origin + direction)

	local length = (hitPoint - origin).Magnitude
	local beam = part({
		Name = "IceBeam",
		Size = Vector3.new(0.3, 0.3, length),
		CFrame = CFrame.lookAt(origin, hitPoint) * CFrame.new(0, 0, -length / 2),
		Color = Color3.fromRGB(150, 230, 255),
		Material = Enum.Material.Neon,
		CanCollide = false,
		CanTouch = false,
		CanQuery = false,
	})
	Debris:AddItem(beam, 0.15)

	-- Freeze any officer close to the beam (a little aim help for kids)
	local unit = (hitPoint - origin).Unit
	for _, cop in ipairs(police) do
		local toCop = cop.root.Position - origin
		local along = math.clamp(toCop:Dot(unit), 0, length)
		local closest = origin + unit * along
		if (cop.root.Position - closest).Magnitude < 3.5 * math.max(1, cop.info.Scale) then
			stunCop(cop, 4, "🥶 FROZEN!")
		end
	end
end)

---------------------------------------------------------------------
-- STORE
---------------------------------------------------------------------
local function ownsItem(player, itemId)
	return player:GetAttribute("Owned_" .. itemId) == true
end

local function applyPassives(player)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		return
	end
	humanoid.UseJumpPower = true
	if player:GetAttribute("SuperSpeed") then
		humanoid.WalkSpeed = 50
		humanoid.JumpPower = 100
		return
	end
	humanoid.WalkSpeed = ownsItem(player, "SpeedBoots") and 22 or 16
	humanoid.JumpPower = ownsItem(player, "JumpCoil") and 70 or 50
end

local function giveTool(player, itemId)
	local maker = TOOL_MAKERS[itemId]
	local backpack = player:FindFirstChildOfClass("Backpack") or player:WaitForChild("Backpack", 5)
	if not maker or not backpack then
		return
	end
	local fresh = maker()
	if backpack:FindFirstChild(fresh.Name) or (player.Character and player.Character:FindFirstChild(fresh.Name)) then
		fresh:Destroy()
		return
	end
	fresh.Parent = backpack
end

local function grantItem(player, itemId)
	local data = sessionData[player]
	if not data then
		return
	end
	data.Owned[itemId] = true
	player:SetAttribute("Owned_" .. itemId, true)
	giveTool(player, itemId)
	applyPassives(player)
end

local priceFetched = false
local function fetchRobuxPrices()
	if priceFetched then
		return
	end
	priceFetched = true
	for _, item in ipairs(SHOP) do
		if item.Currency == "Robux" and item.GamePassId and item.GamePassId > 0 then
			local ok, info = pcall(function()
				return MarketplaceService:GetProductInfo(item.GamePassId, Enum.InfoType.GamePass)
			end)
			if ok and info and info.PriceInRobux then
				shopFolder[item.Id]:SetAttribute("Price", info.PriceInRobux)
			end
		end
	end
end
task.spawn(fetchRobuxPrices)

BuyEvent.OnServerEvent:Connect(function(player, itemId)
	local item = type(itemId) == "string" and SHOP_BY_ID[itemId]
	local leaderstats = player:FindFirstChild("leaderstats")
	if not item or not leaderstats or not sessionData[player] then
		return
	end
	if ownsItem(player, itemId) then
		giveTool(player, itemId)
		notify(player, "✅ You already own the " .. item.Name .. "! Check your backpack.", "info")
		return
	end

	if item.Currency == "Coins" then
		if leaderstats.Coins.Value < item.Price then
			notify(player, "You need " .. (item.Price - leaderstats.Coins.Value) .. " more coins 🪙", "bad")
			return
		end
		leaderstats.Coins.Value -= item.Price
		grantItem(player, itemId)
		notify(player, "🎉 You bought the " .. item.Name .. "!", "good")
	elseif item.GamePassId and item.GamePassId > 0 then
		MarketplaceService:PromptGamePassPurchase(player, item.GamePassId)
	elseif RunService:IsStudio() then
		grantItem(player, itemId)
		notify(player, "🧪 Studio test: free. Add its Game Pass ID to sell it for Robux.", "info")
	else
		notify(player, "This item is coming soon! 🔜", "info")
	end
end)

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
	if not purchased then
		return
	end
	for _, item in ipairs(SHOP) do
		if item.GamePassId == passId then
			grantItem(player, item.Id)
			notify(player, "🎉 Thanks for buying the " .. item.Name .. "!", "good")
			announce("🎉 " .. player.DisplayName .. " got the " .. item.Emoji .. " " .. item.Name .. "!")
		end
	end
end)

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
	announce("🚁 " .. player.DisplayName .. " ESCAPED THE PRISON! 🚁")
	notify(player, "+" .. CONFIG.WinCoins .. " 🪙 for escaping!", "coin")
	task.wait(3)
	teleport(player, LOBBY_CFRAME)
	winCooldown[player] = nil
end)

---------------------------------------------------------------------
-- OWNER LOOK AND SECRET POWERS
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
	local tag = billboard(head, "👑 " .. string.upper(CONFIG.OwnerName) .. " 👑\nTHE PRISON BOSS", GOLD, 3, 8, 3)
	tag.Name = "OwnerTag"
	tag.MaxDistance = 250
	local sparkles = Instance.new("Sparkles")
	sparkles.SparkleColor = GOLD
	sparkles.Parent = root
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
	local leaderstats = player:FindFirstChild("leaderstats")

	if action == "Speed" then
		local on = not player:GetAttribute("SuperSpeed")
		player:SetAttribute("SuperSpeed", on)
		applyPassives(player)
		notify(player, "⚡ Super Speed: " .. (on and "ON" or "OFF"), on and "good" or "info")
	elseif action == "God" then
		local on = not player:GetAttribute("GodMode")
		player:SetAttribute("GodMode", on)
		notify(player, "🛡️ God Mode: " .. (on and "ON (police and lasers can't touch you)" or "OFF"), on and "good" or "info")
	elseif action == "Skip" and leaderstats then
		if leaderstats.Stage.Value < NUM_SECTIONS then
			leaderstats.Stage.Value += 1
			teleport(player, checkpoints[leaderstats.Stage.Value].CFrame + Vector3.new(0, 4, 0))
			notify(player, "⏭️ Skipped to section " .. leaderstats.Stage.Value, "good")
		else
			teleport(player, END_CFRAME)
		end
	elseif action == "FreezePolice" then
		for _, cop in ipairs(police) do
			stunCop(cop, 15, "🥶 FROZEN BY " .. string.upper(CONFIG.OwnerName) .. "!")
		end
		announce("🥶 " .. CONFIG.OwnerName .. " FROZE ALL THE POLICE! RUN! 🏃")
	elseif action == "CoinRain" then
		coinRain()
		announce("💰 " .. CONFIG.OwnerName .. " made it RAIN COINS in the yard! 💰")
	elseif action == "DayNight" then
		local isDay = Lighting.ClockTime > 6 and Lighting.ClockTime < 18
		Lighting.ClockTime = isDay and 0 or 14
		announce(isDay and "🌙 Lights out! " .. CONFIG.OwnerName .. " turned on the NIGHT!" or "☀️ " .. CONFIG.OwnerName .. " brought back the DAY!")
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

	for _, item in ipairs(SHOP) do
		if ownsItem(player, item.Id) then
			giveTool(player, item.Id)
		end
	end
	applyPassives(player)
	if isOwner(player) then
		decorateOwner(character)
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
	sessionData[player] = { Owned = type(data.Owned) == "table" and data.Owned or {} }

	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	for _, stat in ipairs({ { "Stage", math.clamp(data.Stage or 0, 0, NUM_SECTIONS) }, { "Coins", data.Coins or 0 }, { "Wins", data.Wins or 0 } }) do
		local value = Instance.new("IntValue")
		value.Name = stat[1]
		value.Value = stat[2]
		value.Parent = leaderstats
	end
	leaderstats.Parent = player

	-- Work out which store items this player owns
	for _, item in ipairs(SHOP) do
		local owns = owner or sessionData[player].Owned[item.Id] == true
		if not owns and item.Currency == "Robux" and item.GamePassId and item.GamePassId > 0 then
			local ok, result = pcall(function()
				return MarketplaceService:UserOwnsGamePassAsync(player.UserId, item.GamePassId)
			end)
			owns = ok and result
		end
		if owns then
			sessionData[player].Owned[item.Id] = true
			player:SetAttribute("Owned_" .. item.Id, true)
		end
	end

	player:SetAttribute("IsOwner", owner)
	player.CharacterAdded:Connect(function(character)
		onCharacterAdded(player, character)
	end)
	player:LoadCharacter()

	if owner then
		announce("👑 " .. string.upper(CONFIG.OwnerName) .. " THE PRISON BOSS HAS ARRIVED! 👑")
	else
		notify(player, "Welcome! Escape the prison without getting caught 🚔", "info")
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
	lastBlast[player] = nil
	winCooldown[player] = nil
	caughtCooldown[player] = nil
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

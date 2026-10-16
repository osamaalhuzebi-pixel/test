--[[
	AMEER'S PRISON ESCAPE
	Client script: screen UI, STORE button, blaster shooting, flying carpet,
	spinning coins and the owner's secret power panel.

	Where to put it:  StarterPlayer  ->  StarterPlayerScripts  ->  + LocalScript
	Paste ALL of this file into that LocalScript.

	Owner secrets:
	  P  = open / close the secret power panel (or click the 👑 button)
	  F  = fly on / off  (E or Space = up, Q = down)
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CollectionService = game:GetService("CollectionService")
local SoundService = game:GetService("SoundService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("PrisonRemotes")
local NotifyEvent = remotes:WaitForChild("Notify")
local AnnounceEvent = remotes:WaitForChild("Announce")
local BuyEvent = remotes:WaitForChild("Buy")
local BlastEvent = remotes:WaitForChild("Blast")
local OwnerActionEvent = remotes:WaitForChild("OwnerAction")
local shopItems = remotes:WaitForChild("ShopItems")

local OWNER_NAME = remotes:GetAttribute("OwnerName") or "Ameer"
local SECTION_NAMES = string.split(remotes:GetAttribute("SectionNames") or "", "|")
local NUM_SECTIONS = #SECTION_NAMES
local FONT = Enum.Font.FredokaOne
local WHITE = Color3.new(1, 1, 1)
local GOLD = Color3.fromRGB(255, 205, 40)

---------------------------------------------------------------------
-- UI HELPERS
---------------------------------------------------------------------
local function corner(parent, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius or 12)
	c.Parent = parent
end

local function stroke(parent, color, thickness)
	local s = Instance.new("UIStroke")
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.Color = color
	s.Thickness = thickness or 2
	s.Parent = parent
end

local function label(props)
	local l = Instance.new(props.ClassName or "TextLabel")
	l.Font = FONT
	l.TextScaled = true
	l.TextColor3 = WHITE
	l.BorderSizePixel = 0
	for key, value in pairs(props) do
		if key ~= "ClassName" and key ~= "Parent" then
			l[key] = value
		end
	end
	l.Parent = props.Parent
	return l
end

local gui = Instance.new("ScreenGui")
gui.Name = "PrisonUI"
gui.ResetOnSpawn = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = playerGui

---------------------------------------------------------------------
-- TITLE, SECTION AND COINS
---------------------------------------------------------------------
local title = label({
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 6),
	Size = UDim2.new(0, 330, 0, 36),
	BackgroundColor3 = Color3.fromRGB(20, 25, 50),
	BackgroundTransparency = 0.15,
	Text = "🚔 " .. string.upper(OWNER_NAME) .. "'S PRISON ESCAPE 🚔",
	Parent = gui,
})
corner(title)
stroke(title, Color3.fromRGB(80, 140, 255), 2)
local titlePadding = Instance.new("UIPadding")
titlePadding.PaddingLeft = UDim.new(0, 10)
titlePadding.PaddingRight = UDim.new(0, 10)
titlePadding.PaddingTop = UDim.new(0, 4)
titlePadding.PaddingBottom = UDim.new(0, 4)
titlePadding.Parent = title

local sectionLabel = label({
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 46),
	Size = UDim2.new(0, 260, 0, 26),
	BackgroundColor3 = Color3.fromRGB(20, 20, 40),
	BackgroundTransparency = 0.3,
	Text = "Lobby",
	Parent = gui,
})
corner(sectionLabel, 10)

local coinLabel = label({
	AnchorPoint = Vector2.new(0, 0.5),
	Position = UDim2.new(0, 10, 0.3, 0),
	Size = UDim2.new(0, 120, 0, 40),
	BackgroundColor3 = Color3.fromRGB(230, 160, 0),
	Text = "🪙 0",
	Parent = gui,
})
corner(coinLabel, 12)
stroke(coinLabel, WHITE, 2)

task.spawn(function()
	local leaderstats = player:WaitForChild("leaderstats")
	local stage = leaderstats:WaitForChild("Stage")
	local coins = leaderstats:WaitForChild("Coins")
	local function updateSection()
		if stage.Value <= 0 then
			sectionLabel.Text = "🏃 Lobby: go escape!"
		else
			sectionLabel.Text = "Section " .. stage.Value .. "/" .. NUM_SECTIONS .. ": " .. (SECTION_NAMES[stage.Value] or "")
		end
	end
	local function updateCoins()
		coinLabel.Text = "🪙 " .. coins.Value
	end
	stage.Changed:Connect(updateSection)
	coins.Changed:Connect(updateCoins)
	updateSection()
	updateCoins()
end)

---------------------------------------------------------------------
-- SMALL MESSAGES (toasts)
---------------------------------------------------------------------
local toastHolder = Instance.new("Frame")
toastHolder.AnchorPoint = Vector2.new(0.5, 1)
toastHolder.Position = UDim2.new(0.5, 0, 1, -110)
toastHolder.Size = UDim2.new(0, 330, 0, 220)
toastHolder.BackgroundTransparency = 1
toastHolder.Parent = gui
local toastLayout = Instance.new("UIListLayout")
toastLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
toastLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
toastLayout.SortOrder = Enum.SortOrder.LayoutOrder
toastLayout.Padding = UDim.new(0, 6)
toastLayout.Parent = toastHolder

local TOAST_COLORS = {
	good = Color3.fromRGB(40, 170, 80),
	bad = Color3.fromRGB(200, 50, 50),
	coin = Color3.fromRGB(230, 160, 0),
	info = Color3.fromRGB(60, 90, 200),
}

local coinSound = Instance.new("Sound")
coinSound.SoundId = "rbxasset://sounds/electronicpingshort.wav"
coinSound.Volume = 0.5
coinSound.Parent = SoundService

local toastCount = 0
local function showToast(text, kind)
	toastCount += 1
	local toast = label({
		LayoutOrder = toastCount,
		Size = UDim2.new(1, 0, 0, 34),
		BackgroundColor3 = TOAST_COLORS[kind] or TOAST_COLORS.info,
		Text = text,
		Parent = toastHolder,
	})
	corner(toast, 10)

	local toasts = {}
	for _, child in ipairs(toastHolder:GetChildren()) do
		if child:IsA("TextLabel") then
			table.insert(toasts, child)
		end
	end
	if #toasts > 5 then
		table.sort(toasts, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		toasts[1]:Destroy()
	end

	if kind == "coin" then
		coinSound:Play()
	end

	task.delay(2.5, function()
		if toast.Parent then
			local fade = TweenService:Create(toast, TweenInfo.new(0.4), { BackgroundTransparency = 1, TextTransparency = 1 })
			fade:Play()
			fade.Completed:Wait()
			toast:Destroy()
		end
	end)
end

NotifyEvent.OnClientEvent:Connect(showToast)

---------------------------------------------------------------------
-- BIG ANNOUNCEMENTS
---------------------------------------------------------------------
local banner = label({
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.new(0.5, 0, 0.3, 0),
	Size = UDim2.new(0.85, 0, 0, 70),
	BackgroundTransparency = 1,
	TextColor3 = GOLD,
	TextStrokeTransparency = 0,
	Visible = false,
	Text = "",
	Parent = gui,
})
local bannerSize = Instance.new("UITextSizeConstraint")
bannerSize.MaxTextSize = 46
bannerSize.Parent = banner
local bannerScale = Instance.new("UIScale")
bannerScale.Parent = banner

local bannerToken = 0
AnnounceEvent.OnClientEvent:Connect(function(text)
	bannerToken += 1
	local myToken = bannerToken
	banner.Text = text
	banner.Visible = true
	bannerScale.Scale = 0.4
	TweenService:Create(bannerScale, TweenInfo.new(0.4, Enum.EasingStyle.Back), { Scale = 1 }):Play()
	task.delay(4, function()
		if bannerToken == myToken then
			banner.Visible = false
		end
	end)
end)

---------------------------------------------------------------------
-- STORE
---------------------------------------------------------------------
local storeButton = label({
	ClassName = "TextButton",
	AnchorPoint = Vector2.new(0, 0.5),
	Position = UDim2.new(0, 10, 0.3, 50),
	Size = UDim2.new(0, 120, 0, 46),
	BackgroundColor3 = Color3.fromRGB(40, 180, 90),
	Text = "🛒 STORE",
	Parent = gui,
})
corner(storeButton, 12)
stroke(storeButton, WHITE, 2)

local store = Instance.new("Frame")
store.AnchorPoint = Vector2.new(0.5, 0.5)
store.Position = UDim2.fromScale(0.5, 0.52)
store.Size = UDim2.new(0.9, 0, 0.75, 0)
store.BackgroundColor3 = Color3.fromRGB(25, 30, 55)
store.Visible = false
store.Parent = gui
corner(store, 16)
stroke(store, GOLD, 3)
local storeLimit = Instance.new("UISizeConstraint")
storeLimit.MaxSize = Vector2.new(460, 520)
storeLimit.Parent = store

label({
	Position = UDim2.new(0, 14, 0, 10),
	Size = UDim2.new(1, -70, 0, 40),
	BackgroundTransparency = 1,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = GOLD,
	Text = "🛒 PRISON STORE",
	Parent = store,
})

local closeButton = label({
	ClassName = "TextButton",
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -10, 0, 10),
	Size = UDim2.new(0, 40, 0, 40),
	BackgroundColor3 = Color3.fromRGB(200, 50, 50),
	Text = "✖",
	Parent = store,
})
corner(closeButton, 20)

local list = Instance.new("ScrollingFrame")
list.Position = UDim2.new(0, 10, 0, 60)
list.Size = UDim2.new(1, -20, 1, -70)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.ScrollBarThickness = 6
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.new()
list.Parent = store
local listLayout = Instance.new("UIListLayout")
listLayout.SortOrder = Enum.SortOrder.LayoutOrder
listLayout.Padding = UDim.new(0, 8)
listLayout.Parent = list

local function priceText(item)
	if player:GetAttribute("Owned_" .. item.Name) then
		return "✅ OWNED"
	end
	local price = item:GetAttribute("Price") or 0
	if item:GetAttribute("Currency") == "Robux" then
		return "R$ " .. price
	end
	return price .. " 🪙"
end

local function addStoreCard(item)
	local card = Instance.new("Frame")
	card.LayoutOrder = item:GetAttribute("Order") or 0
	card.Size = UDim2.new(1, -8, 0, 84)
	card.BackgroundColor3 = Color3.fromRGB(45, 50, 85)
	card.Parent = list
	corner(card, 12)

	label({
		Position = UDim2.new(0, 8, 0, 8),
		Size = UDim2.new(0, 60, 0, 60),
		BackgroundTransparency = 1,
		Text = item:GetAttribute("Emoji") or "⭐",
		Parent = card,
	})
	label({
		Position = UDim2.new(0, 76, 0, 8),
		Size = UDim2.new(1, -196, 0, 30),
		BackgroundTransparency = 1,
		TextXAlignment = Enum.TextXAlignment.Left,
		Text = item:GetAttribute("Name") or item.Name,
		Parent = card,
	})
	label({
		Position = UDim2.new(0, 76, 0, 40),
		Size = UDim2.new(1, -196, 0, 34),
		BackgroundTransparency = 1,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextColor3 = Color3.fromRGB(190, 200, 255),
		Text = item:GetAttribute("Info") or "",
		Parent = card,
	})

	local isRobux = item:GetAttribute("Currency") == "Robux"
	local buy = label({
		ClassName = "TextButton",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -10, 0.5, 0),
		Size = UDim2.new(0, 104, 0, 46),
		BackgroundColor3 = isRobux and Color3.fromRGB(40, 180, 90) or Color3.fromRGB(230, 160, 0),
		Text = priceText(item),
		Parent = card,
	})
	corner(buy, 10)

	local function refresh()
		buy.Text = priceText(item)
		if player:GetAttribute("Owned_" .. item.Name) then
			buy.BackgroundColor3 = Color3.fromRGB(90, 90, 110)
		end
	end
	player:GetAttributeChangedSignal("Owned_" .. item.Name):Connect(refresh)
	item:GetAttributeChangedSignal("Price"):Connect(refresh)

	buy.Activated:Connect(function()
		BuyEvent:FireServer(item.Name)
	end)
end

for _, item in ipairs(shopItems:GetChildren()) do
	addStoreCard(item)
end

storeButton.Activated:Connect(function()
	store.Visible = not store.Visible
end)
closeButton.Activated:Connect(function()
	store.Visible = false
end)

---------------------------------------------------------------------
-- SPINNING COINS
---------------------------------------------------------------------
local coins = {}
local function addCoin(coin)
	if coin:IsA("BasePart") then
		coins[coin] = coin.CFrame
	end
end
for _, coin in ipairs(CollectionService:GetTagged("Coin")) do
	addCoin(coin)
end
CollectionService:GetInstanceAddedSignal("Coin"):Connect(addCoin)
CollectionService:GetInstanceRemovedSignal("Coin"):Connect(function(coin)
	coins[coin] = nil
end)

RunService.RenderStepped:Connect(function()
	local spin = CFrame.Angles(0, os.clock() * 3, 0)
	for coin, base in pairs(coins) do
		coin.CFrame = base * spin
	end
end)

---------------------------------------------------------------------
-- FLYING (flying carpet for everyone who owns it, F key for the owner)
---------------------------------------------------------------------
local flyVelocity
local flyConnection
local flyReason

local function stopFly()
	flyReason = nil
	if flyConnection then
		flyConnection:Disconnect()
		flyConnection = nil
	end
	if flyVelocity then
		flyVelocity:Destroy()
		flyVelocity = nil
	end
end

local function startFly(reason, speed)
	stopFly()
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not root or not humanoid then
		return
	end
	flyReason = reason
	flyVelocity = Instance.new("BodyVelocity")
	flyVelocity.MaxForce = Vector3.new(1e6, 1e6, 1e6)
	flyVelocity.Velocity = Vector3.zero
	flyVelocity.Parent = root

	flyConnection = RunService.RenderStepped:Connect(function()
		if not root.Parent then
			stopFly()
			return
		end
		local look = workspace.CurrentCamera.CFrame.LookVector
		local move = humanoid.MoveDirection
		local velocity = Vector3.zero
		if move.Magnitude > 0 then
			local flat = Vector3.new(look.X, 0, look.Z)
			local forward = flat.Magnitude > 0 and move:Dot(flat.Unit) or 0
			velocity = move * speed + Vector3.new(0, look.Y * speed * forward, 0)
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.E) or UserInputService:IsKeyDown(Enum.KeyCode.Space) then
			velocity += Vector3.new(0, speed, 0)
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.Q) then
			velocity -= Vector3.new(0, speed, 0)
		end
		flyVelocity.Velocity = velocity
	end)
end

---------------------------------------------------------------------
-- TOOLS: blaster shooting and carpet riding
---------------------------------------------------------------------
local mouse = player:GetMouse()
local hookedTools = setmetatable({}, { __mode = "k" })

local function hookTool(tool)
	if not tool:IsA("Tool") or hookedTools[tool] then
		return
	end
	hookedTools[tool] = true
	if tool.Name == "Freeze Blaster" then
		tool.Activated:Connect(function()
			BlastEvent:FireServer(mouse.Hit.Position)
		end)
	elseif tool.Name == "Flying Carpet" then
		tool.Equipped:Connect(function()
			startFly("carpet", 45)
			showToast("🧞 Carpet ON: look where you want to fly!", "good")
		end)
		tool.Unequipped:Connect(function()
			if flyReason == "carpet" then
				stopFly()
			end
		end)
	end
end

local function watchContainer(container)
	for _, child in ipairs(container:GetChildren()) do
		hookTool(child)
	end
	container.ChildAdded:Connect(hookTool)
end

player.CharacterAdded:Connect(function(character)
	stopFly()
	watchContainer(character)
	watchContainer(player:WaitForChild("Backpack"))
end)
if player.Character then
	watchContainer(player.Character)
end
local existingBackpack = player:FindFirstChildOfClass("Backpack")
if existingBackpack then
	watchContainer(existingBackpack)
end

---------------------------------------------------------------------
-- OWNER SECRET PANEL
---------------------------------------------------------------------
local panel

local function toggleOwnerFly()
	if not player:GetAttribute("IsOwner") then
		return
	end
	if flyReason == "owner" then
		stopFly()
		showToast("✈️ Fly: OFF", "info")
	else
		startFly("owner", 60)
		if flyReason then
			showToast("✈️ Fly: ON  (E = up, Q = down)", "good")
		end
	end
end

local function togglePanel()
	if panel then
		panel.Visible = not panel.Visible
	end
end

local function buildOwnerPanel()
	if panel then
		return
	end

	local crown = label({
		ClassName = "TextButton",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 10, 0.3, 110),
		Size = UDim2.new(0, 56, 0, 56),
		BackgroundColor3 = GOLD,
		Text = "👑",
		Parent = gui,
	})
	corner(crown, 28)
	stroke(crown, WHITE, 2)
	crown.Activated:Connect(togglePanel)

	panel = Instance.new("ScrollingFrame")
	panel.AnchorPoint = Vector2.new(1, 0.5)
	panel.Position = UDim2.new(1, -10, 0.5, 0)
	panel.Size = UDim2.new(0, 250, 0.8, 0)
	panel.BackgroundColor3 = Color3.fromRGB(35, 15, 60)
	panel.BackgroundTransparency = 0.1
	panel.BorderSizePixel = 0
	panel.ScrollBarThickness = 6
	panel.AutomaticCanvasSize = Enum.AutomaticSize.Y
	panel.CanvasSize = UDim2.new()
	panel.Visible = false
	panel.Parent = gui
	corner(panel, 14)
	stroke(panel, GOLD, 3)

	local padding = Instance.new("UIPadding")
	for _, side in ipairs({ "PaddingTop", "PaddingBottom", "PaddingLeft", "PaddingRight" }) do
		padding[side] = UDim.new(0, 8)
	end
	padding.Parent = panel
	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 8)
	layout.Parent = panel

	label({
		LayoutOrder = 1,
		Size = UDim2.new(1, -8, 0, 40),
		BackgroundTransparency = 1,
		TextColor3 = GOLD,
		Text = "👑 " .. string.upper(OWNER_NAME) .. "'S SECRET POWERS",
		Parent = panel,
	})

	local buttons = {
		{ "✈️ Fly", toggleOwnerFly },
		{ "⚡ Speed", "Speed" },
		{ "🛡️ God Mode", "God" },
		{ "⏭️ Skip Section", "Skip" },
		{ "🥶 Freeze Police", "FreezePolice" },
		{ "💰 Coin Rain", "CoinRain" },
		{ "🌙 Day / Night", "DayNight" },
	}

	local grid = Instance.new("Frame")
	grid.LayoutOrder = 2
	grid.BackgroundTransparency = 1
	grid.Size = UDim2.new(1, -8, 0, math.ceil(#buttons / 2) * 52)
	grid.Parent = panel
	local gridLayout = Instance.new("UIGridLayout")
	gridLayout.CellSize = UDim2.new(0.5, -4, 0, 44)
	gridLayout.CellPadding = UDim2.new(0, 8, 0, 8)
	gridLayout.SortOrder = Enum.SortOrder.LayoutOrder
	gridLayout.Parent = grid

	for index, info in ipairs(buttons) do
		local button = label({
			ClassName = "TextButton",
			LayoutOrder = index,
			BackgroundColor3 = Color3.fromRGB(110, 50, 200),
			Text = info[1],
			Parent = grid,
		})
		corner(button, 10)
		button.Activated:Connect(function()
			if type(info[2]) == "function" then
				info[2]()
			else
				OwnerActionEvent:FireServer(info[2])
			end
		end)
	end

	local messageBox = label({
		ClassName = "TextBox",
		LayoutOrder = 3,
		Size = UDim2.new(1, -8, 0, 36),
		BackgroundColor3 = WHITE,
		TextColor3 = Color3.fromRGB(30, 30, 30),
		TextScaled = false,
		TextSize = 16,
		ClearTextOnFocus = false,
		PlaceholderText = "Message for everyone...",
		Text = "",
		Parent = panel,
	})
	corner(messageBox, 8)

	local sendButton = label({
		ClassName = "TextButton",
		LayoutOrder = 4,
		Size = UDim2.new(1, -8, 0, 40),
		BackgroundColor3 = Color3.fromRGB(230, 120, 0),
		Text = "📢 Announce",
		Parent = panel,
	})
	corner(sendButton, 10)
	sendButton.Activated:Connect(function()
		if messageBox.Text ~= "" then
			OwnerActionEvent:FireServer("Announce", messageBox.Text)
			messageBox.Text = ""
		end
	end)

	label({
		LayoutOrder = 5,
		Size = UDim2.new(1, -8, 0, 22),
		BackgroundTransparency = 1,
		TextColor3 = Color3.fromRGB(200, 200, 255),
		Text = "P = panel   F = fly",
		Parent = panel,
	})
end

local function checkOwner()
	if player:GetAttribute("IsOwner") then
		buildOwnerPanel()
	end
end
player:GetAttributeChangedSignal("IsOwner"):Connect(checkOwner)
checkOwner()

UserInputService.InputBegan:Connect(function(input, typing)
	if typing or not player:GetAttribute("IsOwner") then
		return
	end
	if input.KeyCode == Enum.KeyCode.P then
		togglePanel()
	elseif input.KeyCode == Enum.KeyCode.F then
		toggleOwnerFly()
	end
end)

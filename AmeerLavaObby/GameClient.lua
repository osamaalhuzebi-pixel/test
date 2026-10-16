--[[
	ESCAPE AMEER'S LAVA OBBY
	Client script: screen UI, spinning coins, bounce pads and the owner's secret power panel.

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
local remotes = ReplicatedStorage:WaitForChild("ObbyRemotes")
local NotifyEvent = remotes:WaitForChild("Notify")
local AnnounceEvent = remotes:WaitForChild("Announce")
local OwnerActionEvent = remotes:WaitForChild("OwnerAction")

local NUM_STAGES = remotes:GetAttribute("NumStages") or 21
local OWNER_NAME = remotes:GetAttribute("OwnerName") or "Ameer"
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
gui.Name = "ObbyUI"
gui.ResetOnSpawn = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = playerGui

---------------------------------------------------------------------
-- TITLE AND STAGE COUNTER
---------------------------------------------------------------------
local title = label({
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 6),
	Size = UDim2.new(0, 340, 0, 36),
	BackgroundColor3 = Color3.fromRGB(40, 10, 10),
	BackgroundTransparency = 0.2,
	Text = "🌋 ESCAPE " .. string.upper(OWNER_NAME) .. "'S LAVA OBBY 🌋",
	Parent = gui,
})
corner(title)
stroke(title, Color3.fromRGB(255, 120, 0), 2)
local titlePadding = Instance.new("UIPadding")
titlePadding.PaddingLeft = UDim.new(0, 10)
titlePadding.PaddingRight = UDim.new(0, 10)
titlePadding.PaddingTop = UDim.new(0, 4)
titlePadding.PaddingBottom = UDim.new(0, 4)
titlePadding.Parent = title

local stageLabel = label({
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 46),
	Size = UDim2.new(0, 220, 0, 26),
	BackgroundColor3 = Color3.fromRGB(20, 20, 40),
	BackgroundTransparency = 0.3,
	Text = "Stage 0 / " .. NUM_STAGES,
	Parent = gui,
})
corner(stageLabel, 10)

task.spawn(function()
	local leaderstats = player:WaitForChild("leaderstats")
	local stage = leaderstats:WaitForChild("Stage")
	local function update()
		if stage.Value >= NUM_STAGES then
			stageLabel.Text = "🏁 Touch the gold pad!"
		else
			stageLabel.Text = "Stage " .. stage.Value .. " / " .. NUM_STAGES
		end
	end
	stage.Changed:Connect(update)
	update()
end)

---------------------------------------------------------------------
-- SMALL MESSAGES (toasts)
---------------------------------------------------------------------
local toastHolder = Instance.new("Frame")
toastHolder.AnchorPoint = Vector2.new(0.5, 1)
toastHolder.Position = UDim2.new(0.5, 0, 1, -110)
toastHolder.Size = UDim2.new(0, 320, 0, 220)
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
-- BIG ANNOUNCEMENTS (seen by everyone)
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
local function showBanner(text)
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
end

AnnounceEvent.OnClientEvent:Connect(showBanner)

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
-- BOUNCE PADS
---------------------------------------------------------------------
local lastBounce = 0

local function setupBouncePad(pad)
	if not pad:IsA("BasePart") then
		return
	end
	pad.Touched:Connect(function(hit)
		local character = player.Character
		if not character or not hit:IsDescendantOf(character) then
			return
		end
		local root = character:FindFirstChild("HumanoidRootPart")
		if not root or os.clock() - lastBounce < 0.5 then
			return
		end
		lastBounce = os.clock()
		local velocity = root.AssemblyLinearVelocity
		root.AssemblyLinearVelocity = Vector3.new(velocity.X, pad:GetAttribute("Power") or 100, velocity.Z)
	end)
end

for _, pad in ipairs(CollectionService:GetTagged("BouncePad")) do
	setupBouncePad(pad)
end
CollectionService:GetInstanceAddedSignal("BouncePad"):Connect(setupBouncePad)

---------------------------------------------------------------------
-- OWNER SECRET: FLY
---------------------------------------------------------------------
local FLY_SPEED = 60
local flying = false
local flyVelocity
local flyConnection

local function stopFly()
	flying = false
	if flyConnection then
		flyConnection:Disconnect()
		flyConnection = nil
	end
	if flyVelocity then
		flyVelocity:Destroy()
		flyVelocity = nil
	end
end

local function startFly()
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not root or not humanoid then
		return
	end
	flying = true
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
			velocity = move * FLY_SPEED + Vector3.new(0, look.Y * FLY_SPEED * forward, 0)
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.E) or UserInputService:IsKeyDown(Enum.KeyCode.Space) then
			velocity += Vector3.new(0, FLY_SPEED, 0)
		end
		if UserInputService:IsKeyDown(Enum.KeyCode.Q) then
			velocity -= Vector3.new(0, FLY_SPEED, 0)
		end
		flyVelocity.Velocity = velocity
	end)
end

local function toggleFly()
	if not player:GetAttribute("IsOwner") then
		return
	end
	if flying then
		stopFly()
		showToast("✈️ Fly: OFF", "info")
	else
		startFly()
		if flying then
			showToast("✈️ Fly: ON  (E = up, Q = down)", "good")
		end
	end
end

player.CharacterAdded:Connect(stopFly)

---------------------------------------------------------------------
-- OWNER SECRET: POWER PANEL
---------------------------------------------------------------------
local panel
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
		Position = UDim2.new(0, 10, 0.45, 0),
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
	local list = Instance.new("UIListLayout")
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Padding = UDim.new(0, 8)
	list.Parent = panel

	label({
		LayoutOrder = 1,
		Size = UDim2.new(1, -8, 0, 40),
		BackgroundTransparency = 1,
		TextColor3 = GOLD,
		Text = "👑 " .. string.upper(OWNER_NAME) .. "'S SECRET POWERS",
		Parent = panel,
	})

	local buttons = {
		{ "✈️ Fly", toggleFly },
		{ "⚡ Speed", "Speed" },
		{ "🛡️ God Mode", "God" },
		{ "🦖 Giant", "Giant" },
		{ "⏭️ Skip Stage", "Skip" },
		{ "🏁 Go To End", "End" },
		{ "💰 Coin Rain", "CoinRain" },
		{ "🤫 Secret Room", "SecretRoom" },
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
		toggleFly()
	end
end)

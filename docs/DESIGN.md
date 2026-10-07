# Psych War: Game Design Document

Designed by Amir (with help from Dad and Claude).

A colorful 3D team shooter for kids aged 8 and up, inspired by Fortnite.
Nobody gets hurt: players get **tagged out** and pop into confetti.

---

## 1. Platforms

- Runs in a **web browser**, so it works on tablet, computer and phone.
- **Tablet is the main device.** Touch controls come first:
  - Left side: joystick to move
  - Right side: buttons for **Shoot**, **Jump**, **Build**
  - Swipe the screen to look around
- Computer: keyboard (WASD) and mouse.

## 2. Login and safety

- On first launch the player enters:
  - **Birthday**
  - **Nickname**, never a real name (for example "ShadowFox99")
- The game blocks nicknames that look like real first and last names and suggests a fun random nickname instead.
- Online play only shows nicknames, never birthdays.
- Any real-money purchase (in a later version) needs a **parent password**.

## 3. Game modes

| Mode | Description |
|---|---|
| **Offline** | Your team against **bots**. The game can be **paused**. |
| **Online** | Play with friends. (Built after offline mode.) |

### Match rules

- **Short team matches: 5 minutes.**
- Team size is chosen before the match: **2v2, 3v3 or 4v4**.
- When your health reaches zero you are **tagged out**: you pop in a burst of confetti and come back after a few seconds.
- When time runs out, the team with the most tag-outs wins.

## 4. Maps

The player chooses the map before each match.

| Map | Look |
|---|---|
| 🏝️ Island | Beaches, palm trees, a lighthouse |
| 🏙️ City | Rooftops, streets, a mall |
| 🏜️ Desert | Sand dunes, canyons, an old fort |
| 🌴 Jungle | Giant trees, rivers, hidden temples |

## 5. Building

- Players can build **walls** and **ramps**.
- Building uses **materials** collected around the map.

## 6. Bots

- Enemy players in offline mode are always **bots**.
- In offline mode your teammates are friendly **helper bots**.
- Difficulty goes from **easy to hard based on the player's level and power**:
  - Low level: bots move slowly and miss often.
  - High level: bots aim better, build walls and work together.
- After several losses in a row, bots get a little easier so the game stays fun.

## 7. Levels and rewards

- Players earn **XP** by playing, winning and tagging out enemies.
- Leveling up gives **coins** and unlocks guns.
- Coins are also earned by beating friends or bots.

## 8. Currency: TBS

TBS is the premium currency, shown inside a **square box** icon.

| TBS | Price |
|---|---|
| 50 | 5 riyal |
| 400 | 20 riyal |
| 1,000 | 50 riyal |
| 5,000 | 500 riyal |

**First version:** TBS are **pretend currency** earned by playing. Real payments come later and require a parent password.

## 9. Skins

| Skin | Price | Look |
|---|---|---|
| **Mjalli** | **Free** (every player starts with it) | Traditional Yemeni style (see below) |
| Mero | 400 TBS | Blue hoodie, gold sneakers, cool sunglasses |
| Donga | 800 TBS | Big orange armor, helmet with horns |
| Sweidan | 1,200 TBS | Purple space suit, glowing visor |
| Huzebi | 2,000 TBS (rarest) | Black and gold king outfit, small crown |

### Mjalli: Yemeni style

- **Long white thobe (zanna)** reaching the ankles
- **Dark tailored jacket** worn over the thobe, as is common in Yemen
- **Wide embroidered belt** with a decorative **jambiya** sheath at the front (decoration only, not a weapon)
- **Colorful wrapped turban (shal / imamah)** in red, white and gold patterns
- **Leather sandals**
- Victory pose: a short **bara'a dance** step

## 10. Guns

| Gun | What it does | Unlock |
|---|---|---|
| Starter Blaster | Simple blaster everyone has | Free |
| **The Slipper** 🩴 | Throws slippers that curve through the air and bonk enemies | Level 3 |
| **Golden Slipper** ✨ | Faster, bigger bonk, shiny gold (special gun) | 1,000 TBS |
| Splash Gun | Sprays paint that hits several enemies | Level 6 |
| Sniper | Long range, slow reload | Level 10 |
| Rapid Blaster | Shoots very fast, small hits | Level 15 |

## 11. Build order

1. **Version 1 (offline):** login screen, Mjalli skin, one map (Island), 2v2 against easy bots, Starter Blaster and Slipper, touch controls, pause. ✅ Built
2. **Version 2:** building walls and ramps, levels and XP, smarter bots, team size choice.
3. **Version 3:** all maps, all guns, shop with skins and pretend TBS.
4. **Version 4:** online play with friends.
5. **Later:** real payments with a parent password.

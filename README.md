# Psych War 🩴

A colorful 3D team shooter for kids, designed by Amir. It runs in the web browser on tablets, computers and phones.

Nobody gets hurt in Psych War: when you run out of health you get **tagged out**, pop into confetti, and come back 3 seconds later.

The full game plan is in [docs/DESIGN.md](docs/DESIGN.md).

## What's in version 1

- Login with a **secret nickname** (real names are blocked) and a **birthday**
- **Mjalli**, the free skin, in Yemeni clothes: white thobe, jacket, belt with jambiya, and a colorful shal
- The **Island** map: beaches, palm trees, a lighthouse and an old fort
- **2 vs 2 offline**: you and a helper bot against 2 enemy bots, for 5 minutes
- Two weapons: the **Starter Blaster** ⚡ and **The Slipper** 🩴
- Bots get harder as your level goes up
- Earn **coins** for every tag-out, plus bonus coins and **TBS** for winning
- A pause button, and a bara'a victory dance when your team wins

## Controls

| | Tablet / phone | Computer |
|---|---|---|
| Move | Joystick (left thumb) | W A S D |
| Look / aim | Swipe on the right side | Mouse (click the game first) |
| Fire | **FIRE** button (drag on it to aim at the same time) | Left click |
| Jump | **JUMP** button | Space |
| Switch weapon | 🩴 / ⚡ button | Q |
| Pause | ❚❚ button | Esc |

Hold the tablet sideways.

## Running the game

The game is plain HTML and JavaScript with no build step. Because it uses JavaScript modules it has to be opened through a web server, not by double-clicking `index.html`.

On a computer, from this folder:

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080>. To play on a tablet on the same Wi-Fi, open `http://<your-computer's-IP>:8080` in the tablet's browser.

To play anywhere, publish the folder with any static host, such as GitHub Pages.

## Tests

```sh
npm test
```

## Credits

3D graphics by [three.js](https://threejs.org) (MIT license, included in `vendor/`).

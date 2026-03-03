# NUCLEAR WAR ☢ — 3D World War Simulation

A real-time 3D nuclear war strategy game playable in any web browser.
Built with Three.js, WebGL, and a Node.js WebSocket server for multiplayer.

## WHAT IT IS

NUCLEAR WAR is a Risk-inspired global domination game rendered on a real 3D Earth globe.
Every country in the world (~180 nations) is a playable territory with its own troop count,
faction color, and vulnerability to nuclear strikes. The game uses NASA Earth satellite
imagery as the globe texture, with Natural Earth GeoJSON borders overlaid on top.

Players take turns commanding factions — deploying troops, launching conventional attacks
resolved by live dice rolls, and firing limited nuclear strikes that devastate enemy territories
and leave multi-turn radioactive fallout.

## GAME MODES

- **Single Player** — You (Blue) vs 3 AI opponents (Red, Green, Gold).
  AI uses greedy territorial expansion and opportunistic nuclear strikes.
- **Multiplayer** — Online play via WebSocket server with 4-letter room codes.
  Up to 4 human players; any unfilled slots are controlled by AI.
  Includes in-game text chat.

## HOW TO PLAY

- **Open:** `game.html` directly in your browser (Chrome/Firefox recommended)
- **Multiplayer:** Run the server first:

  ```bash
  cd nuclearwar
  node server.js
  ```

- **Controls:**
  - **Left Click** — Select a country / confirm an action
  - **Right Drag** — Rotate the globe
  - **Scroll** — Zoom in/out

### Phases per Turn:

- **REINFORCE** — Place new troops on your territories (3 minimum, +1 per 3 territories owned)
- **ATTACK** — Click your territory → Attack → click enemy. Dice decide the outcome.
- **FORTIFY** — Move troops between your own territories
- **NUKE** — Special attack ignoring dice. Deals 6-10 damage. Leaves 3-turn fallout. Each player starts with 2 nuclear warheads.
- **END TURN** — Pass turn to next player.

## TECHNICAL STACK

- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **3D Engine:** Three.js r128 (via CDN)
- **Globe:** NASA Blue Marble texture + Natural Earth GeoJSON country borders
- **Backend:** Node.js + ws (WebSocket library) — `server.js`
- No build step required. Open `game.html` directly.

## FILES

- `game.html` — Complete self-contained game client (~1200 lines)
- `server.js` — WebSocket multiplayer server
- `package.json` — Node.js dependency manifest (ws)

## PRICE TAG

Worth at least €1. Probably more.

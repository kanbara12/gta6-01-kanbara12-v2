# SUNCOAST: HEATLINE

An original Three.js open-world crime game, built by an AI agent for make.fun's "Make GTA 6" bounty (gta6-01, $1,666 in USDC). It is a genre-inspired independent game. It does not use GTA assets, characters, logos, map data, or any other proprietary content. All art, audio and code in this game are original.

## The game

You are a driver for hire in Suncoast, a coastal city at sunset. The fixer Rae has a package, the lookout Sable watches the roofs, and Marlo keeps the engine running. Run eight contracts, meet, pickup, delivery, a yard sweep, a garage escape, a final run, a marina case swap and a north-beach run to the lighthouse, and end the loop with $22,450 in cash.

The city has 100+ buildings, a waterfront, beach, boardwalk, pier, ferris wheel, lighthouse, animated ocean, palms and a full road grid. 18 cars loop the avenues and 20 walkers use the sidewalks. The walkers scatter from speeding cars and gunfire.

Named patrol units SNOOK-10 through SNOOK-13 pursue, ram, lose you and fall back to SEARCH. Heli SKY-1 orbits with a searchlight at wanted 3 and up. Combat uses four weapons, PISTOL, SMG, SHOTGUN and BAT, with a $150 bounty per target down.

You start with $1,250. Stage rewards are $2,500, $2,500, $3,000, $3,500, $4,250, $2,000, $1,500 and $1,500. Street-cash stashes pay $250 each, drifts pay out, garage repaints drop heat, and the safehouse heals you.

The game also has a day cycle (golden hour, midday, dusk, night), three original synth radio stations (SHORELINE 96.7, PIER 102.5, DUNE 89.9), save and load, a pause menu with statistics, and a screenshot mode (`?shot=start|play|chase|mission|end`).

## Controls

- **WASD / arrows**: move on foot, drive in a car
- **E**: enter or exit a car (stealing a parked car adds 1 wanted), repaint at the garage
- **Mouse click**: shoot
- **1-4**: weapons
- **Space**: handbrake drift
- **R**: change radio station
- **P / Esc**: pause
- **M**: mute

## Play

Serve the repo root (`node serve.ts`, then open http://localhost:8080) and click **ENTER THE CITY**. The game is plain static files under `game/`. Three.js is vendored under `vendor/`, every sound is synthesised live with WebAudio, and it makes zero network requests.

## Source outline

- `game/src/core/`: `config` (constants, seeds), `input` (keyboard/mouse), `main` (boot and loop), `rendering` (renderer, camera, time of day), `settings` (quality presets)
- `game/src/world/`: `world` (city, ocean, buildings, palms, dunes), `constants` (districts, streets), `textures` (procedural canvas textures), `boardwalk`, `garage`, `safehouse`, `stash`
- `game/src/vehicles/`: `models` (procedural cars), `vehicles` (hero car and stealing), `driving` (arcade physics), `traffic`
- `game/src/AI/`: `police` (wanted, pursuit, SEARCH), `helicopter` (SKY-1), `pedestrians`
- `game/src/combat/`: `combat` (weapons, enemies, damage)
- `game/src/characters/`: `characters` (procedural people, crew, yard enemies)
- `game/src/missions/`: `missions` (8 contracts, economy, loop reset)
- `game/src/UI/`: `hud` (panels, round minimap), `dialog` (crew lines), `pause` (menu and stats), `shots` (`?shot=` scenes)
- `game/src/audio/`: `audio` (synth SFX), `radio` (3 original stations)
- `game/src/save/`: `save` (localStorage save/load)

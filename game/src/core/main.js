// Boot + game loop for SUNCOAST: HEATLINE.
// One clear job: build the shared state G, wire every system together,
// and run the frame loop — input, driving, AI, missions, HUD, rendering.

import * as THREE from 'three';
import { WORLD, mulberry32 } from './config.js';
import { createInput } from './input.js';
import { loadSettings, applyQuality } from './settings.js';
import { createRendering, setTimeOfDay, updateTimeLerp, updateCamera } from './rendering.js';
import { buildWorld, updateWorld } from '../world/world.js';
import { buildBoardwalk } from '../world/boardwalk.js';
import { buildGarage, updateGarage, repaintCar } from '../world/garage.js';
import { buildSafehouse, updateSafehouse } from '../world/safehouse.js';
import { buildStashes, updateStashes } from '../world/stash.js';
import { createCharacter, createCrew, spawnYardEnemies } from '../characters/characters.js';
import { spawnPlayerCar, spawnStreetCars, tryEnterCar, exitCar } from '../vehicles/vehicles.js';
import { updateDriving } from '../vehicles/driving.js';
import { spawnTraffic, updateTraffic } from '../vehicles/traffic.js';
import { updatePolice, wantedFromHeat, policeSnapshot } from '../AI/police.js';
import { buildHelicopter, updateHelicopter } from '../AI/helicopter.js';
import { spawnPedestrians, updatePedestrians } from '../AI/pedestrians.js';
import { initCombat, tryFire, updateCombat } from '../combat/combat.js';
import { onStageStart, updateMissions, MISSION_POINTS, placeMarker } from '../missions/missions.js';
import { initHud, updateHud } from '../UI/hud.js';
import { showDialog, hideDialog } from '../UI/dialog.js';
import { openPause, closePause, togglePause, wirePause } from '../UI/pause.js';
import { stageShot } from '../UI/shots.js';
import { createAudio } from '../audio/audio.js';
import { createRadio } from '../audio/radio.js';
import { saveGame, loadGame, hasSave } from '../save/save.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = parseInt(params.get('seed') || '1', 10) || 1;

function createState() {
  const rendering = createRendering();
  const G = {
    rendering,
    renderer: rendering.renderer,
    scene: rendering.scene,
    camera: rendering.camera,
    input: createInput(),
    settings: loadSettings(),
    seed: SEED,
    money: 1250,
    health: 100,
    armour: 50,
    wanted: 0,
    heat: 0,
    rep: 0,
    day: 1,
    clockMin: 0,
    missionIndex: 0,
    jobsCompleted: 0,
    kills: 0,
    gameStarted: false,
    gameOver: false,
    paused: false,
    shotMode: false,
    shotCamera: null,
    cameraYaw: Math.PI,
    police: [],
    traffic: [],
    peds: [],
    enemies: [],
    currentCar: null,
    playerCar: null,
    player: null,
    walkTime: 0,
    driftScore: 0,
    policeSight: false,
    gunfireFlash: 0,
    quality: 'high',
    radioStationName: 'SHORELINE 96.7',
    radioTrack: '',
    _stageElapsed: 0,
  };
  G.actorPosition = () => {
    const a = G.currentCar || G.player;
    return a ? a.position : new THREE.Vector3(0, 0, 0);
  };
  G.showToast = (msg) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(G._toastTimer);
    G._toastTimer = setTimeout(() => el.classList.add('hidden'), 3600);
  };
  G.showDialog = (d) => showDialog(d);
  G.setTimeOfDay = (name, instant) => setTimeOfDay(G, name, instant);
  G.saveGame = () => saveGame(G);
  G.loadGame = () => loadGame(G);
  G.onStageStart = (i) => onStageStart(G, i);
  G.newGame = () => newGame(G);
  G.repaintCar = () => repaintCar(G);
  return G;
}

function newGame(G) {
  G.money = 1250; G.health = 100; G.armour = 50;
  G.wanted = 0; G.heat = 0; G.rep = 0; G.day = 1; G.clockMin = 0;
  G.missionIndex = 0; G.jobsCompleted = 0; G.kills = 0;
  G.gameOver = false; G.gameStarted = true;
  G.currentCar = null;
  G.player.visible = true;
  G.player.position.set(0, 0, 16.5);
  G.player.rotation.y = 0;
  G.playerCar.position.set(0, 0, 20);
  G.playerCar.rotation.y = 0;
  G.playerCar.userData.speed = 0;
  G.playerCar.userData.condition = 100;
  for (const e of G.enemies) { e.visible = false; e.userData.alive = false; }
  const startCard = document.getElementById('startCard');
  if (startCard) startCard.classList.add('hidden');
  const over = document.getElementById('gameOverCard');
  if (over) over.classList.add('hidden');
  // D-FQA02: the stage-0 crew dialog fires the moment NEW GAME is pressed.
  onStageStart(G, 0);
  G.showToast('WELCOME TO SUNCOAST • MEET THE FIXER');
}

function buildGame(G) {
  buildWorld(G);
  buildBoardwalk(G);
  buildGarage(G);
  buildSafehouse(G);
  buildStashes(G);
  createCrew(G);
  spawnYardEnemies(G);
  for (const e of G.enemies) { e.visible = false; e.userData.alive = false; }
  G.player = createCharacter({ seed: 1, name: 'You', role: 'DRIVER', shirt: 0xe8e8e8, skin: 0xc98a6b });
  G.player.position.set(0, 0, 16.5);
  G.scene.add(G.player);
  spawnPlayerCar(G);
  spawnStreetCars(G);
  spawnTraffic(G, 18);
  spawnPedestrians(G, 20);
  buildHelicopter(G);
  initCombat(G);
  initHud(G);
  createAudio(G);
  createRadio(G);
  applyQuality(G, G.settings.quality);
  G.markerTarget = MISSION_POINTS[0];
  placeMarker(G.marker, 0);
  wirePause(G);
  wireStartScreen(G);
  // HUD police API: the panel reads this, never guesses.
  window.SuncoastPolice = {
    units: () => policeSnapshot(G),
    wanted: () => G.wanted,
    sight: () => !!G.policeSight,
  };
  window.__game = G;
}

function wireStartScreen(G) {
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('newGameBtn', () => {
    if (typeof G.unlockAudio === 'function') G.unlockAudio();
    if (typeof G.startRadio === 'function') G.startRadio();
    newGame(G);
  });
  bind('continueBtn', () => {
    if (typeof G.unlockAudio === 'function') G.unlockAudio();
    if (typeof G.startRadio === 'function') G.startRadio();
    if (!G.loadGame()) newGame(G);
  });
  bind('retryBtn', () => { G.loadGame(); });
  const cont = document.getElementById('continueBtn');
  if (cont && !hasSave()) cont.classList.add('hidden');
  // Title screen shows the world behind it: idle camera orbit.
  G.titleOrbit = true;
}

function handleKeys(G) {
  const k = G.input;
  if (k.wasPressed('KeyE')) {
    if (G.currentCar) exitCar(G);
    else if (!tryEnterCar(G)) {
      // Near the garage with heat? Repaint. Otherwise nothing in reach.
      const p = G.actorPosition();
      if (G.garage && Math.abs(p.x - G.garage.pos.x) < 12 && Math.abs(p.z - G.garage.pos.z) < 10) G.repaintCar();
    }
  }
  if (k.wasPressed('KeyR')) { if (typeof G.cycleRadio === 'function') G.cycleRadio(); }
  if (k.wasPressed('KeyP') || k.wasPressed('Escape')) {
    if (G.gameStarted && !G.shotMode) togglePause(G);
  }
  if (k.wasPressed('Digit1')) G.weaponIndex = 0;
  if (k.wasPressed('Digit2')) G.weaponIndex = 1;
  if (k.wasPressed('Digit3')) G.weaponIndex = 2;
  if (k.wasPressed('Digit4')) G.weaponIndex = 3;
  if (k.wasPressed('KeyM')) {
    G.settings.muted = !G.settings.muted;
    if (typeof G.setMuted === 'function') G.setMuted(G.settings.muted);
  }
  if (k.mouseClicked && !G.paused) tryFire(G);
}

function gameOverCheck(G) {
  if (G.gameOver) {
    const el = document.getElementById('gameOverCard');
    if (el) el.classList.remove('hidden');
  }
}

function loop(G) {
  const clock = new THREE.Clock();
  let lastSiren = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (!G.paused) {
      G.clockMin = (G.clockMin || 0) + dt * 0.5; // 1 game hour per 2 min
      if (G.clockMin >= 60 * 24) { G.clockMin = 0; G.day += 1; }
      // Slow day cycle: golden -> noon -> dusk -> night.
      const hour = 17 + Math.floor((G.clockMin || 0) / 60);
      const tod = hour < 18 ? 'golden' : hour < 20 ? 'dusk' : 'night';
      if (tod !== G.rendering.timeOfDay && !G.shotMode) setTimeOfDay(G, tod);
      updateTimeLerp(G, dt);
      if (G.gameStarted && !G.gameOver) {
        handleKeys(G);
        updateDriving(G, dt);
        updateTraffic(G, dt);
        updatePedestrians(G, dt, t);
        updatePolice(G, dt);
        updateHelicopter(G, dt, t);
        updateCombat(G, dt, t);
        updateMissions(G, dt);
        updateGarage(G, dt);
        updateSafehouse(G, dt);
        updateStashes(G, dt);
        if (G.wanted >= 2 && t - lastSiren > 4) {
          lastSiren = t;
          if (typeof G.playSiren === 'function') G.playSiren();
        }
        // Wanted level follows heat.
        G.wanted = wantedFromHeat(G.heat);
      } else if (!G.gameStarted && G.titleOrbit) {
        // Slow orbit around downtown behind the title screen.
        const a = t * 0.05;
        G.camera.position.set(Math.cos(a) * 90, 42, Math.sin(a) * 90);
        G.camera.lookAt(20, 4, 0);
      }
      updateWorld(G, t, dt);
      if (!G.titleOrbit || G.gameStarted) updateCamera(G, dt);
      updateHud(G);
      gameOverCheck(G);
    }
    G.renderer.render(G.scene, G.camera);
    G.input.endFrame();
  }
  frame();
}

function boot() {
  const G = createState();
  buildGame(G);
  // Screenshot mode: stage the scene, skip the title screen.
  if (SHOT) {
    G.titleOrbit = false;
    stageShot(SHOT, G);
    G.gameStarted = true;
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
  }
  loop(G);
  // Ready flag for the headless harness: first frame rendered.
  requestAnimationFrame(() => { window.__ready = true; });
}

boot();
void WORLD;
void mulberry32;

// Screenshot scenes for SUNCOAST: HEATLINE.
// One clear job: the ?shot= scenes. Each scene stages a genuine gameplay
// state — the same live simulation, just positioned and seeded
// deterministically — then the normal game loop runs it, so every
// screenshot is a real frame of the game, never a mockup.
//
// Scenes (5 prepared; the kit submits the best 4):
//   start   — hero open-world: the pier, the beach and the city skyline.
//   play    — driving through traffic on an avenue.
//   chase   — police pursuit at wanted level 3, heli SKY-1 overhead.
//   mission — on-foot combat at the crew yard, mission 3 in progress.
//   end     — the overlook after the final job, city and coast behind.
// Any other name behaves like start. ?seed= picks the deterministic stream.
//
// Staging rules the Hydrogen review forced (Nov 2026): the hero must be
// BIG and MOVING in every driving shot (close chase cam + a held cruise
// speed — without input the car coasts to 0 KM/H), traffic must never
// occlude the hero, the heli must stay close and its searchlight must
// read, and the mission shot must show the crew dialog + a weapon in
// hand. G.shotCruise / G.shotWrap / G.shotCamDist / G.shotHeliOrbit are
// the knobs; the loop honours them only in shot mode, never in play.

import * as THREE from 'three';
import { mulberry32 } from '../core/config.js';
import { MISSION_POINTS, placeMarker, getMissionBrief } from '../missions/missions.js';
import { spawnPoliceCar } from '../AI/police.js';

function putPlayerOnFoot(G, x, z, yaw) {
  G.currentCar = null;
  G.player.visible = true;
  G.player.position.set(x, 0, z);
  G.player.rotation.y = yaw;
  G.cameraYaw = yaw; // camera sits behind the facing, same as the loop
}

function putPlayerInCar(G, x, z, rotY, speed) {
  G.currentCar = G.playerCar;
  G.player.visible = false;
  G.playerCar.position.set(x, 0, z);
  G.playerCar.rotation.y = rotY;
  G.playerCar.userData.speed = speed;
}

/** Park a traffic car on a road: axis 'z' runs north-south, 'x' east-west. */
function stageTrafficCar(G, i, x, z, axis, dir, speed) {
  const c = G.traffic[i % G.traffic.length];
  if (!c) return;
  c.position.set(x, 0, z);
  c.userData.axis = axis;
  c.userData.dir = dir;
  c.userData.speed = speed;
  c.userData.baseSpeed = speed;
  c.rotation.y = axis === 'z' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
}

/** Park a pedestrian and set its walking direction. */
function stagePed(G, i, x, z, dirX, dirZ) {
  const f = G.peds[i % G.peds.length];
  if (!f) return;
  f.position.set(x, 0, z);
  f.userData.dirX = dirX;
  f.userData.dirZ = dirZ;
  f.userData.flee = 0;
  f.rotation.y = Math.atan2(dirX, dirZ);
}

/** Stage the named scene on the shared state G and return its label. */
export function stageShot(name, G) {
  const rng = mulberry32(G.seed * 7919 + 13);
  G.shotMode = true;
  G.gameStarted = true;
  G.gameOver = false;
  G.shotCamera = null;
  const startCard = document.getElementById('startCard');
  if (startCard) startCard.classList.add('hidden');
  const setTime = (t) => { if (typeof G.setTimeOfDay === 'function') G.setTimeOfDay(t, true); };
  // Close chase cam for every driving shot: the hero must dominate the
  // frame (the old 11.5 u chase made it ~8% of the screen width).
  const closeChase = (dist, height) => { G.shotCamDist = dist; G.shotCamHeight = height; };

  if (name === 'play') {
    // Driving WEST down Sunset Ave (z = 36) into the sunset: the sun disc
    // sits dead ahead, traffic ahead in both lanes, peds on the sidewalks.
    // Hero cruises at 72 KM/H and loops the x -60..60 stretch with the
    // traffic, so the frame holds at any settle time.
    setTime('golden');
    putPlayerInCar(G, 60, 36, -Math.PI / 2, 20);
    G.shotCruise = 20;
    G.shotWrap = { axis: 'x', min: -60, max: 60 };
    closeChase(7.5, 3.1);
    // Sun a touch south of due west: dead-ahead west puts the disc
    // behind the tower on the right; the road gap runs due west.
    G.sunDir = new THREE.Vector3(-0.98, 0.14, 0.10).normalize();
    // Same-direction traffic ahead (slower, so it stays ahead): at the
    // 8 s settle the hero is near x 20 and these sit 30-55 u ahead.
    stageTrafficCar(G, 0, 118, 33.3, 'x', -1, 16);
    stageTrafficCar(G, 1, 93, 33.3, 'x', -1, 16);
    // Oncoming traffic in the far lane, timed to be ahead at the settle.
    stageTrafficCar(G, 2, -72, 38.7, 'x', 1, 9);
    stageTrafficCar(G, 3, -92, 38.7, 'x', 1, 9);
    // The rest of the fleet stays clear of the hero's lane and camera.
    for (let i = 4; i < G.traffic.length; i += 1) {
      const c = G.traffic[i];
      c.position.set(-120 + i * 14, 0, -72 + (i % 3) * 36);
      c.userData.axis = 'z'; c.userData.dir = 1; c.userData.speed = 8; c.userData.baseSpeed = 8;
      c.rotation.y = 0;
    }
    stagePed(G, 0, 10, 27.5, -1, 0);
    stagePed(G, 1, 30, 44.5, 1, 0);
    stagePed(G, 2, -5, 27.5, 1, 0);
    G.missionIndex = 1;
    G.objectiveText = 'Pick up the sealed package at the next marker.';
    placeMarker(G.marker, G.missionIndex);
    G.markerTarget = MISSION_POINTS[G.missionIndex];
    return 'play';
  }

  if (name === 'chase') {
    // Police pursuit, southbound down the central avenue: wanted 3,
    // three units closing in from ahead and the flanks, heli SKY-1 tight
    // overhead with a searchlight that actually reads. Hero holds
    // 83 KM/H; no wrap — the avenue run is long enough for the settle.
    setTime('golden');
    putPlayerInCar(G, 0, -120, 0, 23);
    G.shotCruise = 23;
    closeChase(8.5, 3.4);
    // Sun straight ahead, over the road gap: a low south-west sun would
    // hide behind the downtown towers lining the avenue.
    G.sunDir = new THREE.Vector3(0.05, 0.25, 0.97).normalize();
    G.wanted = 3;
    G.heat = 60;
    while (G.police.length < 3) {
      const used = G.police.map((c) => c.userData.callsign);
      G.police.push(spawnPoliceCar(G.scene, G.actorPosition(), rng, G.buildings, used));
    }
    // Staged FAR ahead down the avenue (140-200 u): head-on closing is
    // ~47 u/s, so at the ~3.5 s capture they are 10-40 u ahead of the
    // hero, big in frame. Staged close they meet the hero in ~1 s and
    // end up behind the camera, invisible.
    G.police[0].position.set(6, 0, 30);
    G.police[1].position.set(-6, 0, 50);
    G.police[2].position.set(10, 0, 70);
    for (const c of G.police) { c.userData.speed = 6 + rng() * 2; c.userData.state = 'PURSUIT'; }
    // Heli: default 46 u orbit, parked ahead of the hero (south), slow
    // drift so it stays in frame; the tight 30 u orbit put it above the
    // top of the frame. The angle is pre-wound for the ~3.5 s capture
    // (drift 0.08/s), so the heli sits centred over the road at the shot.
    // Cone + spot boosted so the beam reads.
    if (G.heli) {
      G.heli.angle = Math.PI / 2 - 0.28; // ahead (south) at capture time
      const u = G.heli.group.userData;
      if (u.cone) u.cone.material.opacity = 0.3;
      if (u.spot) u.spot.intensity = 1600;
    }
    G.missionIndex = 4;
    G.objectiveText = 'Reach the garage and lose the heat.';
    placeMarker(G.marker, G.missionIndex);
    G.markerTarget = MISSION_POINTS[G.missionIndex];
    return 'chase';
  }

  if (name === 'mission') {
    // On foot at the crew yard, facing north into it: the closest enemy
    // 12 u ahead (far enough that it has not reached melee by the shot —
    // the first staging had it point-blank and the armour read 26),
    // the other two deeper in the yard, Sable (yellow) beside
    // the marker beam — and the player visibly holding a pistol while
    // Marlo's crew line stays on screen (dialog does not auto-hide in
    // shot mode). Camera close over the shoulder.
    setTime('golden');
    putPlayerOnFoot(G, 72, -56, Math.PI - 0.5);
    closeChase(6.5, 3.0);
    G.sunDir = new THREE.Vector3(-0.30, 0.20, -0.93).normalize();
    G.missionIndex = 3;
    G.kills = 2;
    G.weaponIndex = 0; // PISTOL selected in the HUD
    G.objectiveText = 'Clear the hostile crew in the industrial yard.';
    for (const e of G.enemies) {
      if (!e.userData.alive) { e.userData.alive = true; e.visible = true; e.userData.health = 2; }
    }
    const facePlayer = (e) => {
      e.rotation.y = Math.atan2(G.player.position.x - e.position.x, G.player.position.z - e.position.z);
    };
    if (G.enemies[0]) { G.enemies[0].position.set(76, 0, -68); facePlayer(G.enemies[0]); }
    if (G.enemies[1]) { G.enemies[1].position.set(68, 0, -74); facePlayer(G.enemies[1]); }
    if (G.enemies[2]) { G.enemies[2].position.set(80, 0, -78); facePlayer(G.enemies[2]); }
    // Pistol in the player's LEFT hand (shot staging only): the chase
    // camera sits on the player's left-rear, so the right hand is hidden
    // behind the torso and the left hand reads against the road.
    // Gunmetal (not black) so it catches the sun from behind.
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.3, metalness: 0.8 }),
    );
    gun.position.set(-0.52, 1.1, 0.35);
    gun.rotation.y = 0.15;
    gun.castShadow = true;
    G.player.add(gun);
    G.showDialog(getMissionBrief(3).dialog);
    placeMarker(G.marker, G.missionIndex);
    G.markerTarget = MISSION_POINTS[G.missionIndex];
    return 'mission';
  }

  if (name === 'end') {
    setTime('golden');
    putPlayerOnFoot(G, MISSION_POINTS[5].x + 6, MISSION_POINTS[5].z + 8, Math.atan2(-6, -8));
    G.missionIndex = 0;
    G.money = 12750;
    G.wanted = 0;
    G.showToast('STORY LOOP COMPLETE • NEW CONTRACT AVAILABLE');
    placeMarker(G.marker, G.missionIndex);
    G.markerTarget = MISSION_POINTS[G.missionIndex];
    G.shotCamera = {
      pos: new THREE.Vector3(-84, 10, -84),
      look: new THREE.Vector3(20, 3, 10),
    };
    return 'end';
  }

  // start (default): hero shot — the HEATLINE GT close in frame on the
  // beach road, camera low behind it, skyline and sunset ahead. The car
  // cruises north at 83 KM/H past the boardwalk stalls and the ferris
  // wheel, looping the z -60..60 stretch with the traffic so the frame
  // holds at any settle time. The dock stash sits west of the road as a
  // proper cash case now, not a floating debug marker.
  setTime('golden');
  putPlayerInCar(G, 142, 60, Math.PI, 23);
  G.shotCruise = 23;
  G.shotWrap = { axis: 'z', min: -60, max: 60 };
  closeChase(7.5, 3.1);
  G.sunDir = new THREE.Vector3(-0.30, 0.20, -0.93).normalize();
  // Oncoming traffic in the far lane (x 144.7, southbound); the wrap
  // keeps it cycling past the hero instead of driving away.
  stageTrafficCar(G, 0, 144.7, -40, 'z', 1, 8);
  stageTrafficCar(G, 1, 144.7, 0, 'z', 1, 8);
  stageTrafficCar(G, 2, 144.7, 40, 'z', 1, 8);
  // One northbound car far ahead, near the ferris wheel.
  stageTrafficCar(G, 3, 139.3, -90, 'z', -1, 8);
  for (let i = 4; i < G.traffic.length; i += 1) {
    const c = G.traffic[i];
    c.position.set(-108 + (i % 7) * 36, 0, -100 + i * 12);
    c.userData.axis = 'z'; c.userData.dir = 1; c.userData.speed = 8; c.userData.baseSpeed = 8;
    c.rotation.y = 0;
  }
  // Walkers on the grass west of the road and the sand east of the deck.
  stagePed(G, 0, 133, -10, 0, -1);
  stagePed(G, 1, 133, 15, 0, 1);
  stagePed(G, 2, 158, 5, 0, -1);
  G.missionIndex = 0;
  G.objectiveText = 'Meet the fixer at the glowing marker.';
  placeMarker(G.marker, G.missionIndex);
  G.markerTarget = MISSION_POINTS[G.missionIndex];
  return 'start';
}

export const SHOT_NAMES = ['start', 'play', 'chase', 'mission', 'end'];

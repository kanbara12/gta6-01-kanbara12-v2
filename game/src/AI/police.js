// Police response for SUNCOAST: HEATLINE.
// One clear job: the wanted system and the patrol cars — spawn, pursue,
// ram, lose the player and fall back to SEARCH, then stand down.
//
// States per unit: PURSUIT (eyes on the player, closing in), RAMMING
// (close enough to hit the player's car), SEARCH (player lost — the unit
// circles the last known spot), STANDDOWN (wanted 0, drives away).

import * as THREE from 'three';
import { buildCar } from '../vehicles/models.js';
import { mulberry32, clamp } from '../core/config.js';

const CALLSIGNS = ['SNOOK-10', 'SNOOK-11', 'SNOOK-12', 'SNOOK-13'];

/** Spawn one named police unit near the player (never inside a building).
 *  Callsigns are unique per live unit (fix D-VQ09): `usedCallsigns` holds
 *  the callsigns already on the street; the new unit takes one of the
 *  remaining names, so two "SNOOK-10" can never patrol at once. */
export function spawnPoliceCar(scene, pos, rng, buildings, usedCallsigns) {
  const car = buildCar({ police: true, color: 0x1a1a1a, seed: 900 + Math.floor(rng() * 100) });
  // Pick a road spot 25-40 u from the player, clear of buildings.
  let x = pos.x + 30, z = pos.z - 30;
  for (let tries = 0; tries < 12; tries++) {
    const a = rng() * Math.PI * 2;
    const d = 25 + rng() * 18;
    const tx = pos.x + Math.cos(a) * d, tz = pos.z + Math.sin(a) * d;
    const blocked = (buildings || []).some((b) => tx > b.minX - 3 && tx < b.maxX + 3 && tz > b.minZ - 3 && tz < b.maxZ + 3);
    if (!blocked && Math.abs(tx) < 155 && Math.abs(tz) < 155) { x = tx; z = tz; break; }
  }
  car.position.set(x, 0, z);
  const free = CALLSIGNS.filter((c) => !(usedCallsigns || []).includes(c));
  car.userData.callsign = (free.length ? free : CALLSIGNS)[Math.floor(rng() * (free.length ? free : CALLSIGNS).length)];
  car.userData.state = 'PURSUIT';
  car.userData.speed = 0;
  car.userData.lastSeen = new THREE.Vector3(pos.x, 0, pos.z);
  car.userData.searchTimer = 0;
  car.userData.sightTimer = 0;
  scene.add(car);
  return car;
}

/** Wanted level from heat: 0-100 heat maps to 0-5 stars (inclusive bands). */
export function wantedFromHeat(heat) {
  if (heat <= 0) return 0;
  if (heat <= 20) return 1;
  if (heat <= 40) return 2;
  if (heat <= 60) return 3;
  if (heat <= 85) return 4;
  return 5;
}

/** Per-frame police update: spawn to match wanted, chase, search, decay. */
export function updatePolice(G, dt) {
  const rng = G._rng || (G._rng = mulberry32(999));
  const target = Math.min(G.wanted, 4);
  // Spawn / despawn to match the wanted level (unique callsigns, D-VQ09).
  while (G.police.length < target) {
    const used = G.police.map((c) => c.userData.callsign);
    G.police.push(spawnPoliceCar(G.scene, G.actorPosition(), rng, G.buildings, used));
  }
  while (G.police.length > target) {
    const c = G.police.pop();
    G.scene.remove(c);
  }
  const p = G.actorPosition();
  let anySight = false;
  for (const c of G.police) {
    const u = c.userData;
    const dx = p.x - c.position.x, dz = p.z - c.position.z;
    const d = Math.hypot(dx, dz);
    const sees = d < 70; // open streets: line of sight is range-based
    if (sees) {
      u.lastSeen.set(p.x, 0, p.z);
      u.sightTimer = 0;
      u.searchTimer = 0;
      if (u.state === 'SEARCH') u.state = 'PURSUIT';
      anySight = true;
    } else {
      u.sightTimer += dt;
      if (u.sightTimer > 6 && u.state !== 'SEARCH') {
        u.state = 'SEARCH';
        u.searchTimer = 0;
      }
    }
    if (u.state === 'SEARCH') {
      u.searchTimer += dt;
      // Circle the last known position, scanning.
      const a = u.searchTimer * 0.5;
      const tx = u.lastSeen.x + Math.cos(a) * 18;
      const tz = u.lastSeen.z + Math.sin(a) * 18;
      driveToward(c, tx, tz, 10, dt, G);
      if (u.searchTimer > 25) {
        // Search exhausted: the trail goes cold, heat bleeds.
        G.heat = Math.max(0, G.heat - dt * 2);
      }
    } else if (d < 6 && G.currentCar) {
      u.state = 'RAMMING';
      driveToward(c, p.x, p.z, 24, dt, G, true);
      if (d < 3.2) {
        // Ram: shove the player's car and chip its condition.
        const shove = 3.5;
        G.currentCar.position.x += (dx / (d || 1)) * -shove * dt * 4;
        G.currentCar.position.z += (dz / (d || 1)) * -shove * dt * 4;
        if (G.currentCar.userData.condition > 0) G.currentCar.userData.condition = Math.max(0, G.currentCar.userData.condition - dt * 6);
        if (Math.random() < dt * 0.5 && typeof G.playCrash === 'function') G.playCrash();
      }
    } else {
      u.state = 'PURSUIT';
      driveToward(c, p.x, p.z, 20 + G.wanted * 1.5, dt, G);
    }
    // Flash the light bar.
    const phase = Math.floor(performance.now() / 180) % 2 === 0;
    if (c.userData.lightRed) c.userData.lightRed.material.emissiveIntensity = phase ? 3 : 0.2;
    if (c.userData.lightBlue) c.userData.lightBlue.material.emissiveIntensity = phase ? 0.2 : 3;
    for (const w of c.userData.wheels || []) w.rotation.x += u.speed * dt * 2.2;
  }
  G.policeSight = anySight;
  // Heat decays when no unit has eyes on the player.
  if (!anySight && G.wanted > 0) {
    G.heat = Math.max(0, G.heat - dt * 1.2);
    G.wanted = wantedFromHeat(G.heat);
  }
  return { anySight };
}

function driveToward(car, tx, tz, topSpeed, dt, G, ram = false) {
  const u = car.userData;
  const dx = tx - car.position.x, dz = tz - car.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.5) return;
  const wantYaw = Math.atan2(dx, dz);
  let diff = wantYaw - car.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.rotation.y += clamp(diff, -2.4 * dt, 2.4 * dt);
  u.speed = clamp(u.speed + (topSpeed - u.speed) * dt * 0.8, 0, topSpeed);
  const nx = car.position.x + Math.sin(car.rotation.y) * u.speed * dt;
  const nz = car.position.z + Math.cos(car.rotation.y) * u.speed * dt;
  car.position.x = nx; car.position.z = nz;
  if (G.resolveCollision(car.position, 2.2)) u.speed *= 0.4;
  void ram;
}

/** Snapshot the HUD police panel reads (window.SuncoastPolice).
 *  Includes the helicopter SKY-1 while airborne (fix D-VQ07): state is
 *  SEARCHLIGHT while a unit has eyes on the player (the heli has the
 *  player lit), SEARCH while it is sweeping blind. */
export function policeSnapshot(G) {
  const p = G.actorPosition();
  const rows = (G.police || []).map((c) => {
    const d = Math.round(Math.hypot(p.x - c.position.x, p.z - c.position.z));
    return { callsign: c.userData.callsign || 'SNOOK-10', distance: d, state: c.userData.state || 'PURSUIT' };
  });
  const h = G.heli;
  if (h && h.active && h.group) {
    const d = Math.round(Math.hypot(p.x - h.group.position.x, p.z - h.group.position.z));
    rows.push({ callsign: 'SKY-1', distance: d, state: G.policeSight ? 'SEARCHLIGHT' : 'SEARCH' });
  }
  return rows;
}

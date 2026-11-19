// Player + traffic vehicle ownership for SUNCOAST: HEATLINE.
// One clear job: spawn the hero car (HEATLINE GT), own enter/exit, and
// keep the list of drivable street cars the player can steal.

import * as THREE from 'three';
import { buildCar } from './models.js';
import { mulberry32 } from '../core/config.js';

export function spawnPlayerCar(G) {
  const car = buildCar({ hero: true, color: 0xff5268, seed: 99 });
  car.position.set(0, 0, 20);
  car.rotation.y = 0;
  car.userData.speed = 0;
  car.userData.condition = 100;
  car.userData.isPlayerCar = true;
  G.scene.add(car);
  G.playerCar = car;
  return car;
}

/** Parked street cars the player can steal (E to enter when close). */
export function spawnStreetCars(G) {
  const rng = mulberry32(777);
  const spots = [
    [-30, 44], [44, -30], [-44, -72], [72, 44], [-4, -44],
    [36, 108], [-108, 36], [108, -36], [0, -108], [72, -108],
  ];
  G.streetCars = spots.map(([x, z], i) => {
    const car = buildCar({ seed: 200 + i });
    car.position.set(x, 0, z);
    car.rotation.y = (rng() > 0.5 ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.2;
    car.userData.speed = 0;
    car.userData.condition = 70 + rng() * 30;
    car.userData.parked = true;
    G.scene.add(car);
    return car;
  });
  return G.streetCars;
}

/** Enter the nearest car within 4 u (hero car first, then street cars). */
export function tryEnterCar(G) {
  const p = G.player.position;
  const cands = [G.playerCar, ...(G.streetCars || [])].filter(Boolean);
  let best = null; let bestD = 5;
  for (const c of cands) {
    const d = Math.hypot(p.x - c.position.x, p.z - c.position.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return false;
  if (best !== G.playerCar && best.userData.parked) {
    best.userData.parked = false;
    G.wanted = Math.min(5, G.wanted + 1);
    G.heat = Math.max(G.heat, G.wanted * 20);
    G.showToast('CAR TAKEN • WITNESSES CALLED IT IN • WANTED +1');
  }
  G.currentCar = best;
  G.player.visible = false;
  G.showToast(best === G.playerCar ? 'HEATLINE GT • ENGINE ON' : 'STOLEN RIDE • DRIVE');
  return true;
}

/** Step out of the car onto the road beside it. */
export function exitCar(G) {
  if (!G.currentCar) return;
  const c = G.currentCar;
  const side = Math.cos(c.rotation.y);
  const sideX = Math.sin(c.rotation.y);
  G.player.position.set(c.position.x + sideX * 2.4, 0, c.position.z + side * 2.4);
  G.player.rotation.y = c.rotation.y;
  G.player.visible = true;
  G.currentCar = null;
  G.showToast('ON FOOT');
}

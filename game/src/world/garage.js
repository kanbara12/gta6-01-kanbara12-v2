// The garage for SUNCOAST: HEATLINE.
// One clear job: the garage building + the hide-from-heat mechanic —
// sit inside it and the wanted level bleeds away, and a repaint drops
// one star at once. Also the place stage 4 (evade) is survived.

import * as THREE from 'three';
import { GARAGE_POS } from './constants.js';

export function buildGarage(G) {
  const scene = G.scene;
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 12), new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 0.9 }));
  shell.position.set(GARAGE_POS.x, 3.5, GARAGE_POS.z);
  shell.castShadow = true; shell.receiveShadow = true;
  group.add(shell);
  const door = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.4), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6, metalness: 0.5 }));
  door.position.set(GARAGE_POS.x, 2.5, GARAGE_POS.z + 6.1);
  group.add(door);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  sign.position.set(GARAGE_POS.x, 6.2, GARAGE_POS.z + 6.15);
  group.add(sign);
  scene.add(group);
  G.garage = { pos: GARAGE_POS, group, hideTimer: 0, repainted: false };
  // The garage walls block movement like a building.
  G.buildings.push({ minX: GARAGE_POS.x - 8, maxX: GARAGE_POS.x + 8, minZ: GARAGE_POS.z - 6, maxZ: GARAGE_POS.z + 6, h: 7 });
  return group;
}

/**
 * Per-frame garage logic. Returns 'hiding' while the player sits inside
 * the garage zone with heat, 'clear' the frame the heat hits zero.
 */
export function updateGarage(G, dt) {
  const g = G.garage;
  if (!g) return null;
  const p = G.actorPosition();
  const inside = Math.abs(p.x - g.pos.x) < 10 && Math.abs(p.z - g.pos.z) < 8;
  if (!inside) { g.hideTimer = 0; return null; }
  if (G.wanted > 0) {
    g.hideTimer += dt;
    // Bleed one star every 15 s of hiding; full clear at 45 s (stage 4 par).
    if (g.hideTimer >= 15) {
      g.hideTimer = 0;
      G.wanted = Math.max(0, G.wanted - 1);
      G.heat = G.wanted * 20;
      G.showToast('GARAGE • HEAT DROPPING — STAY QUIET');
      if (G.wanted === 0) return 'clear';
    }
    return 'hiding';
  }
  return null;
}

/** Repaint the hero car: costs $150, drops one wanted star immediately. */
export function repaintCar(G) {
  if (G.money < 150) { G.showToast('NOT ENOUGH CASH FOR A REPAINT ($150)'); return false; }
  if (G.wanted <= 0) { G.showToast('NO HEAT TO LOSE — SAVE YOUR CASH'); return false; }
  G.money -= 150;
  G.wanted = Math.max(0, G.wanted - 1);
  G.heat = G.wanted * 20;
  if (G.playerCar) {
    const mats = [];
    G.playerCar.traverse((o) => { if (o.isMesh && o.material && o.material.color) mats.push(o.material); });
    const colors = [0xff5268, 0x33e0ff, 0xffc44d, 0x7dd8a8, 0xc98a6b];
    const c = colors[Math.floor(Math.random() * colors.length)];
    mats.forEach((m) => { if (m.userData.body) m.color.setHex(c); });
  }
  G.showToast('REPAINT DONE • -$150 • HEAT DOWN');
  return true;
}

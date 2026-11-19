// Combat for SUNCOAST: HEATLINE.
// One clear job: the four weapons, shooting, enemy AI and damage —
// on foot the player aims with the mouse and fires with a click.

import * as THREE from 'three';

export const WEAPONS = [
  { key: 'PISTOL', damage: 1, rate: 0.32, range: 60, spread: 0.012, color: 0xffd166 },
  { key: 'SMG', damage: 1, rate: 0.11, range: 55, spread: 0.05, color: 0x33e0ff },
  { key: 'SHOTGUN', damage: 1, rate: 0.85, range: 26, spread: 0.12, pellets: 5, color: 0xff7a59 },
  { key: 'BAT', damage: 1, rate: 0.5, range: 3.2, spread: 0, melee: true, color: 0x7dd8a8 },
];

export function initCombat(G) {
  G.weapons = WEAPONS.map((w) => ({ ...w, ammo: w.key === 'BAT' ? Infinity : 120 }));
  G.weaponIndex = 0;
  G.fireCooldown = 0;
  G.kills = 0;
  G.tracers = [];
}

/** Fire the selected weapon toward the camera's aim point. */
export function tryFire(G) {
  if (G.currentCar || G.paused || !G.gameStarted) return;
  const w = G.weapons[G.weaponIndex];
  if (!w || G.fireCooldown > 0) return;
  G.fireCooldown = w.rate;
  G.gunfireFlash = 0.15;
  if (typeof G.playShot === 'function') G.playShot(w.key);
  if (w.melee) { meleeSwing(G, w); return; }
  // Aim: from the camera through the screen centre, out to the weapon range.
  const origin = G.camera.position.clone();
  const dir = new THREE.Vector3();
  G.camera.getWorldDirection(dir);
  dir.x += (Math.random() - 0.5) * w.spread * 2;
  dir.y += (Math.random() - 0.5) * w.spread * 2;
  dir.normalize();
  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    shootRay(G, origin, dir, w);
  }
  spawnTracer(G, origin, dir, w);
  // Firing in public raises heat.
  G.heat = Math.min(100, G.heat + 4);
  G.wanted = Math.max(G.wanted, G.heat >= 20 ? 1 : G.wanted);
  if (w.ammo !== Infinity) w.ammo = Math.max(0, w.ammo - 1);
}

function shootRay(G, origin, dir, w) {
  let best = null; let bestD = w.range;
  const targets = [...(G.enemies || []), ...(G.peds || [])].filter((e) => e.userData.alive);
  for (const e of targets) {
    const to = new THREE.Vector3().subVectors(e.position.clone().add(new THREE.Vector3(0, 1.2, 0)), origin);
    const along = to.dot(dir);
    if (along < 0 || along > bestD) continue;
    const perp = to.clone().addScaledVector(dir, -along).length();
    if (perp < 1.1 && along < bestD) { best = e; bestD = along; }
  }
  if (best) {
    best.userData.health -= w.damage;
    if (best.userData.health <= 0) {
      best.userData.alive = false;
      best.visible = false;
      if (best.userData.isEnemy) {
        G.kills = (G.kills || 0) + 1;
        G.money += 150;
        G.showToast('TARGET DOWN • +$150 BOUNTY');
      } else {
        G.heat = Math.min(100, G.heat + 15);
        G.showToast('CIVILIAN HIT • WANTED UP');
      }
    }
  }
}

function meleeSwing(G, w) {
  const p = G.player.position;
  const targets = [...(G.enemies || [])].filter((e) => e.userData.alive);
  for (const e of targets) {
    if (Math.hypot(p.x - e.position.x, p.z - e.position.z) < w.range) {
      e.userData.health -= w.damage;
      if (e.userData.health <= 0) {
        e.userData.alive = false; e.visible = false;
        G.kills = (G.kills || 0) + 1;
        G.money += 150;
        G.showToast('TARGET DOWN • +$150 BOUNTY');
      }
    }
  }
}

function spawnTracer(G, origin, dir, w) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    origin.clone(),
    origin.clone().addScaledVector(dir, 40),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: w.color, transparent: true, opacity: 0.9 }));
  G.scene.add(line);
  G.tracers.push({ line, life: 0.08 });
}

/** Enemies shuffle toward the player and swing when close. */
export function updateCombat(G, dt, t) {
  G.fireCooldown = Math.max(0, (G.fireCooldown || 0) - dt);
  G.gunfireFlash = Math.max(0, (G.gunfireFlash || 0) - dt);
  for (const tr of G.tracers) {
    tr.life -= dt;
    if (tr.life <= 0) { G.scene.remove(tr.line); tr.line.geometry.dispose(); }
  }
  G.tracers = G.tracers.filter((tr) => tr.life > 0);
  const p = G.actorPosition();
  for (const e of G.enemies || []) {
    if (!e.userData.alive) continue;
    const d = Math.hypot(p.x - e.position.x, p.z - e.position.z);
    if (d > 2.2 && d < 40) {
      const dx = (p.x - e.position.x) / d, dz = (p.z - e.position.z) / d;
      e.position.x += dx * 3.2 * dt;
      e.position.z += dz * 3.2 * dt;
      e.rotation.y = Math.atan2(dx, dz);
      G.resolveCollision(e.position, 0.6);
    } else if (d <= 2.2) {
      // Melee hit on the player, once per second.
      e.userData.hitTimer = (e.userData.hitTimer || 0) - dt;
      if (e.userData.hitTimer <= 0) {
        e.userData.hitTimer = 1;
        damagePlayer(G, 12);
      }
    }
  }
}

/** Damage the player; death ends the run (stage kept, load a save). */
export function damagePlayer(G, amount) {
  if (G.gameOver) return;
  let remaining = amount;
  if (G.armour > 0) {
    const absorbed = Math.min(G.armour, remaining);
    G.armour -= absorbed; remaining -= absorbed;
  }
  G.health -= remaining;
  if (typeof G.playHurt === 'function') G.playHurt();
  if (G.health <= 0) {
    G.health = 0;
    G.gameOver = true;
    G.showToast('YOU ARE DOWN • LOAD A SAVE TO RETRY THIS STAGE');
  }
}

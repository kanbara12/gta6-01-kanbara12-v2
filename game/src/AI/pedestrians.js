// Pedestrians for SUNCOAST: HEATLINE.
// One clear job: the ~20 walkers — sidewalk strolling, street crossing,
// and reactions: they scatter from speeding cars and from gunfire.

import { createCharacter, animateWalk } from '../characters/characters.js';
import { mulberry32, clamp } from '../core/config.js';

export function spawnPedestrians(G, count = 20) {
  const rng = mulberry32(555);
  G.peds = [];
  for (let i = 0; i < count; i++) {
    const fig = createCharacter({ seed: 500 + i });
    fig.position.set(-140 + rng() * 270, 0, -140 + rng() * 270);
    fig.rotation.y = rng() * Math.PI * 2;
    fig.userData.speed = 1.2 + rng() * 1.4;
    fig.userData.flee = 0;
    fig.userData.dirX = Math.cos(fig.rotation.y);
    fig.userData.dirZ = Math.sin(fig.rotation.y);
    G.scene.add(fig);
    G.peds.push(fig);
  }
  return G.peds;
}

/** Walk, wander, and flee from cars and gunfire. */
export function updatePedestrians(G, dt, t) {
  if (!G.peds) return;
  const p = G.actorPosition();
  const carSpeed = G.currentCar ? Math.abs(G.currentCar.userData.speed || 0) : 0;
  for (const fig of G.peds) {
    const u = fig.userData;
    if (!u.alive) continue;
    const d = Math.hypot(p.x - fig.position.x, p.z - fig.position.z);
    if (G.gunfireFlash && d < 30) u.flee = 3;
    if (carSpeed > 10 && d < 8) u.flee = 2;
    if (u.flee > 0) {
      u.flee -= dt;
      const fx = (fig.position.x - p.x) / (d || 1);
      const fz = (fig.position.z - p.z) / (d || 1);
      fig.position.x += fx * 5 * dt;
      fig.position.z += fz * 5 * dt;
      fig.rotation.y = Math.atan2(fx, fz);
      animateWalk(fig, t, 2);
    } else {
      fig.position.x += u.dirX * u.speed * dt;
      fig.position.z += u.dirZ * u.speed * dt;
      animateWalk(fig, t, 1);
      if (Math.random() < dt * 0.02) {
        const a = Math.random() * Math.PI * 2;
        u.dirX = Math.cos(a); u.dirZ = Math.sin(a);
        fig.rotation.y = Math.atan2(u.dirX, u.dirZ);
      }
      if (Math.abs(fig.position.x) > 155 || Math.abs(fig.position.z) > 155) {
        u.dirX *= -1; u.dirZ *= -1;
        fig.rotation.y = Math.atan2(u.dirX, u.dirZ);
      }
    }
    G.resolveCollision(fig.position, 0.6);
    fig.position.x = clamp(fig.position.x, -160, 160);
    fig.position.z = clamp(fig.position.z, -160, 160);
  }
}

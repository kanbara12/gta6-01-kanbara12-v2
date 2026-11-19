// Traffic for SUNCOAST: HEATLINE.
// One clear job: the ambient cars — spawn them on the road grid, drive
// them in loops, and keep them out of the player and the buildings.

import { buildCar } from './models.js';
import { mulberry32, clamp } from '../core/config.js';

const ROAD_AXES = [-108, -72, -36, 0, 36, 72, 108];

export function spawnTraffic(G, count = 18) {
  const rng = mulberry32(31337);
  G.traffic = [];
  for (let i = 0; i < count; i++) {
    const car = buildCar({ seed: 400 + i });
    const axis = ROAD_AXES[Math.floor(rng() * ROAD_AXES.length)];
    const vertical = rng() > 0.5;
    const lane = (rng() > 0.5 ? 1 : -1) * 2.7;
    car.position.set(
      vertical ? axis + lane : -150 + rng() * 300,
      0,
      vertical ? -150 + rng() * 300 : axis + lane,
    );
    car.rotation.y = vertical ? (lane > 0 ? 0 : Math.PI) : (lane > 0 ? Math.PI / 2 : -Math.PI / 2);
    car.userData.speed = 6 + rng() * 5;
    car.userData.baseSpeed = car.userData.speed;
    car.userData.axis = vertical ? 'z' : 'x';
    car.userData.dir = lane > 0 ? 1 : -1;
    G.scene.add(car);
    G.traffic.push(car);
  }
  return G.traffic;
}

/** Advance traffic; slow for the player ahead, wrap at the city edge. */
export function updateTraffic(G, dt) {
  if (!G.traffic) return;
  const p = G.actorPosition();
  for (const c of G.traffic) {
    const u = c.userData;
    // Brake if the player is right ahead on the same road.
    const dx = p.x - c.position.x, dz = p.z - c.position.z;
    const ahead = u.axis === 'z'
      ? Math.sign(dz) === u.dir && Math.abs(dz) < 10 && Math.abs(dx) < 4
      : Math.sign(dx) === u.dir && Math.abs(dx) < 10 && Math.abs(dz) < 4;
    const target = ahead ? 0 : u.baseSpeed;
    u.speed += clamp(target - u.speed, -12 * dt, 8 * dt);
    if (u.axis === 'z') {
      const prevZ = c.position.z;
      c.position.z += u.dir * u.speed * dt;
      // Shot mode: loop the same staging window as the hero, so the
      // traffic keeps its relative position instead of driving away
      // while the hero wraps. Only fires on crossing from inside.
      if (G.shotMode && G.shotWrap && G.shotWrap.axis === 'z') {
        const w = G.shotWrap, span = w.max - w.min;
        if (prevZ >= w.min && prevZ <= w.max) {
          if (c.position.z < w.min) c.position.z += span;
          else if (c.position.z > w.max) c.position.z -= span;
        }
      }
      if (c.position.z > 160) c.position.z = -160;
      if (c.position.z < -160) c.position.z = 160;
      // Never drive through the hero car (fix D-VQ05, traffic side):
      // if the move would overlap the hero, stay put and stop.
      if (G.currentCar && Math.hypot(c.position.x - G.currentCar.position.x, c.position.z - G.currentCar.position.z) < 4.0) {
        c.position.z = prevZ;
        u.speed = 0;
      }
    } else {
      const prevX = c.position.x;
      c.position.x += u.dir * u.speed * dt;
      // Shot mode: same staging-window loop as the hero (see 'z' branch).
      if (G.shotMode && G.shotWrap && G.shotWrap.axis === 'x') {
        const w = G.shotWrap, span = w.max - w.min;
        if (prevX >= w.min && prevX <= w.max) {
          if (c.position.x < w.min) c.position.x += span;
          else if (c.position.x > w.max) c.position.x -= span;
        }
      }
      if (c.position.x > 160) c.position.x = -160;
      if (c.position.x < -160) c.position.x = 160;
      if (G.currentCar && Math.hypot(c.position.x - G.currentCar.position.x, c.position.z - G.currentCar.position.z) < 4.0) {
        c.position.x = prevX;
        u.speed = 0;
      }
    }
    for (const w of c.userData.wheels || []) w.rotation.x += u.speed * dt * 2.2;
  }
}

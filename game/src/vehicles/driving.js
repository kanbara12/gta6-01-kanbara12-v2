// Arcade driving for SUNCOAST: HEATLINE.
// One clear job: move the player's car — throttle, brake, steering,
// drift payout and building collision — plus on-foot movement.

import { clamp, WORLD } from '../core/config.js';
import { animateWalk } from '../characters/characters.js';

const ROAD_AXES = [-108, -72, -36, 0, 36, 72, 108, 142];

/** True when (x,z) sits on asphalt (a road or the beach road). */
export function onRoad(x, z) {
  for (const a of ROAD_AXES) {
    if (Math.abs(x - a) < 7.5 || Math.abs(z - a) < 7.5) return true;
  }
  return false;
}

export function updateDriving(G, dt) {
  const car = G.currentCar;
  if (!car) { updateOnFoot(G, dt); return; }
  const { f, s } = G.input.axis();
  const u = car.userData;
  const topSpeed = 26;
  const accel = f > 0 ? 14 : (f < 0 ? -9 : 0);
  u.speed += accel * dt;
  if (f === 0) u.speed -= Math.sign(u.speed) * Math.min(Math.abs(u.speed), 8 * dt);
  u.speed = clamp(u.speed, -10, topSpeed);
  // Steering: sharper at low speed, looser at speed; handbrake drift.
  const steer = s * clamp(Math.abs(u.speed) / 8, 0.15, 1) * 1.9;
  const handbrake = G.input.keys.has('Space');
  car.rotation.y += steer * dt * Math.sign(u.speed || 1) * (handbrake ? 1.5 : 1);
  if (handbrake && Math.abs(u.speed) > 12) {
    u.speed -= Math.sign(u.speed) * 4 * dt;
    G.driftScore = (G.driftScore || 0) + dt * 20;
    if (G.driftScore > 100) {
      G.money += 50; G.driftScore = 0;
      G.showToast('DRIFT • +$50');
    }
  }
  const nx = car.position.x + Math.sin(car.rotation.y) * u.speed * dt;
  const nz = car.position.z + Math.cos(car.rotation.y) * u.speed * dt;
  const before = { x: car.position.x, z: car.position.z };
  car.position.x = nx; car.position.z = nz;
  if (G.resolveCollision(car.position, 2.2)) {
    // Bumped a building: kill speed, chip the condition.
    const lost = Math.abs(u.speed);
    u.speed *= -0.25;
    // Shot mode: the staged hero brushes traffic and stalls by design —
    // a screenshot must not show a wrecked car for it.
    if (lost > 8 && !G.shotMode) {
      u.condition = Math.max(0, (u.condition ?? 100) - lost * 0.4);
      G.showToast('CRASH • CONDITION DOWN');
      if (typeof G.playCrash === 'function') G.playCrash();
    }
  }
  // Car-vs-traffic collision (fix D-VQ05): the hero car can no longer pass
  // through a traffic car — it stops at a 4.0 u centre gap, with a small
  // condition chip on a hard hit, like a building bump.
  if (G.traffic) {
    for (const t of G.traffic) {
      const dx = car.position.x - t.position.x, dz = car.position.z - t.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 4.0 && d > 0.001) {
        const push = 4.0 / d;
        car.position.x = t.position.x + dx * push;
        car.position.z = t.position.z + dz * push;
        const lost = Math.abs(u.speed);
        u.speed *= -0.25;
        if (lost > 8 && !G.shotMode) {
          u.condition = Math.max(0, (u.condition ?? 100) - lost * 0.25);
          G.showToast('CRASH • CONDITION DOWN');
          if (typeof G.playCrash === 'function') G.playCrash();
        }
        break;
      }
    }
  }
  // Car-vs-pedestrian collision (fix D-VQ06): the car stops instead of
  // driving through a walker; the ped scatters. No condition damage —
  // a person is not a wall.
  if (G.peds) {
    for (const fig of G.peds) {
      if (!fig.userData.alive) continue;
      const dx = car.position.x - fig.position.x, dz = car.position.z - fig.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.6 && d > 0.001) {
        const push = 2.6 / d;
        car.position.x = fig.position.x + dx * push;
        car.position.z = fig.position.z + dz * push;
        u.speed *= -0.25;
        fig.userData.flee = 2;
        break;
      }
    }
  }
  car.position.x = clamp(car.position.x, -WORLD.half, WORLD.half);
  car.position.z = clamp(car.position.z, -WORLD.half, WORLD.half);
  // Shot mode: hold a cruise speed and loop the staging stretch, so a
  // screenshot taken at any settle time still shows the hero driving.
  // The wrap only fires when the car CROSSES the window edge from inside
  // (a car staged outside the window is left alone).
  if (G.shotMode && typeof G.shotCruise === 'number') u.speed = G.shotCruise;
  if (G.shotMode && G.shotWrap) {
    const w = G.shotWrap, span = w.max - w.min;
    const wrap = (v, prev) => {
      if (prev < w.min || prev > w.max) return v;
      if (v < w.min) return v + span;
      if (v > w.max) return v - span;
      return v;
    };
    if (w.axis === 'x') car.position.x = wrap(car.position.x, before.x);
    else car.position.z = wrap(car.position.z, before.z);
  }
  // Wheel spin + a little body roll.
  const spin = u.speed * dt * 2.2;
  for (const w of car.userData.wheels || []) w.rotation.x += spin;
  car.rotation.z = -steer * 0.06;
  void before;
}

export function updateOnFoot(G, dt) {
  const p = G.player;
  const { f, s } = G.input.axis();
  const speed = G.input.keys.has('ShiftLeft') ? 9 : 5.2;
  // Move relative to the camera yaw.
  const yaw = G.cameraYaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let mx = fx * f + rx * s;
  let mz = fz * f + rz * s;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    p.position.x += mx * speed * dt;
    p.position.z += mz * speed * dt;
    p.rotation.y = Math.atan2(mx, mz);
    G.resolveCollision(p.position, 0.7);
    G.walkTime = (G.walkTime || 0) + dt;
    // Walk-cycle animation (fix D-VQ01): the player figure has the same
    // animateWalk limbs as the pedestrians — drive them while moving.
    animateWalk(p, G.walkTime, speed > 6 ? 1.5 : 1);
  } else if (p.userData && p.userData.armL) {
    // Standing still: limbs back to neutral instead of freezing mid-swing.
    p.userData.armL.rotation.x = 0;
    p.userData.armR.rotation.x = 0;
    p.userData.legs.rotation.x = 0;
  }
  p.position.x = clamp(p.position.x, -WORLD.half, WORLD.half);
  p.position.z = clamp(p.position.z, -WORLD.half, WORLD.half);
}

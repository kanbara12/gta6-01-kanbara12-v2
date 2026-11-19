// Police helicopter SKY-1 for SUNCOAST: HEATLINE.
// One clear job: the heli — spawn at wanted 3+, orbit the player,
// sweep a searchlight, and push heat up while it has the player lit.

import * as THREE from 'three';

export function buildHelicopter(G) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.6), bodyMat);
  body.castShadow = true; group.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.1, metalness: 0.8 }));
  glass.position.set(0, 0.3, 1.6); glass.scale.set(1, 0.8, 1); group.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat);
  tail.position.set(0, 0.3, -4.2); group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 1.0), bodyMat);
  fin.position.set(0, 0.9, -6.2); group.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8), bodyMat);
  mast.position.y = 1.0; group.add(mast);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 }));
  rotor.position.y = 1.45; group.add(rotor);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; group.add(rotor2);
  // Searchlight: a spotlight + a visible cone.
  const spot = new THREE.SpotLight(0xfff2b0, 900, 120, 0.32, 0.5, 1.2);
  spot.position.set(0, -0.6, 0.5);
  group.add(spot); group.add(spot.target);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6, 46, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -23; cone.rotation.x = Math.PI;
  group.add(cone);
  // Searchlight pool: a lit disc on the ground under the beam, so the
  // spotlight reads even when the cone itself is faint against the sky.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.12;
  pool.visible = false;
  G.scene.add(pool);
  group.userData.rotor = rotor; group.userData.rotor2 = rotor2;
  group.userData.spot = spot; group.userData.cone = cone;
  group.userData.pool = pool;
  group.visible = false;
  G.scene.add(group);
  G.heli = { group, active: false, angle: 0 };
  return G.heli;
}

/** Per-frame heli logic: orbit ~46 m out, ~14 m up, spotlight on the player. */
export function updateHelicopter(G, dt, t) {
  const h = G.heli;
  if (!h) return;
  const want = G.wanted >= 3;
  if (want && !h.active) {
    h.active = true;
    h.group.visible = true;
    G.showToast('SKY-1 AIRBORNE • HELICOPTER OVERHEAD');
  }
  if (!want && h.active) {
    h.active = false;
    h.group.visible = false;
    if (h.group.userData.pool) h.group.userData.pool.visible = false;
    return;
  }
  if (!h.active) return;
  const p = G.actorPosition();
  // Shot mode: a tighter orbit (G.shotHeliOrbit) and a slow drift, so
  // the heli stays big and in frame instead of circling away.
  const orbitR = (G.shotMode && G.shotHeliOrbit) ? G.shotHeliOrbit : 46;
  h.angle += dt * (G.shotMode ? 0.08 : 0.35);
  const R = orbitR, H = 14;
  const tx = p.x + Math.cos(h.angle) * R;
  const tz = p.z + Math.sin(h.angle) * R;
  h.group.position.x += (tx - h.group.position.x) * Math.min(1, dt * 2);
  h.group.position.z += (tz - h.group.position.z) * Math.min(1, dt * 2);
  h.group.position.y += (H - h.group.position.y) * Math.min(1, dt * 2);
  if (h.group.userData.pool) {
    h.group.userData.pool.visible = true;
    h.group.userData.pool.position.set(p.x, 0.12, p.z);
  }
  h.group.rotation.y = Math.atan2(p.x - h.group.position.x, p.z - h.group.position.z);
  h.group.userData.rotor.rotation.y = t * 22;
  h.group.userData.rotor2.rotation.y = t * 22;
  // Spotlight tracks the player; the cone follows the spot target.
  h.group.userData.spot.target.position.set(p.x - h.group.position.x, -H, p.z - h.group.position.z);
  // While lit, the heat climbs slowly — the heli keeps the chase alive,
  // but never past 60 on its own (wanted stays 3 unless the player acts).
  G.heat = Math.min(60, G.heat + dt * 0.6);
}

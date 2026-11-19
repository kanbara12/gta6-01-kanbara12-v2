// Street-cash stashes for SUNCOAST: HEATLINE.
// One clear job: the three $250 street-cash pickups between contracts —
// where they sit, what they pay, and their 60 s respawn.

import * as THREE from 'three';

const STASH_SPOTS = [
  { x: 44.5, z: -28, label: 'ALLEY STASH' },
  { x: -72, z: 60, label: 'PARK STASH' },
  { x: 132, z: 20, label: 'DOCK STASH' },
];

export function buildStashes(G) {
  const scene = G.scene;
  G.stashes = STASH_SPOTS.map((s) => {
    const group = new THREE.Group();
    // A street-cash case: dark green duffel with a gold band, sitting on
    // a pulsing gold ring — it must read as a pickup, never as a debug
    // marker (no floating primitive).
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a7a4a, roughness: 0.7 }));
    box.position.y = 0.4; box.castShadow = true; group.add(box);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 0.82), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.4, metalness: 0.6 }));
    band.position.y = 0.55; group.add(band);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.15, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
    );
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.08; group.add(glow);
    group.position.set(s.x, 0, s.z);
    scene.add(group);
    return { ...s, group, glow, taken: false, respawn: 0, phase: Math.random() * 6 };
  });
  return G.stashes;
}

/** Collect a stash on touch; respawn 60 s after it is taken. */
export function updateStashes(G, dt) {
  if (!G.stashes) return;
  const p = G.actorPosition();
  for (const s of G.stashes) {
    if (s.taken) {
      s.respawn -= dt;
      if (s.respawn <= 0) { s.taken = false; s.group.visible = true; }
      continue;
    }
    s.phase = (s.phase || 0) + dt;
    const sc = 1 + Math.sin(s.phase * 3) * 0.12;
    s.glow.scale.set(sc, sc, 1);
    if (Math.hypot(p.x - s.x, p.z - s.z) < 2.2) {
      s.taken = true; s.respawn = 60; s.group.visible = false;
      G.money += 250;
      G.showToast(`${s.label} • +$250 STREET CASH`);
      if (typeof G.playPickup === 'function') G.playPickup();
    }
  }
}

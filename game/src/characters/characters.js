// Procedural characters for SUNCOAST: HEATLINE.
// One clear job: build every humanoid in the game from code — the player,
// the three crew, the cops and the yard enemies — no .glb, no external
// assets. Each figure is boxes + spheres with a role-coloured outfit.

import * as THREE from 'three';
import { mulberry32, pick } from '../core/config.js';

const SKINS = [0xc98a6b, 0x8a5a3a, 0xe8b88a, 0x6a4230];
const SHIRTS = [0xff5268, 0x33e0ff, 0xffc44d, 0x7dd8a8, 0xc98a6b, 0x9ab8c9];
const PANTS = [0x2a3242, 0x3a2a3a, 0x4a4a4a, 0x2a3a4a];

export function createCharacter(opts = {}) {
  const rng = mulberry32(opts.seed || 1);
  const skin = opts.skin ?? pick(rng, SKINS);
  const shirt = opts.shirt ?? pick(rng, SHIRTS);
  const pants = opts.pants ?? pick(rng, PANTS);
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), mat(pants));
  legs.position.y = 0.4; legs.castShadow = true; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), mat(shirt));
  torso.position.y = 1.15; torso.castShadow = true; g.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), mat(skin));
  armL.position.set(-0.4, 1.15, 0); armL.castShadow = true; g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.4; g.add(armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), mat(skin));
  head.position.y = 1.78; head.castShadow = true; g.add(head);
  // Hair cap.
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(opts.hair ?? 0x1a1a1a));
  hair.position.y = 1.82; g.add(hair);

  g.userData = {
    alive: true, health: opts.health || 2, isEnemy: !!opts.enemy,
    walkPhase: rng() * Math.PI * 2, armL, armR, legs, head,
    role: opts.role || 'civilian', name: opts.name || '',
  };
  return g;
}

/** Walk-cycle swing for the limbs; t is elapsed seconds. */
export function animateWalk(fig, t, speed = 1) {
  const u = fig.userData;
  if (!u.armL) return;
  const s = Math.sin(t * 8 * speed);
  u.armL.rotation.x = s * 0.6;
  u.armR.rotation.x = -s * 0.6;
  u.legs.rotation.x = -s * 0.3;
}

/** The three crew members, placed at their story spots. */
export function createCrew(G) {
  const scene = G.scene;
  const crew = {};
  const rae = createCharacter({ seed: 11, name: 'Rae', role: 'FIXER', shirt: 0xff5268, skin: 0xc98a6b, hair: 0x2a1a1a });
  rae.position.set(8.5, 0, 10.5); rae.rotation.y = Math.PI;
  scene.add(rae); crew.rae = rae;
  const marlo = createCharacter({ seed: 22, name: 'Marlo', role: 'DRIVER', shirt: 0x33e0ff, skin: 0x8a5a3a, hair: 0x1a1a1a });
  marlo.position.set(132, 0, 98); marlo.rotation.y = -Math.PI / 2;
  scene.add(marlo); crew.marlo = marlo;
  const sable = createCharacter({ seed: 33, name: 'Sable', role: 'LOOKOUT', shirt: 0xffc44d, skin: 0xe8b88a, hair: 0x6a4a2a });
  sable.position.set(66, 0, -66); sable.rotation.y = Math.PI / 2;
  scene.add(sable); crew.sable = sable;
  G.crew = crew;
  return crew;
}

/** Yard enemies for the stage-3 combat: three hostile crew in the yard. */
export function spawnYardEnemies(G) {
  const scene = G.scene;
  const spots = [[76, -68], [68, -76], [80, -78]];
  G.enemies = spots.map(([x, z], i) => {
    const e = createCharacter({ seed: 100 + i, enemy: true, health: 2, shirt: 0x3a2a3a, skin: SKINS[i % SKINS.length], name: 'Yard Crew' });
    e.position.set(x, 0, z);
    e.rotation.y = Math.random() * Math.PI * 2;
    scene.add(e);
    return e;
  });
  return G.enemies;
}

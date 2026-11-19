// The safehouse for SUNCOAST: HEATLINE.
// One clear job: the safehouse building — stage 2's delivery point —
// plus the heal + save prompt the player gets while standing in it.

import * as THREE from 'three';
import { SAFEHOUSE_POS } from './constants.js';

export function buildSafehouse(G) {
  const scene = G.scene;
  const group = new THREE.Group();
  const house = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.95 }));
  house.position.set(SAFEHOUSE_POS.x, 3, SAFEHOUSE_POS.z);
  house.castShadow = true; house.receiveShadow = true;
  group.add(house);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0xa04a3a, roughness: 0.9 }));
  roof.position.set(SAFEHOUSE_POS.x, 7.7, SAFEHOUSE_POS.z);
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.9 }));
  door.position.set(SAFEHOUSE_POS.x, 1.7, SAFEHOUSE_POS.z + 5.1);
  group.add(door);
  const lamp = new THREE.PointLight(0xffd9a0, 8, 14);
  lamp.position.set(SAFEHOUSE_POS.x, 3.5, SAFEHOUSE_POS.z + 6);
  group.add(lamp);
  scene.add(group);
  G.safehouse = { pos: SAFEHOUSE_POS, group };
  G.buildings.push({ minX: SAFEHOUSE_POS.x - 6, maxX: SAFEHOUSE_POS.x + 6, minZ: SAFEHOUSE_POS.z - 5, maxZ: SAFEHOUSE_POS.z + 5, h: 6 });
  return group;
}

/** Standing at the safehouse slowly heals and offers a save. */
export function updateSafehouse(G, dt) {
  const s = G.safehouse;
  if (!s) return;
  const p = G.actorPosition();
  const near = Math.abs(p.x - s.pos.x) < 9 && Math.abs(p.z - s.pos.z) < 8;
  if (near && G.health < 100) {
    G.health = Math.min(100, G.health + dt * 6);
    if (Math.floor(G.health) % 25 === 0) G.showToast('SAFEHOUSE • RESTING…');
  }
  G.nearSafehouse = near;
}

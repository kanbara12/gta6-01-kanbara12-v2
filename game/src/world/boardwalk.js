// Boardwalk attractions for SUNCOAST: HEATLINE.
// One clear job: the boardwalk strip itself — stalls, arcade lights and the
// benches — plus the small cash stash hidden behind the arcade.

import * as THREE from 'three';
import { mulberry32, pick } from '../core/config.js';
import { makeBoardwalkTexture } from './textures.js';

export function buildBoardwalk(G) {
  const scene = G.scene;
  const rng = mulberry32(4242);
  const group = new THREE.Group();
  // Boardwalk deck along the sand, east of the beach road (x = 142) so
  // cars drive on asphalt, not on the boards.
  const deckTex = makeBoardwalkTexture();
  deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
  deckTex.repeat.set(1, 24);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.5, 300),
    new THREE.MeshStandardMaterial({ map: deckTex, roughness: 1 }),
  );
  deck.position.set(149, 0.25, 0); deck.receiveShadow = true;
  group.add(deck);
  // Stalls with striped awnings and warm bulbs.
  const awningCols = [0xff4d8d, 0x33e0ff, 0xffc44d, 0x7dd8a8];
  for (let i = 0; i < 8; i++) {
    const z = -120 + i * 34;
    const stall = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }));
    box.position.y = 1.2; box.castShadow = true; stall.add(box);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 3.6), new THREE.MeshStandardMaterial({ color: pick(rng, awningCols), roughness: 0.7 }));
    awn.position.y = 2.7; stall.add(awn);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.set(0, 2.5, 1.9); stall.add(bulb);
    const light = new THREE.PointLight(0xffd9a0, 6, 12);
    light.position.set(0, 2.6, 2.2); stall.add(light);
    stall.position.set(145.5, 0.5, z);
    group.add(stall);
    // Bench opposite each stall.
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }));
    bench.position.set(152.5, 0.8, z + 6); group.add(bench);
  }
  scene.add(group);
  G.boardwalk = group;
  return group;
}

// Procedural car models for SUNCOAST: HEATLINE.
// One clear job: build every vehicle from code — body, cabin, wheels,
// lights, spoilers — in the colours the traffic and the hero car wear.

import * as THREE from 'three';
import { mulberry32, pick } from '../core/config.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1a1a1a, 0x5d6d7e];
const POLICE_COLORS = [0x1a1a1a, 0xecf0f1];

/**
 * Build a car. opts: {color, police, hero, seed}. The body material is
 * tagged userData.body so the garage repaint can recolour it.
 */
export function buildCar(opts = {}) {
  const rng = mulberry32(opts.seed || 5);
  const color = opts.color ?? pick(rng, CAR_COLORS);
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  bodyMat.userData = { body: true };
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2c4256, roughness: 0.12, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glassMat);
  cabin.position.set(0, 1.2, -0.2); cabin.castShadow = true; g.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.0), bodyMat);
  hood.position.set(0, 0.98, 1.65); g.add(hood);
  // Bumpers + grille.
  const bumpF = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.3), darkMat);
  bumpF.position.set(0, 0.4, 2.25); g.add(bumpF);
  const bumpR = bumpF.clone(); bumpR.position.z = -2.25; g.add(bumpR);
  // Headlights (emissive) + taillights.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffedb0, emissiveIntensity: 1.2 });
  for (const s of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.1), headMat);
    h.position.set(s, 0.72, 2.22); g.add(h);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 0.9 }));
    tail.position.set(s, 0.72, -2.22); g.add(tail);
  }
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  g.userData.wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(x, 0.38, z); w.castShadow = true;
    g.add(w); g.userData.wheels.push(w);
  }
  if (opts.hero) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), darkMat);
    spoiler.position.set(0, 1.15, -2.05); g.add(spoiler);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 4.0), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.3, metalness: 0.6 }));
    stripe.position.set(0, 0.95, 0.2); g.add(stripe);
  }
  if (opts.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    bar.position.set(0, 1.55, -0.2); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }));
    red.position.set(-0.3, 1.66, -0.2); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 2 }));
    blue.position.set(0.3, 1.66, -0.2); g.add(blue);
    g.userData.lightRed = red; g.userData.lightBlue = blue;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.42), new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.4, metalness: 0.3 }));
    stripe.position.y = 0.62; stripe.scale.set(1, 0.5, 1); g.add(stripe);
  }
  g.userData.speed = 0;
  g.userData.baseSpeed = 8;
  g.userData.dir = 1;
  g.userData.axis = 'z';
  return g;
}

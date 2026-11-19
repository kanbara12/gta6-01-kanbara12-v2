// Renderer, scene, camera and lighting for SUNCOAST: HEATLINE.
// One clear job: own the WebGL renderer, the follow camera and the
// time-of-day lighting — nothing else touches THREE's renderer directly.

import * as THREE from 'three';
import { TIME_PRESETS, lerp, clamp } from './config.js';

export function createRendering() {
  const canvasHolder = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  canvasHolder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd98a68);
  scene.fog = new THREE.Fog(0xdf9a7e, 105, 340);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 8, 14);

  const sun = new THREE.DirectionalLight(0xffe1b2, 2.4);
  sun.position.set(-65, 110, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xd9f5ff, 0x38404a, 2.0);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0x9fc8ff, 0.7);
  fill.position.set(60, 40, -80);
  scene.add(fill);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, sun, hemi, fill, timeOfDay: 'golden', _lerpT: 1, _from: null, _to: null };
}

/** Instantly (or over 1.5 s) move the light rig to a named preset. */
export function setTimeOfDay(G, name, instant = false) {
  const preset = TIME_PRESETS[name];
  if (!preset) return;
  const R = G.rendering;
  if (instant) {
    applyPreset(G, preset);
    R.timeOfDay = name; R._lerpT = 1;
    return;
  }
  R._from = snapshotLights(G);
  R._to = preset;
  R._lerpT = 0;
  R.timeOfDay = name;
}

function snapshotLights(G) {
  const R = G.rendering;
  return {
    sun: R.sun.color.getHex(), sunIntensity: R.sun.intensity,
    sunPos: R.sun.position.toArray(),
    hemiSky: R.hemi.color.getHex(), hemiGround: R.hemi.groundColor.getHex(),
    hemiIntensity: R.hemi.intensity, fillIntensity: R.fill.intensity,
    fog: G.scene.fog.color.getHex(), fogNear: G.scene.fog.near, fogFar: G.scene.fog.far,
    exposure: R.renderer.toneMappingExposure, bg: G.scene.background.getHex(),
    dome: G.skyDome ? G.skyDome.material.color.getHex() : 0xffffff,
    ocean: G.ocean ? G.ocean.material.color.getHex() : 0x27617f,
    oceanRoughness: G.ocean ? G.ocean.material.roughness : 0.25,
    oceanMetalness: G.ocean ? G.ocean.material.metalness : 0.35,
  };
}

function applyPreset(G, p) {
  const R = G.rendering;
  R.sun.color.setHex(p.sun); R.sun.intensity = p.sunIntensity;
  R.sun.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
  R.hemi.color.setHex(p.hemiSky); R.hemi.groundColor.setHex(p.hemiGround);
  R.hemi.intensity = p.hemiIntensity; R.fill.intensity = p.fillIntensity;
  G.scene.fog.color.setHex(p.fog); G.scene.fog.near = p.fogNear; G.scene.fog.far = p.fogFar;
  R.renderer.toneMappingExposure = p.exposure;
  G.scene.background.setHex(p.bg);
  if (G.skyDome) G.skyDome.material.color.setHex(p.dome ?? 0xffffff);
  if (G.ocean) {
    G.ocean.material.color.setHex(p.ocean);
    G.ocean.material.roughness = p.oceanRoughness;
    G.ocean.material.metalness = p.oceanMetalness;
  }
}

/** Advance a pending time-of-day lerp; called once per frame. */
export function updateTimeLerp(G, dt) {
  const R = G.rendering;
  if (!R._to || R._lerpT >= 1) return;
  R._lerpT = Math.min(1, R._lerpT + dt / 1.5);
  const t = R._lerpT;
  const f = R._from, p = R._to;
  const mix = (a, b) => lerp(a, b, t);
  const mixColor = (a, b) => {
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    return ca.lerp(cb, t).getHex();
  };
  R.sun.color.setHex(mixColor(f.sun, p.sun)); R.sun.intensity = mix(f.sunIntensity, p.sunIntensity);
  R.sun.position.set(mix(f.sunPos[0], p.sunPos[0]), mix(f.sunPos[1], p.sunPos[1]), mix(f.sunPos[2], p.sunPos[2]));
  R.hemi.color.setHex(mixColor(f.hemiSky, p.hemiSky));
  R.hemi.groundColor.setHex(mixColor(f.hemiGround, p.hemiGround));
  R.hemi.intensity = mix(f.hemiIntensity, p.hemiIntensity);
  R.fill.intensity = mix(f.fillIntensity, p.fillIntensity);
  G.scene.fog.color.setHex(mixColor(f.fog, p.fog));
  G.scene.fog.near = mix(f.fogNear, p.fogNear); G.scene.fog.far = mix(f.fogFar, p.fogFar);
  R.renderer.toneMappingExposure = mix(f.exposure, p.exposure);
  G.scene.background.setHex(mixColor(f.bg, p.bg));
  if (G.skyDome) G.skyDome.material.color.setHex(mixColor(f.dome ?? 0xffffff, p.dome ?? 0xffffff));
  if (G.ocean) {
    G.ocean.material.color.setHex(mixColor(f.ocean, p.ocean));
    G.ocean.material.roughness = mix(f.oceanRoughness, p.oceanRoughness);
    G.ocean.material.metalness = mix(f.oceanMetalness, p.oceanMetalness);
  }
  if (R._lerpT >= 1) R._to = null;
}

/** Third-person follow camera: behind the actor, mouse drag orbits. */
export function updateCamera(G, dt) {
  const cam = G.camera;
  const actor = G.currentCar || G.player;
  if (!actor) return;
  const drag = G.input.consumeDrag();
  if (drag !== 0) G.cameraYaw -= drag * 0.005;
  // Keep the sun's shadow frustum glued to the actor — including fixed
  // shot cameras. Without this the hero drives out of the ±60 shadow
  // frustum (which stays at the origin) and no shadow is ever visible.
  const R = G.rendering;
  const preset = TIME_PRESETS[R.timeOfDay];
  R.sun.target.position.set(actor.position.x, 0, actor.position.z);
  R.sun.position.set(
    actor.position.x + (preset ? preset.sunPos[0] : -65),
    preset ? preset.sunPos[1] : 110,
    actor.position.z + (preset ? preset.sunPos[2] : 45),
  );
  if (G.shotCamera) {
    cam.position.copy(G.shotCamera.pos);
    cam.lookAt(G.shotCamera.look);
    return;
  }
  // Ease the yaw toward the actor's heading: the camera sits BEHIND the
  // actor (opposite its facing), so driving and walking read correctly.
  const targetYaw = actor.rotation.y;
  let d = targetYaw - G.cameraYaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  G.cameraYaw += d * Math.min(1, dt * (G.currentCar ? 2.2 : 3.5));
  // Shot staging may pin a closer/lower chase (G.shotCamDist/Height);
  // when it does, the wanted-3 pullback is skipped too, so the hero
  // stays big in the chase frame.
  const shotCam = G.shotMode && typeof G.shotCamDist === 'number';
  const dist = shotCam ? G.shotCamDist : (G.currentCar ? 11.5 : 8.5);
  const height = shotCam ? (G.shotCamHeight ?? 3.2) : (G.currentCar ? 4.6 : 3.6);
  // Chase framing (fix D-VQ11): at wanted 3+ the camera pulls back, rises
  // a little, widens the FOV and shifts laterally, so the pursuit reads
  // in frame instead of looking like a normal drive.
  const chase = G.wanted >= 3 && !shotCam;
  const chaseDist = dist + (chase ? 3.0 : 0);
  const chaseHeight = height + (chase ? 1.0 : 0);
  const chaseLat = chase ? 1.5 : 0;
  const targetFov = 62 + (chase ? 5 : 0);
  if (Math.abs(cam.fov - targetFov) > 0.01) {
    cam.fov = lerp(cam.fov, targetFov, Math.min(1, dt * 4));
    cam.updateProjectionMatrix();
  }
  const px = actor.position.x - Math.sin(G.cameraYaw) * chaseDist + Math.cos(G.cameraYaw) * chaseLat;
  const pz = actor.position.z - Math.cos(G.cameraYaw) * chaseDist - Math.sin(G.cameraYaw) * chaseLat;
  cam.position.x = lerp(cam.position.x, px, Math.min(1, dt * 8));
  cam.position.y = lerp(cam.position.y, chaseHeight, Math.min(1, dt * 6));
  cam.position.z = lerp(cam.position.z, pz, Math.min(1, dt * 8));
  cam.lookAt(actor.position.x, actor.position.y + 1.6, actor.position.z);
  void clamp;
}

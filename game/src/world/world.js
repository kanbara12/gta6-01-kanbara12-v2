// The city itself for SUNCOAST: HEATLINE.
// One clear job: build the whole static world — ground, ocean, roads,
// 100+ buildings, palms, ferris wheel, lighthouse, dunes — and keep the
// collision list every mover consults.
//
// DUNE RULE (defect D-FQA01): dunes sit ONLY off the asphalt — on the wet
// sand east of the beach road (x > 150) or in the inland park strip
// (x < 134). The beach road itself (x 135..149) stays clear.

import * as THREE from 'three';
import { WORLD, COLOURS, mulberry32, pick, clamp } from '../core/config.js';
import { makeRoadTexture, makeSandTexture, makeFacadeTexture, makeBoardwalkTexture, makeNeonTexture } from './textures.js';
import { MISSION_POINTS } from '../missions/missions.js';

const ROAD_AXES = [-108, -72, -36, 0, 36, 72, 108];
const FACADE_BASES = ['#c98a6b', '#b98a7a', '#8fa3b8', '#c9b18a', '#a08bb8', '#7fa38a', '#d8a0a0', '#9ab8c9'];

export function buildWorld(G) {
  const scene = G.scene;
  const rng = mulberry32(20261119);
  G.buildings = []; // {minX,maxX,minZ,maxZ,h}
  G.colliders = G.buildings;
  G.palms = [];
  G.dunes = [];

  // --- Sky dome: a vertical sunset gradient so the horizon glows ---------
  // instead of a flat background colour. Tinted per time-of-day by
  // rendering.js (applyPreset sets its material colour from the preset).
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4; skyCanvas.height = 256;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  // Warm golden-orange sunset (fix D-VQ10): the old gradient was dominated
  // by a pink stop (#c65a7a) that read as a flat magenta field in every
  // screenshot. The visible band in gameplay shots (stops ~0.36-0.50, just
  // above the horizon) is now terracotta-to-orange; the blue->orange
  // transition sits higher (stops 0.20-0.32, above the frame top), so no
  // pink/magenta field is on screen. Top stays a deep dusk blue, horizon
  // glows pale gold — the sunset mood, not a pink solid.
  grad.addColorStop(0, '#2e3d75');
  grad.addColorStop(0.20, '#46508c');
  grad.addColorStop(0.32, '#b45a44');
  grad.addColorStop(0.45, '#e07a35');
  grad.addColorStop(0.62, '#ff9e45');
  grad.addColorStop(0.80, '#ffc25e');
  grad.addColorStop(1, '#ffe3a8');
  sg.fillStyle = grad; sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  skyDome.renderOrder = -1;
  scene.add(skyDome);
  G.skyDome = skyDome;

  // --- Sun disc + clouds: the sunset sky needs a sun and clouds --------
  // The sun sits effectively at infinity, so the group is re-positioned
  // around the camera every frame (see updateWorld); only its direction
  // matters. G.sunDir is a unit vector; shots.js may steer it per scene
  // so the disc lands in frame. Default: low in the north-west sky.
  G.sunDir = new THREE.Vector3(-0.5, 0.16, -0.85).normalize();
  const sunGroup = new THREE.Group();
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.4, fog: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  sunGlow.renderOrder = 5;
  sunGroup.add(sunGlow);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(18, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  sunDisc.position.z = 1;
  sunDisc.renderOrder = 5;
  sunGroup.add(sunDisc);
  scene.add(sunGroup);
  G.sunGroup = sunGroup;
  // Clouds: flat warm puffs scattered around the sun's azimuth so the
  // sky reads in north- and west-looking frames alike.
  const cloudDirs = [
    new THREE.Vector3(-0.85, 0.30, -0.42),
    new THREE.Vector3(-0.18, 0.24, -0.96),
    new THREE.Vector3(-0.78, 0.10, -0.62),
    new THREE.Vector3(0.18, 0.32, -0.94),
    new THREE.Vector3(-0.96, 0.38, 0.08),
    new THREE.Vector3(-0.55, 0.42, -0.72),
  ];
  G.clouds = cloudDirs.map((dir, i) => {
    const c = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xffc9a0 : 0xffd9b0, transparent: true,
      opacity: i % 2 ? 0.55 : 0.75, fog: false, depthWrite: false,
    });
    const puffs = [[0, 0, 0, 34, 9, 12], [-26, -2, 0, 22, 7, 9], [26, -1, 0, 24, 7, 10], [8, 5, 0, 18, 6, 8]];
    for (const [px, py, pz, rx, ry, rz] of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
      puff.scale.set(rx, ry, rz);
      puff.position.set(px, py, pz);
      puff.renderOrder = 5;
      c.add(puff);
    }
    scene.add(c);
    return { group: c, dir: dir.clone().normalize() };
  });

  // --- Ground: city slab, sand strip, ocean -------------------------------
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b7a5e, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0);
  ground.receiveShadow = true; scene.add(ground); G.ground = ground;

  const sandTex = makeSandTexture();
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(6, 12);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 340),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2; sand.position.set(153, 0.05, 0);
  sand.receiveShadow = true; scene.add(sand);

  // Ocean: animated vertex plane east of the beach.
  const oceanGeo = new THREE.PlaneGeometry(170, 340, 24, 24);
  const oceanMat = new THREE.MeshStandardMaterial({ color: COLOURS.ocean, roughness: 0.25, metalness: 0.35 });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(168 + 85, 0.15, 0);
  scene.add(ocean); G.ocean = ocean; G.oceanGeo = oceanGeo;

  // Wet reflective strip where the waves meet the sand.
  const wet = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 340),
    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.15, metalness: 0.5 }),
  );
  wet.rotation.x = -Math.PI / 2; wet.position.set(165, 0.08, 0); scene.add(wet);

  // --- Roads ----------------------------------------------------------------
  const roadTex = makeRoadTexture();
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  for (const x of ROAD_AXES) {
    const t = roadTex.clone(); t.needsUpdate = true; t.repeat.set(1, 10);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 300), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2; road.position.set(x, 0.06, 0);
    road.receiveShadow = true; scene.add(road);
  }
  for (const z of ROAD_AXES) {
    const t = roadTex.clone(); t.needsUpdate = true; t.repeat.set(1, 10);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 300), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2; road.rotation.z = Math.PI / 2; road.position.set(0, 0.06, z);
    road.receiveShadow = true; scene.add(road);
  }
  // Beach road along the shore (x = 142), asphalt, dune-free.
  const beachRoad = new THREE.Mesh(new THREE.PlaneGeometry(10, 300), roadMat);
  beachRoad.rotation.x = -Math.PI / 2; beachRoad.position.set(WORLD.beachRoadX, 0.06, 0);
  beachRoad.receiveShadow = true; scene.add(beachRoad);
  void roadMat;

  // Sidewalks: pale strips flanking the two main avenues.
  const walkMat = new THREE.MeshStandardMaterial({ color: COLOURS.sidewalk, roughness: 1 });
  for (const x of [-36, 0, 36, 72]) {
    for (const side of [-8.5, 8.5]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 300), walkMat);
      w.rotation.x = -Math.PI / 2; w.position.set(x + side, 0.04, 0); scene.add(w);
    }
  }

  // --- Buildings: 100+ boxes on the grid, skipping roads and the yard ------
  const yard = { x0: 54, z0: -90, x1: 90, z1: -54 };
  const marina = { x0: 110, z0: 80, x1: 138, z1: 116 };
  let built = 0;
  // Mission points stay clear: no building footprint within 9 u of one,
  // so every marker is reachable on foot and by car.
  const nearMission = (px, pz, w, d) => MISSION_POINTS.some((m) =>
    px + w / 2 > m.x - 9 && px - w / 2 < m.x + 9 && pz + d / 2 > m.z - 9 && pz - d / 2 < m.z + 9);
  for (let bx = -4; bx <= 3; bx++) {
    for (let bz = -4; bz <= 3; bz++) {
      const cx = bx * WORLD.grid + 18;
      const cz = bz * WORLD.grid + 18;
      if (cx > 120) continue; // beach / boardwalk strip stays open
      if (cx > yard.x0 && cx < yard.x1 && cz > yard.z0 && cz < yard.z1) continue;
      if (cx > marina.x0 && cx < marina.x1 && cz > marina.z0 && cz < marina.z1) continue;
      const downtown = Math.abs(cx) < 40 && Math.abs(cz) < 40;
      const n = 2; // two buildings per block: 100+ across the city
      for (let k = 0; k < n; k++) {
        // Faces stay >= 6 u from the road centreline (roads are 13 wide):
        // offsets +/-6 with width <= 12 keep every facade off the asphalt
        // and out of the camera's path behind a car.
        const ox = k === 0 ? -6 : 6;
        const oz = k === 0 ? -6 : 6;
        const w = 8 + rng() * 4, d = 8 + rng() * 4;
        const h = downtown ? 18 + rng() * 42 : 7 + rng() * 14;
        const px = cx + ox, pz = cz + oz;
        if (nearMission(px, pz, w, d)) continue;
        const tex = makeFacadeTexture(1000 + built * 7, pick(rng, FACADE_BASES));
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(px, h / 2, pz);
        b.castShadow = true; b.receiveShadow = true;
        scene.add(b);
        G.buildings.push({ minX: px - w / 2, maxX: px + w / 2, minZ: pz - d / 2, maxZ: pz + d / 2, h });
        built++;
        // Rooftop box + a few neon signs downtown.
        if (h > 20) {
          const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0x5a636e, roughness: 1 }));
          roof.position.set(px + w / 4, h + 1.2, pz - d / 4); scene.add(roof);
        }
        if (downtown && rng() > 0.55) {
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 2.5),
            new THREE.MeshBasicMaterial({ map: makeNeonTexture(pick(rng, ['HOTEL', 'BAR', '24H', 'PIER', 'CLUB', 'TACOS']), pick(rng, ['#ff4d8d', '#33e0ff', '#ffc44d'])) }),
          );
          sign.position.set(px, Math.min(h - 2, 14), pz + d / 2 + 0.1);
          scene.add(sign);
        }
      }
    }
  }
  G.buildingCount = built;

  // --- Palms: curved trunks + drooping fronds, along the beach road -------
  const trunkMat = new THREE.MeshStandardMaterial({ color: COLOURS.palmTrunk, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: COLOURS.palmLeaf, roughness: 0.9, side: THREE.DoubleSide });
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    const segs = 4;
    let px = 0, py = 0;
    const lean = (rng() - 0.5) * 0.5;
    for (let i = 0; i < segs; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.6 * s, 6), trunkMat);
      seg.position.set(px, py + 0.8 * s, 0);
      seg.rotation.z = lean * (i + 1) / segs;
      seg.castShadow = true;
      g.add(seg);
      px += Math.sin(lean * (i + 1) / segs) * 0.8 * s * -1;
      py += 1.55 * s;
    }
    // Drooping fronds: each leaf is a flat plane whose base sits at the
    // crown and whose tip falls outward-down, fanning around the trunk.
    const leafGeo = new THREE.PlaneGeometry(0.9 * s, 3.4 * s);
    leafGeo.rotateX(-Math.PI / 2);
    leafGeo.translate(0, 0, 1.7 * s);
    for (let i = 0; i < 8; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(px, py + 0.2 * s, 0);
      pivot.rotation.y = (i / 8) * Math.PI * 2 + rng() * 0.3;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = 0.5 + rng() * 0.25; // tip droops down
      leaf.castShadow = true;
      pivot.add(leaf);
      g.add(pivot);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    G.palms.push(g);
    return g;
  }
  for (let z = -150; z <= 150; z += 18) {
    palm(134, z + (rng() - 0.5) * 4, 0.9 + rng() * 0.4);
    palm(150.5, z + 9 + (rng() - 0.5) * 4, 0.8 + rng() * 0.4);
  }
  for (let i = 0; i < 14; i++) palm(-120 + rng() * 220, -120 + rng() * 240, 0.8 + rng() * 0.5);

  // --- Dunes: OFF the beach road only (x > 150 wet sand, or x < 134 park) --
  const duneMat = new THREE.MeshStandardMaterial({ color: 0xe8c48a, roughness: 1 });
  function dune(x, z, r) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), duneMat);
    d.scale.y = 0.35; d.position.set(x, 0, z);
    d.receiveShadow = true; scene.add(d);
    G.dunes.push({ x, z, r });
  }
  for (let i = 0; i < 16; i++) dune(154 + rng() * 6, -150 + i * 20 + rng() * 8, 2.5 + rng() * 3);
  for (let i = 0; i < 8; i++) dune(118 + rng() * 12, -140 + i * 38 + rng() * 10, 2 + rng() * 2.5);

  // --- Ferris wheel on the boardwalk ----------------------------------------
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(11, 0.5, 8, 32), new THREE.MeshStandardMaterial({ color: 0xff4d8d, roughness: 0.4, metalness: 0.4, emissive: 0x661133 }));
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 22, 6), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.5, metalness: 0.6 }));
    spoke.rotation.z = (i / 8) * Math.PI; wheel.add(spoke);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshStandardMaterial({ color: pick(rng, [0xff4d8d, 0x33e0ff, 0xffc44d, 0x7dd8a8]), roughness: 0.5 }));
    const a = (i / 8) * Math.PI * 2;
    cab.position.set(Math.cos(a) * 11, Math.sin(a) * 11, 0);
    wheel.add(cab);
  }
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 13, 8), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.6, roughness: 0.4 }));
  legL.position.set(-4, -6.5, 0); legL.rotation.z = 0.35; wheel.add(legL);
  const legR = legL.clone(); legR.position.x = 4; legR.rotation.z = -0.35; wheel.add(legR);
  wheel.position.set(150, 13, -30);
  scene.add(wheel); G.ferrisWheel = wheel;

  // --- Lighthouse at the north breakwater ------------------------------------
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 22, 12), new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 }));
  tower.position.y = 11; tower.castShadow = true; lh.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3, 12), new THREE.MeshStandardMaterial({ color: 0xff5268, roughness: 0.8 }));
  band.position.y = 15; lh.add(band);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  lamp.position.y = 23; lh.add(lamp);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3, 26, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2; beam.position.set(14, 23, 0); lh.add(beam);
  lh.position.set(158, 0, -150);
  scene.add(lh); G.lighthouse = lh; G.lighthouseBeam = beam;

  // --- Pier jutting into the ocean -------------------------------------------
  const pierMat = new THREE.MeshStandardMaterial({ map: makeBoardwalkTexture(), roughness: 1 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(46, 0.8, 7), pierMat);
  pier.position.set(180, 1.2, 40); pier.castShadow = true; pier.receiveShadow = true;
  scene.add(pier);
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }));
    post.position.set(162 + i * 7, 0.4, 36.5); scene.add(post);
    const post2 = post.clone(); post2.position.z = 43.5; scene.add(post2);
  }

  // Objective marker: glowing beacon column + ring.
  const marker = new THREE.Group();
  const beamM = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  beamM.position.y = 30; marker.add(beamM);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; marker.add(ring);
  marker.visible = false;
  scene.add(marker); G.marker = marker;

  // Collision helper: circle (x,z,r) vs building AABBs + world clamp.
  G.collides = (x, z, r) => {
    if (Math.abs(x) > WORLD.half || Math.abs(z) > WORLD.half) return true;
    for (const b of G.buildings) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  };
  /** Push a circle out of buildings; returns true if a hit happened. */
  G.resolveCollision = (pos, r) => {
    let hit = false;
    for (const b of G.buildings) {
      const cx = clamp(pos.x, b.minX, b.maxX);
      const cz = clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r;
        } else {
          pos.x = b.maxX + r; // centre inside: shove out east
        }
      }
    }
    pos.x = clamp(pos.x, -WORLD.half, WORLD.half);
    pos.z = clamp(pos.z, -WORLD.half, WORLD.half);
    return hit;
  };

  return { built };
}

/** Animate the ocean waves + ferris wheel + lighthouse beam, once per frame. */
export function updateWorld(G, t, dt) {
  // Sun + clouds ride with the camera (they are at infinity): only the
  // direction from G.sunDir shows, so they stay framed in every shot.
  if (G.sunGroup && G.camera) {
    const cp = G.camera.position;
    const d = G.sunDir;
    G.sunGroup.position.set(cp.x + d.x * 540, cp.y + d.y * 540, cp.z + d.z * 540);
    G.sunGroup.lookAt(cp);
    for (const c of G.clouds || []) {
      c.group.position.set(cp.x + c.dir.x * 520, cp.y + c.dir.y * 520, cp.z + c.dir.z * 520);
    }
  }
  if (G.oceanGeo) {
    // Waves move on a cheap schedule: displace vertices every frame, but
    // recompute normals only every 6th frame (software renderers choke
    // on a full normal pass per frame; the swell is small either way).
    const pos = G.oceanGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.08 + t * 1.2) * 0.5 + Math.cos(y * 0.06 + t * 0.8) * 0.4);
    }
    pos.needsUpdate = true;
    G._oceanTick = (G._oceanTick || 0) + 1;
    if (G._oceanTick % 6 === 0) G.oceanGeo.computeVertexNormals();
  }
  if (G.ferrisWheel) G.ferrisWheel.children[0].rotation.z += dt * 0.12;
  if (G.lighthouseBeam) G.lighthouseBeam.rotation.y = t * 0.5;
  if (G.marker && G.marker.visible) {
    G.marker.children[1].rotation.z += dt * 1.5;
    const s = 1 + Math.sin(t * 3) * 0.08;
    G.marker.children[1].scale.set(s, s, 1);
  }
}

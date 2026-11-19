// Shared constants and deterministic random helpers for SUNCOAST: HEATLINE.
// One clear job: every tunable number and every seedable random source lives
// here, so the world, the traffic and the ?shot= scenes all agree on it.

export const WORLD = {
  grid: 36, // city block pitch in world units
  half: 163, // playable clamp on x/z (city edge)
  coastX: 138, // where the beach starts (east edge)
  oceanX: 152, // where the water plane starts
  oceanFar: 320, // where the water plane ends
  roadHalf: 6.5, // half width of a road
  lane: 2.7, // traffic lane offset from a road centre
  beachRoadX: 142, // coastal road centre (asphalt) — dunes never sit on it
};

export const COLOURS = {
  skyTop: 0x2e3d75,
  skyMid: 0xe07a35,
  skyHorizon: 0xffc25e,
  fog: 0xe08a5e,
  ocean: 0x27617f,
  oceanDeep: 0x14384f,
  sand: 0xf0c98f,
  boardwalk: 0x9a6f4a,
  road: 0x3a3238,
  sidewalk: 0xa8907c,
  grass: 0x4d7a52,
  gold: 0xffd166,
  cyan: 0x66e5ff,
  palmTrunk: 0x7a5230,
  palmLeaf: 0x2f7a4a,
  neonPink: 0xff4d8d,
  neonCyan: 0x33e0ff,
  neonGold: 0xffc44d,
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** Time-of-day presets. `golden` is the shipped sunset look. */
export const TIME_PRESETS = {
  golden: {
    label: 'Golden Hour', sun: 0xffe1b2, sunIntensity: 2.4, sunPos: [-65, 110, 45],
    hemiSky: 0xd9f5ff, hemiGround: 0x38404a, hemiIntensity: 2.0, fillIntensity: 0.7,
    fog: 0xe08a5e, fogNear: 105, fogFar: 340, exposure: 1.14, bg: 0xd98a68, dome: 0xffffff,
    ocean: 0x27617f, oceanRoughness: 0.25, oceanMetalness: 0.35,
  },
  noon: {
    label: 'Midday', sun: 0xfff3d6, sunIntensity: 3.0, sunPos: [-20, 160, 30],
    hemiSky: 0xbfe8ff, hemiGround: 0x4a5248, hemiIntensity: 2.2, fillIntensity: 0.9,
    fog: 0xa8c8d4, fogNear: 130, fogFar: 400, exposure: 1.0, bg: 0x8fc3d9, dome: 0xffffff,
    ocean: 0x2a6d8a, oceanRoughness: 0.18, oceanMetalness: 0.3,
  },
  dusk: {
    label: 'Dusk', sun: 0xff8a4d, sunIntensity: 1.9, sunPos: [-110, 42, 20],
    hemiSky: 0x8a6a9e, hemiGround: 0x2e2438, hemiIntensity: 1.3, fillIntensity: 0.45,
    fog: 0xcf5a6a, fogNear: 80, fogFar: 280, exposure: 1.16, bg: 0x5a3a5e, dome: 0xc9a0b8,
    ocean: 0x1d4258, oceanRoughness: 0.12, oceanMetalness: 0.6,
  },
  night: {
    label: 'Night', sun: 0x9db8ff, sunIntensity: 0.55, sunPos: [40, 120, -60],
    hemiSky: 0x2a3550, hemiGround: 0x0e1218, hemiIntensity: 0.8, fillIntensity: 0.3,
    fog: 0x1a2436, fogNear: 60, fogFar: 240, exposure: 1.05, bg: 0x0b1626, dome: 0x2a3550,
    ocean: 0x0e2838, oceanRoughness: 0.15, oceanMetalness: 0.55,
  },
};

/** mulberry32: small deterministic PRNG. Same seed -> same stream, every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic pick from an array using a seeded rng. */
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

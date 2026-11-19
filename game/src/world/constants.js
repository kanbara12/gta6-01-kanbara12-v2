// World constants: districts, street names and zone layout.
// One clear job: the named geography the HUD, minimap and missions share —
// district names, street names and the fixed points of the city.

export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: -130, z0: -130, x1: -20, z1: 20 },
  { name: 'PALM ROW', x0: -20, z0: -130, x1: 60, z1: 20 },
  { name: 'MARINA', x0: 60, z0: -20, x1: 138, z1: 130 },
  { name: 'OLD PORT', x0: -130, z0: 20, x1: -20, z1: 130 },
  { name: 'BOARDWALK', x0: 138, z0: -130, x1: 168, z1: 130 },
  { name: 'NORTH BEACH', x0: 60, z0: -165, x1: 168, z1: -130 },
];

export const STREETS_X = [
  { x: -108, name: 'Harbor Ave' }, { x: -72, name: 'Coral St' },
  { x: -36, name: 'Palm Blvd' }, { x: 0, name: 'Sunset Ave' },
  { x: 36, name: 'Marina Dr' }, { x: 72, name: 'Bay St' },
  { x: 108, name: 'Pier Rd' }, { x: 142, name: 'Shore Rd' },
];
export const STREETS_Z = [
  { z: -108, name: 'Northgate St' }, { z: -72, name: 'Juniper Ln' },
  { z: -36, name: 'Canal St' }, { z: 0, name: 'Meridian Ave' },
  { z: 36, name: 'Tide St' }, { z: 72, name: 'Lagoon Blvd' },
  { z: 108, name: 'Southgate St' }, { z: 144, name: 'Dune Way' },
];

/** District name for a world position (minimap + HUD street line). */
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'SUNCOAST';
}

/** Nearest named street for a world position. */
export function streetAt(x, z) {
  let best = null; let bestD = 1e9;
  for (const s of STREETS_X) { const d = Math.abs(x - s.x); if (d < bestD) { bestD = d; best = s.name; } }
  for (const s of STREETS_Z) { const d = Math.abs(z - s.z); if (d < bestD) { bestD = d; best = s.name; } }
  return best || 'Sunset Ave';
}

export const GARAGE_POS = { x: 14, z: 84 };
export const SAFEHOUSE_POS = { x: -48, z: 48 };
export const CREW_YARD_POS = { x: 72, z: -72 };
export const MARINA_POS = { x: 132, z: 96 };
export const LIGHTHOUSE_POS = { x: 148, z: -142 };
export const OVERLOOK_POS = { x: -72, z: -72 };

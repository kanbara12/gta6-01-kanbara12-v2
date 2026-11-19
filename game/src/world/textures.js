// Procedural canvas textures for SUNCOAST: HEATLINE.
// One clear job: every texture in the game is painted here on a 2D canvas
// at load time — no image files, no network, fully offline.

import * as THREE from 'three';
import { mulberry32 } from '../core/config.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Warm asphalt with a centre line and worn lane dashes. */
export function makeRoadTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#3a3238'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = '#d8b25a'; g.fillRect(w / 2 - 2, 0, 4, h);
    g.fillStyle = '#e8e8e8';
    g.fillRect(6, 0, 3, 40); g.fillRect(6, 70, 3, 40);
    g.fillRect(w - 9, 0, 3, 40); g.fillRect(w - 9, 70, 3, 40);
  });
}

/** Pale sand with speckle and faint ripple bands. */
export function makeSandTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#f0c98f'; g.fillRect(0, 0, w, h);
    const rng = mulberry32(7);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rng() > 0.5 ? 'rgba(190,150,90,0.35)' : 'rgba(255,235,190,0.4)';
      g.fillRect(rng() * w, rng() * h, 2, 1);
    }
    g.strokeStyle = 'rgba(180,140,80,0.25)'; g.lineWidth = 2;
    for (let y = 10; y < h; y += 22) {
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.2) * 3);
      g.stroke();
    }
  });
}

/** Building facade: warm plaster, lit windows in a grid, ground-floor shops. */
export function makeFacadeTexture(seed, base, litRatio = 0.55) {
  const rng = mulberry32(seed);
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2);
    const cols = 6, rows = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng() < litRatio;
        g.fillStyle = lit ? (rng() > 0.7 ? '#ffd9a0' : '#ffeec4') : '#2c3542';
        g.fillRect(14 + c * 40, 12 + r * 30, 24, 18);
      }
    }
    // Ground floor: shopfront band.
    g.fillStyle = '#1d2733'; g.fillRect(0, h - 34, w, 34);
    g.fillStyle = rng() > 0.5 ? '#ff4d8d' : '#33e0ff';
    g.fillRect(10, h - 30, 60, 8);
    g.fillStyle = '#e8f4ff'; g.fillRect(80, h - 28, 150, 20);
  });
}

/** Boardwalk planks: long warm boards with gaps and nail dots. */
export function makeBoardwalkTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#9a6f4a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = (y / 16) % 2 === 0 ? '#a87a52' : '#8f6540';
      g.fillRect(0, y, w, 14);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 14, w, 2);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(8, y + 6, 2, 2); g.fillRect(w - 10, y + 6, 2, 2);
    }
  });
}

/** Neon sign strip: glowing letters on a dark band. */
export function makeNeonTexture(text, color) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, w, h);
    g.font = 'bold 34px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 18;
    g.fillStyle = color; g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 0; g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2);
  });
}

// Pause menu + statistics for SUNCOAST: HEATLINE.
// One clear job: pause/resume, the stats screen and the settings toggles
// (quality, mute, minimap) — plus save/load buttons.

import { applyQuality, saveSettings } from '../core/settings.js';

export function openPause(G) {
  G.paused = true;
  const el = document.getElementById('pauseCard');
  if (el) el.classList.remove('hidden');
  updatePauseStats(G);
}

export function closePause(G) {
  G.paused = false;
  const el = document.getElementById('pauseCard');
  if (el) el.classList.add('hidden');
}

export function togglePause(G) {
  if (G.paused) closePause(G); else openPause(G);
}

export function updatePauseStats(G) {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('pauseCash', `$${Math.floor(G.money).toLocaleString('en-US')}`);
  set('pauseJobs', `${G.jobsCompleted || 0} story loops • stage ${(G.missionIndex || 0) + 1}/8`);
  set('pauseKills', `${G.kills || 0} targets down this stage`);
  set('pauseWanted', `${G.wanted} stars • heat ${Math.round(G.heat || 0)}`);
  set('pauseTime', `DAY ${G.day || 1} • ${G.radioStationName || ''}`);
}

/** Wire the pause menu buttons once at boot. */
export function wirePause(G) {
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('resumeBtn', () => closePause(G));
  bind('saveBtn', () => { G.saveGame(); updatePauseStats(G); });
  bind('loadBtn', () => { G.loadGame(); updatePauseStats(G); });
  bind('muteBtn', () => {
    G.settings.muted = !G.settings.muted;
    saveSettings(G.settings);
    if (typeof G.setMuted === 'function') G.setMuted(G.settings.muted);
    updatePauseStats(G);
  });
  bind('qualityBtn', () => {
    const order = ['low', 'medium', 'high'];
    const next = order[(order.indexOf(G.quality) + 1) % order.length];
    G.settings.quality = next;
    saveSettings(G.settings);
    applyQuality(G, next);
    const el = document.getElementById('qualityBtn');
    if (el) el.textContent = `QUALITY: ${next.toUpperCase()}`;
  });
  bind('restartBtn', () => {
    closePause(G);
    G.newGame();
  });
}

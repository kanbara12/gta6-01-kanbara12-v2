// Quality + settings for SUNCOAST: HEATLINE.
// One clear job: the quality presets and the persisted settings (volume,
// quality, invert) — everything the pause menu toggles lives here.

export const QUALITY_PRESETS = {
  low: { pixelRatio: 1, shadows: false, traffic: 10, peds: 10, vignette: false },
  medium: { pixelRatio: 1, shadows: true, traffic: 14, peds: 16, vignette: true },
  high: { pixelRatio: Math.min(window.devicePixelRatio || 1, 1.75), shadows: true, traffic: 18, peds: 20, vignette: true },
};

export function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('suncoast-settings') || '{}'); } catch { saved = {}; }
  return {
    quality: saved.quality || 'high',
    musicVolume: typeof saved.musicVolume === 'number' ? saved.musicVolume : 0.6,
    sfxVolume: typeof saved.sfxVolume === 'number' ? saved.sfxVolume : 0.8,
    muted: !!saved.muted,
    showMinimap: saved.showMinimap !== false,
  };
}

export function saveSettings(s) {
  try { localStorage.setItem('suncoast-settings', JSON.stringify(s)); } catch { /* storage unavailable */ }
}

/** Apply a quality preset to the renderer + body classes. Returns the preset. */
export function applyQuality(G, name) {
  const preset = QUALITY_PRESETS[name] || QUALITY_PRESETS.high;
  G.quality = name;
  if (G.renderer) {
    G.renderer.setPixelRatio(preset.pixelRatio);
    G.renderer.shadowMap.enabled = preset.shadows;
  }
  document.body.classList.toggle('vignette-on', !!preset.vignette);
  return preset;
}

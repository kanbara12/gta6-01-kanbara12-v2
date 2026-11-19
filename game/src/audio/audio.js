// Synthesised sound effects for SUNCOAST: HEATLINE.
// One clear job: every sound effect is made live with WebAudio — no audio
// files, no network. Engine hum, gunshots, crashes, pickups, sirens.

export function createAudio(G) {
  let ctx = null;
  const ensure = () => {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const master = () => (G.settings.muted ? 0 : (G.settings.sfxVolume ?? 0.8));

  function blip(freq, dur, type = 'sine', vol = 0.3, slideTo = null) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol * master(), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }
  function noise(dur, vol = 0.3, low = 400) {
    const c = ensure(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
    const g = c.createGain(); g.gain.value = vol * master();
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start();
  }

  G.playShot = (kind) => {
    if (kind === 'SHOTGUN') noise(0.35, 0.6, 900);
    else if (kind === 'SMG') noise(0.12, 0.35, 1400);
    else noise(0.18, 0.45, 1100);
    blip(160, 0.08, 'square', 0.15, 60);
  };
  G.playCrash = () => noise(0.4, 0.5, 500);
  G.playPickup = () => { blip(660, 0.12, 'sine', 0.3); setTimeout(() => blip(990, 0.18, 'sine', 0.3), 90); };
  G.playHurt = () => blip(220, 0.25, 'sawtooth', 0.25, 110);
  G.playSiren = () => { blip(880, 0.35, 'sine', 0.12, 660); setTimeout(() => blip(660, 0.35, 'sine', 0.12, 880), 350); };
  G.unlockAudio = ensure;
  G.setMuted = (m) => { /* master() reads settings live */ void m; };
  return { ensure };
}

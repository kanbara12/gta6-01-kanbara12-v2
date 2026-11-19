// Original radio for SUNCOAST: HEATLINE.
// One clear job: three original stations, all synthesised live with
// WebAudio — no recordings, no licensed music. R cycles the station.
//   SHORELINE 96.7 — warm synthwave chords
//   PIER 102.5     — driving bass + hats
//   DUNE 89.9      — sparse late-night keys

const STATIONS = [
  {
    name: 'SHORELINE 96.7', track: 'Golden Static — Coastline Drive',
    chords: [[220, 277, 330], [196, 247, 294], [175, 220, 262], [247, 294, 370]],
    bpm: 96, bass: 55, wave: 'sawtooth',
  },
  {
    name: 'PIER 102.5', track: 'Neon Tide — Boardwalk Nights',
    chords: [[110, 165, 220], [98, 147, 196], [123, 185, 247], [131, 196, 262]],
    bpm: 118, bass: 49, wave: 'square',
  },
  {
    name: 'DUNE 89.9', track: 'Low Light — After Hours',
    chords: [[262, 330, 392], [233, 294, 349], [208, 262, 311], [175, 220, 262]],
    bpm: 72, bass: 65, wave: 'triangle',
  },
];

export function createRadio(G) {
  let ctx = null;
  let timer = null;
  let step = 0;
  G.radioIndex = 0;
  G.radioStationName = STATIONS[0].name;
  G.radioTrack = STATIONS[0].track;

  function ensureCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function note(freq, when, dur, type, vol) {
    const c = ensureCtx(); if (!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(c.destination);
    o.start(when); o.stop(when + dur + 0.05);
  }
  function tick() {
    const st = STATIONS[G.radioIndex];
    const c = ensureCtx();
    if (!c || G.settings.muted) { step++; return; }
    const beat = 60 / st.bpm / 2;
    const now = c.currentTime + 0.05;
    const vol = 0.05 * (G.settings.musicVolume ?? 0.6);
    const chord = st.chords[Math.floor(step / 4) % st.chords.length];
    if (step % 4 === 0) {
      for (const f of chord) note(f, now, beat * 3.5, st.wave, vol);
      note(st.bass, now, beat * 2, 'sine', vol * 1.4);
    }
    if (step % 2 === 1) note(chord[2] * 2, now, beat * 0.8, 'sine', vol * 0.6);
    step++;
  }
  G.startRadio = () => {
    ensureCtx();
    if (timer) return;
    timer = setInterval(tick, 240);
  };
  G.cycleRadio = () => {
    G.radioIndex = (G.radioIndex + 1) % STATIONS.length;
    G.radioStationName = STATIONS[G.radioIndex].name;
    G.radioTrack = STATIONS[G.radioIndex].track;
    step = 0;
    G.showToast(`RADIO • ${STATIONS[G.radioIndex].name}`);
  };
  G.radioStationCount = STATIONS.length;
  return { stations: STATIONS };
}

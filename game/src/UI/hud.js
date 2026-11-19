// HUD for SUNCOAST: HEATLINE.
// One clear job: every on-screen panel — brand, stats, mission, police,
// weapon slots, minimap, speedometer, radio, toasts — updated once a frame.
// All panels are OPAQUE (no see-through text over the 3D scene).

import { districtAt, streetAt } from '../world/constants.js';
import { getMissionProgress } from '../missions/missions.js';
import { policeSnapshot } from '../AI/police.js';

let minimapCtx = null;

export function initHud(G) {
  const mm = document.getElementById('minimap');
  if (mm) minimapCtx = mm.getContext('2d');
}

/** Update every HUD element from live state. Called once per frame. */
export function updateHud(G) {
  const $ = (id) => document.getElementById(id);
  const set = (id, text) => { const el = $(id); if (el && el.textContent !== text) el.textContent = text; };
  set('cash', `$${Math.floor(G.money).toLocaleString('en-US')}`);
  // Wanted stars.
  const stars = '★'.repeat(G.wanted) + '☆'.repeat(Math.max(0, 5 - G.wanted));
  set('wanted', stars);
  const wantedEl = $('wanted');
  if (wantedEl) wantedEl.classList.toggle('hot', G.wanted >= 3);
  // Clock: DAY + in-game time (1 game hour per 2 real minutes).
  const totalMin = Math.floor(G.clockMin || 0);
  const hh = String(17 + Math.floor(totalMin / 60)).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  set('clock', `DAY ${G.day || 1} • ${hh}:${mm}`);
  set('health', `HEALTH ${Math.ceil(G.health)}`);
  set('armour', `ARMOUR ${Math.ceil(G.armour)}`);
  set('rep', `REP ${G.rep || 0}`);
  const p = G.actorPosition();
  set('district', `${districtAt(p.x, p.z)} • ${streetAt(p.x, p.z)}`);
  // Mission panel.
  const prog = getMissionProgress(G);
  set('missionTitle', prog.title);
  set('missionStage', `STAGE ${prog.stageLabel}`);
  set('objective', prog.objective);
  set('missionTimer', `${String(Math.floor(prog.elapsed / 60)).padStart(2, '0')}:${String(prog.elapsed % 60).padStart(2, '0')} / ${prog.parTime}s`);
  set('stageLabel', prog.killsNeeded ? `KILLS ${prog.killsDone}/${prog.killsNeeded}` : `REWARD $${prog.reward.toLocaleString('en-US')}`);
  set('nextMission', `NEXT: ${prog.distanceToMarker}m to marker`);
  const fill = $('stageFill');
  if (fill) fill.style.width = `${Math.round(((prog.stage + 1) / 8) * 100)}%`;
  // Police panel: named units + distance + state.
  const panel = $('policePanel');
  const units = policeSnapshot(G);
  if (panel) {
    if (units.length === 0) {
      panel.classList.add('hidden');
    } else {
      panel.classList.remove('hidden');
      const rows = $('policeRows');
      if (rows) {
        rows.innerHTML = units.map((u) => (
          `<div class="pp-row"><span class="pp-name">${u.callsign}</span><span>${u.distance}m</span><span class="pp-state">${u.state}</span></div>`
        )).join('');
      }
    }
  }
  const pill = $('policePill');
  if (pill) {
    pill.textContent = G.policeSight ? '● EYES ON YOU' : (units.some((u) => u.state === 'SEARCH') ? '◐ SEARCHING' : '○ QUIET');
    pill.className = G.policeSight ? 'sight' : (units.some((u) => u.state === 'SEARCH') ? 'searching' : '');
    pill.id = 'policePill';
  }
  // Weapon slots: 4 opaque slots, selected one highlighted.
  const slots = $('slots');
  if (slots) {
    slots.innerHTML = (G.weapons || []).map((w, i) => (
      `<div class="slot${i === G.weaponIndex ? ' sel' : ''}"><b>${i + 1}</b> ${w.key}<span>${w.ammo === Infinity ? '∞' : w.ammo}</span></div>`
    )).join('');
  }
  // Speedometer (in a car) or on-foot state.
  if (G.currentCar) {
    const kmh = Math.round(Math.abs(G.currentCar.userData.speed || 0) * 3.6);
    const gear = kmh < 1 ? 'N' : kmh < 40 ? '1' : kmh < 80 ? '2' : kmh < 120 ? '3' : '4';
    set('speed', `${kmh}`);
    set('gear', `GEAR ${gear}`);
    set('condition', `CONDITION ${Math.round(G.currentCar.userData.condition ?? 100)}%`);
  } else {
    set('speed', '—');
    set('gear', 'ON FOOT');
    set('condition', `CONDITION ${Math.round(G.playerCar?.userData.condition ?? 100)}%`);
  }
  // Radio panel.
  set('radioStation', G.radioStationName || 'SHORELINE 96.7');
  set('radioTrack', G.radioTrack || '—');
  drawMinimap(G);
}

/** Round minimap: roads, buildings, marker, police, player arrow. */
export function drawMinimap(G) {
  if (!minimapCtx) return;
  const c = minimapCtx;
  const S = 150;
  const scale = S / 360;
  c.clearRect(0, 0, S, S);
  c.save();
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#0d1a24'; c.fillRect(0, 0, S, S);
  // Ocean + sand.
  c.fillStyle = '#27617f'; c.fillRect((152 + 180) * scale, 0, S, S);
  c.fillStyle = '#f0c98f'; c.fillRect((138 + 180) * scale, 0, 20 * scale, S);
  // Roads.
  c.strokeStyle = '#3a3238'; c.lineWidth = 4;
  for (const a of [-108, -72, -36, 0, 36, 72, 108]) {
    c.beginPath(); c.moveTo((a + 180) * scale, 0); c.lineTo((a + 180) * scale, S); c.stroke();
    c.beginPath(); c.moveTo(0, (a + 180) * scale); c.lineTo(S, (a + 180) * scale); c.stroke();
  }
  // Buildings.
  c.fillStyle = '#5a6a7a';
  for (const b of G.buildings || []) {
    c.fillRect((b.minX + 180) * scale, (b.minZ + 180) * scale, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
  }
  // Marker.
  const mp = G.markerTarget || null;
  if (G.marker && G.marker.visible && mp) {
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc((mp.x + 180) * scale, (mp.z + 180) * scale, 5, 0, Math.PI * 2); c.fill();
  }
  // Police dots.
  c.fillStyle = '#ff5268';
  for (const pc of G.police || []) {
    c.beginPath(); c.arc((pc.position.x + 180) * scale, (pc.position.z + 180) * scale, 3, 0, Math.PI * 2); c.fill();
  }
  // Player arrow.
  const p = G.actorPosition();
  c.save();
  c.translate((p.x + 180) * scale, (p.z + 180) * scale);
  c.rotate(G.currentCar ? G.currentCar.rotation.y : G.player.rotation.y);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
  c.restore();
  c.restore();
  // North tick.
  c.fillStyle = '#eef8ff'; c.font = 'bold 11px Arial'; c.textAlign = 'center';
  c.fillText('N', S / 2, 12);
}

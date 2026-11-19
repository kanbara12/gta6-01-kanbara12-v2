// Save / load for SUNCOAST: HEATLINE.
// One clear job: persist the run to localStorage — money, stage, health,
// wanted, position, day, clock, car condition — and restore it.

const KEY = 'suncoast-heatline-save-v5';

export function saveGame(G) {
  const p = G.actorPosition();
  const data = {
    version: 5,
    money: G.money, missionIndex: G.missionIndex, jobsCompleted: G.jobsCompleted || 0,
    health: G.health, armour: G.armour, wanted: G.wanted, heat: G.heat,
    rep: G.rep || 0, day: G.day || 1, clockMin: G.clockMin || 0,
    x: p.x, z: p.z, inCar: !!G.currentCar,
    carCondition: G.playerCar ? G.playerCar.userData.condition : 100,
    kills: G.kills || 0,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    G.showToast('GAME SAVED');
    return true;
  } catch {
    G.showToast('SAVE FAILED • STORAGE UNAVAILABLE');
    return false;
  }
}

export function loadGame(G) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  if (!data || data.version !== 5) {
    G.showToast('NO SAVE FOUND');
    return false;
  }
  G.money = data.money; G.jobsCompleted = data.jobsCompleted;
  G.health = data.health; G.armour = data.armour;
  G.wanted = data.wanted; G.heat = data.heat;
  G.rep = data.rep; G.day = data.day; G.clockMin = data.clockMin;
  G.kills = data.kills;
  G.gameStarted = true;
  G.gameOver = false;
  const startCard = document.getElementById('startCard');
  if (startCard) startCard.classList.add('hidden');
  if (data.inCar) {
    G.currentCar = G.playerCar;
    G.player.visible = false;
    G.playerCar.position.set(data.x, 0, data.z);
    if (G.playerCar.userData) G.playerCar.userData.condition = data.carCondition;
  } else {
    G.currentCar = null;
    G.player.visible = true;
    G.player.position.set(data.x, 0, data.z);
  }
  // Re-brief the loaded stage so the dialog + marker come back.
  if (typeof G.onStageStart === 'function') G.onStageStart(data.missionIndex);
  G.showToast('SAVE LOADED');
  return true;
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

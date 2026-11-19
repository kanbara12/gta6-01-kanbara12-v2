// Crew dialog for SUNCOAST: HEATLINE.
// One clear job: the dialog box — portrait, name, role and the crew line —
// shown on stage start and dismissed with a click or after a few seconds.

let hideTimer = null;

/** Show a crew line: {name, role, portrait, text}. */
export function showDialog(d) {
  const box = document.getElementById('dialog');
  if (!box) return;
  const portrait = document.getElementById('dialogPortrait');
  const name = document.getElementById('dialogName');
  const role = document.getElementById('dialogRole');
  const text = document.getElementById('dialogText');
  if (portrait) {
    portrait.textContent = (d.name || '?')[0];
    portrait.className = `portrait ${d.portrait || ''}`;
  }
  if (name) name.textContent = d.name || '';
  if (role) role.textContent = d.role || '';
  if (text) text.textContent = d.text || '';
  box.classList.remove('hidden');
  if (hideTimer) clearTimeout(hideTimer);
  // In shot mode the dialog stays up: a screenshot taken at any settle
  // time must still show the crew line.
  if (window.__game && window.__game.shotMode) { hideTimer = null; return; }
  hideTimer = setTimeout(() => box.classList.add('hidden'), 9000);
  box.onclick = () => box.classList.add('hidden');
}

export function hideDialog() {
  const box = document.getElementById('dialog');
  if (box) box.classList.add('hidden');
  if (hideTimer) clearTimeout(hideTimer);
}

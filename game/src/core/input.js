// Keyboard + mouse input for SUNCOAST: HEATLINE.
// One clear job: own every key/mouse binding and expose a clean, polled
// state — no other file touches a DOM key event directly.

export function createInput() {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered: consumed once per frame
  let mouseDown = false;
  let mouseClicked = false;
  let dragDX = 0;
  let dragging = false;
  let lastX = 0;

  const input = {
    keys, pressed, mouseDown, mouseClicked,
    get dragDX() { return dragDX; },
    consumeDrag() { const d = dragDX; dragDX = 0; return d; },
    get dragging() { return dragging; },
    axis() {
      // -1..1 forward/back, -1..1 left/right from WASD + arrows.
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
        - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { f, s };
    },
    wasPressed(code) { return pressed.has(code); },
    endFrame() { pressed.clear(); mouseClicked = false; },
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; dragging = false; });
  window.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest && e.target.closest('button, a, input')) return;
    mouseDown = true; mouseClicked = true; dragging = true; lastX = e.clientX;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (dragging) { dragDX += e.clientX - lastX; lastX = e.clientX; }
  });
  // Keep the polled flags live on the object.
  Object.defineProperty(input, 'mouseDown', { get: () => mouseDown });
  Object.defineProperty(input, 'mouseClicked', { get: () => mouseClicked });
  return input;
}

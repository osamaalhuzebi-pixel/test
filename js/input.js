// Tablet-first controls: a joystick on the left, swipe to look on the right,
// and Fire / Jump / Switch buttons. Keyboard and mouse work on computers.
export class Input {
  constructor(canvas, touchRoot) {
    this.canvas = canvas;
    this.root = touchRoot;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.touchMove = { x: 0, y: 0 };
    this.lookX = 0;
    this.lookY = 0;
    this.touchFiring = false;
    this.mouseFiring = false;
    this.queued = { jump: false, swap: false, pause: false };
    this.keys = new Set();
    this.pointers = new Map();
    this.listeners = [];
    this.joyBase = touchRoot.querySelector('#joy-base');
    this.joyKnob = touchRoot.querySelector('#joy-knob');
    this.joyHome = null;

    this.on(window, 'keydown', (e) => this.onKey(e, true));
    this.on(window, 'keyup', (e) => this.onKey(e, false));
    this.on(window, 'blur', () => { this.keys.clear(); this.mouseFiring = false; });

    this.on(canvas, 'mousedown', (e) => {
      if (e.button !== 0) return;
      if (!this.locked) canvas.requestPointerLock?.();
      else this.mouseFiring = true;
    });
    this.on(window, 'mouseup', (e) => { if (e.button === 0) this.mouseFiring = false; });
    this.on(document, 'mousemove', (e) => {
      if (!this.locked) return;
      this.lookX += e.movementX * 0.45;
      this.lookY += e.movementY * 0.45;
    });
    this.on(document, 'pointerlockchange', () => {
      if (!this.locked) {
        this.mouseFiring = false;
        if (!this.ignoreUnlock) this.queued.pause = true;
      }
    });

    this.on(touchRoot, 'pointerdown', (e) => this.onDown(e));
    this.on(touchRoot, 'pointermove', (e) => this.onMove(e));
    this.on(touchRoot, 'pointerup', (e) => this.onUp(e));
    this.on(touchRoot, 'pointercancel', (e) => this.onUp(e));
    this.on(touchRoot, 'contextmenu', (e) => e.preventDefault());
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  get firing() {
    return this.touchFiring || this.mouseFiring;
  }

  on(target, type, fn) {
    target.addEventListener(type, fn, { passive: false });
    this.listeners.push([target, type, fn]);
  }

  dispose() {
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
    this.listeners = [];
    this.releasePointerLock();
    this.resetJoystick();
  }

  releasePointerLock() {
    this.ignoreUnlock = true;
    if (this.locked) document.exitPointerLock?.();
    setTimeout(() => { this.ignoreUnlock = false; }, 200);
  }

  requestPointerLock() {
    if (!this.isTouch) this.canvas.requestPointerLock?.();
  }

  onKey(e, down) {
    const k = e.code;
    if (down) {
      if (k === 'Space') this.queued.jump = true;
      if (k === 'KeyQ' || k === 'KeyE' || k === 'Digit1' || k === 'Digit2') this.queued.swap = true;
      if (k === 'KeyP' || k === 'Escape') this.queued.pause = true;
      this.keys.add(k);
    } else {
      this.keys.delete(k);
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
  }

  // Movement as x (right) and y (forward), each between -1 and 1.
  getMove() {
    const k = this.keys;
    const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (x || y) {
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    }
    return this.touchMove;
  }

  consumeLook() {
    const out = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return out;
  }

  consume(name) {
    const v = this.queued[name];
    this.queued[name] = false;
    return v;
  }

  onDown(e) {
    e.preventDefault();
    try { this.root.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const btn = e.target.closest?.('[data-action]');
    if (btn) {
      const action = btn.dataset.action;
      btn.classList.add('pressed');
      if (action === 'fire') this.touchFiring = true;
      else this.queued[action] = true;
      this.pointers.set(e.pointerId, { type: action, btn, x: e.clientX, y: e.clientY });
      return;
    }
    if (e.clientX < window.innerWidth * 0.42) {
      this.pointers.set(e.pointerId, { type: 'joy', ox: e.clientX, oy: e.clientY });
      this.placeJoystick(e.clientX, e.clientY);
    } else {
      this.pointers.set(e.pointerId, { type: 'look', x: e.clientX, y: e.clientY });
    }
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    if (p.type === 'joy') {
      const max = 55;
      let dx = e.clientX - p.ox;
      let dy = e.clientY - p.oy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx *= max / len;
        dy *= max / len;
      }
      this.touchMove = { x: dx / max, y: -dy / max };
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (p.type === 'look' || p.type === 'fire') {
      // Dragging on the Fire button also aims, like in Fortnite.
      this.lookX += e.clientX - p.x;
      this.lookY += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
    }
  }

  onUp(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (p.btn) p.btn.classList.remove('pressed');
    if (p.type === 'joy') this.resetJoystick();
    if (p.type === 'fire') {
      this.touchFiring = [...this.pointers.values()].some((q) => q.type === 'fire');
    }
  }

  placeJoystick(x, y) {
    if (!this.joyBase) return;
    this.joyBase.style.left = `${x}px`;
    this.joyBase.style.top = `${y}px`;
    this.joyBase.style.bottom = 'auto';
    this.joyBase.classList.add('active');
  }

  resetJoystick() {
    this.touchMove = { x: 0, y: 0 };
    if (!this.joyBase) return;
    this.joyBase.style.left = '';
    this.joyBase.style.top = '';
    this.joyBase.style.bottom = '';
    this.joyBase.classList.remove('active');
    this.joyKnob.style.transform = '';
  }
}

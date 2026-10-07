// On-screen info during a match: timer, score, health, weapon and messages.
const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.timer = $('timer');
    this.scoreBlue = $('score-blue');
    this.scoreRed = $('score-red');
    this.healthFill = $('health-fill');
    this.healthText = $('health-text');
    this.weaponIcon = $('weapon-icon');
    this.weaponName = $('weapon-name');
    this.swapBtn = $('btn-swap');
    this.feedEl = $('feed');
    this.centerTitle = $('center-title');
    this.centerSub = $('center-sub');
    this.hitmarker = $('hitmarker');
    this.vignette = $('damage-vignette');
    this.toastEl = $('toast');
    this.lastSecond = -1;
    this.lastHealth = -1;
  }

  show(isTouch) {
    this.root.classList.remove('hidden');
    this.root.classList.toggle('touch', isTouch);
    $('touch-ui').classList.toggle('hidden', !isTouch);
    this.feedEl.innerHTML = '';
    this.message('');
  }

  hide() {
    this.root.classList.add('hidden');
    $('touch-ui').classList.add('hidden');
  }

  setTimer(seconds) {
    const s = Math.ceil(seconds);
    if (s === this.lastSecond) return;
    this.lastSecond = s;
    this.timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.timer.classList.toggle('urgent', s <= 30);
  }

  setScore(blue, red) {
    this.scoreBlue.textContent = blue;
    this.scoreRed.textContent = red;
  }

  setHealth(value) {
    const v = Math.max(0, Math.round(value));
    if (v === this.lastHealth) return;
    this.lastHealth = v;
    this.healthFill.style.width = `${v}%`;
    this.healthFill.classList.toggle('low', v <= 35);
    this.healthText.textContent = v;
  }

  setWeapon(weapon, other) {
    this.weaponIcon.textContent = weapon.icon;
    this.weaponName.textContent = weapon.name;
    if (this.swapBtn) this.swapBtn.textContent = other.icon;
  }

  feed(html) {
    const row = document.createElement('div');
    row.className = 'feed-row';
    row.innerHTML = html;
    this.feedEl.prepend(row);
    while (this.feedEl.children.length > 4) this.feedEl.lastChild.remove();
    setTimeout(() => row.remove(), 4500);
  }

  message(title, sub = '') {
    this.centerTitle.textContent = title;
    this.centerSub.textContent = sub;
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  hit() {
    this.hitmarker.classList.remove('show');
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add('show');
  }

  hurt() {
    this.vignette.classList.remove('show');
    void this.vignette.offsetWidth;
    this.vignette.classList.add('show');
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

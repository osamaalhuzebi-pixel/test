// Screen flow: login -> menu -> match -> results -> menu.
import * as THREE from '../vendor/three.module.js';
import {
  loadProfile, saveProfile, validateNickname, validateBirthday, randomNickname,
  isBirthdayToday, levelOf, botDifficulty,
} from './profile.js';
import { MenuScene } from './menu.js';
import { Game } from './game.js';
import { sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const screens = ['screen-login', 'screen-menu', 'screen-pause', 'screen-end'];

const canvas = $('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

let profile = loadProfile();
let view = null;
let game = null;

function show(...ids) {
  for (const id of screens) $(id).classList.toggle('hidden', !ids.includes(id));
}

// Takes a factory so the old view is cleaned up before the new one starts.
function setView(make) {
  view?.dispose();
  view = null;
  game = null;
  view = make();
  game = view instanceof Game ? view : null;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  view?.resize(w, h);
}
window.addEventListener('resize', resize);

// ---- login ---------------------------------------------------------------

function goLogin() {
  setView(() => new MenuScene());
  show('screen-login');
  $('nickname').value = profile?.nickname ?? '';
  $('birthday').value = profile?.birthday ?? '';
  $('birthday').max = new Date().toISOString().slice(0, 10);
  $('login-error').textContent = '';
}

$('btn-random-name').addEventListener('click', () => {
  let name = randomNickname();
  while (validateNickname(name)) name = randomNickname();
  $('nickname').value = name;
  $('login-error').textContent = '';
});

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nickname = $('nickname').value.trim();
  const birthday = $('birthday').value;
  const error = validateNickname(nickname) || validateBirthday(birthday);
  $('login-error').textContent = error;
  if (error) return;
  profile = { coins: 0, tbs: 0, matches: 0, totalTags: 0, ...profile, nickname, birthday };
  saveProfile(profile);
  goMenu();
});

// ---- menu ------------------------------------------------------------------

function goMenu() {
  if (!(view instanceof MenuScene)) setView(() => new MenuScene());
  show('screen-menu');
  $('menu-nickname').textContent = profile.nickname;
  $('menu-level').textContent = `LVL ${levelOf(profile)}`;
  $('menu-coins').textContent = profile.coins;
  $('menu-tbs').textContent = profile.tbs;
  $('birthday-banner').classList.toggle('hidden', !isBirthdayToday(profile.birthday));
}

$('btn-play').addEventListener('click', startMatch);
$('btn-change-name').addEventListener('click', goLogin);

// ---- match -----------------------------------------------------------------

function startMatch() {
  sound.unlock();
  show();
  setView(() => new Game({
    renderer,
    profile,
    difficulty: botDifficulty(profile),
    onPauseChange: (paused) => show(...(paused ? ['screen-pause'] : [])),
    onEnd: finishMatch,
  }));
  resize();
}

function finishMatch(result) {
  profile.coins += result.coins;
  profile.tbs += result.tbs;
  profile.matches += 1;
  profile.totalTags += result.tags;
  saveProfile(profile);

  const titles = { win: 'YOUR TEAM WINS! 🏆', lose: 'RED TEAM WINS', draw: "IT'S A DRAW!" };
  $('end-title').textContent = titles[result.outcome];
  $('end-title').className = result.outcome;
  $('end-blue').textContent = result.blue;
  $('end-red').textContent = result.red;
  $('end-tags').textContent = result.tags;
  $('end-coins').textContent = `+${result.coins}`;
  $('end-tbs').textContent = `+${result.tbs}`;
  setTimeout(() => { if (game?.ended) show('screen-end'); }, 1200);
}

$('btn-resume').addEventListener('click', () => game?.resume());
$('btn-quit').addEventListener('click', () => goMenu());
$('btn-again').addEventListener('click', startMatch);
$('btn-menu').addEventListener('click', () => goMenu());
$('btn-sound').addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  $('btn-sound').textContent = sound.enabled ? '🔊 SOUND: ON' : '🔈 SOUND: OFF';
});

// ---- loop ------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (view) {
    view.update(dt);
    view.render(renderer);
  }
  requestAnimationFrame(frame);
}

resize();
if (profile) goMenu();
else goLogin();
requestAnimationFrame(frame);

// Handy for testing from the browser console.
window.psychWar = { get game() { return game; }, get profile() { return profile; } };

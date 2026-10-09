// Outfit showcase: pick a character, spin it with your finger, play the emote.
import * as THREE from '../../vendor/three.module.js';
import { OrbitControls } from '../../vendor/addons/controls/OrbitControls.js';
import { RoomEnvironment } from '../../vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from '../../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/addons/postprocessing/OutputPass.js';
import { OUTFITS, RARITIES } from './outfits.js';

const $ = (id) => document.getElementById(id);
const VOTES_KEY = 'psychwar.skinVotes.v1';

function loadVotes() {
  try { return JSON.parse(localStorage.getItem(VOTES_KEY)) || {}; } catch { return {}; }
}
function saveVotes(v) {
  try { localStorage.setItem(VOTES_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
}

// ---- renderer and scene ----------------------------------------------------

const canvas = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

const bgCanvas = document.createElement('canvas');
bgCanvas.width = 1024;
bgCanvas.height = 768;
const bgTexture = new THREE.CanvasTexture(bgCanvas);
bgTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTexture;

function paintBackground(rarity) {
  const g = bgCanvas.getContext('2d');
  const { width: w, height: h } = bgCanvas;
  const base = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.5, w * 0.75);
  base.addColorStop(0, rarity.color);
  base.addColorStop(0.45, rarity.deep);
  base.addColorStop(1, '#07071a');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // Light rays behind the character, like an item shop spotlight.
  g.save();
  g.translate(w / 2, h * 0.42);
  g.globalAlpha = 0.09;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 18; i++) {
    g.rotate((Math.PI * 2) / 18);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-40, -h);
    g.lineTo(40, -h);
    g.fill();
  }
  g.restore();
  bgTexture.needsUpdate = true;
}

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
camera.position.set(0, 1.25, 5.4);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.98, 0);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.2;
controls.maxDistance = 7;
controls.minPolarAngle = Math.PI * 0.25;
controls.maxPolarAngle = Math.PI * 0.55;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.6;
let idleTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  clearTimeout(idleTimer);
});
controls.addEventListener('end', () => {
  idleTimer = setTimeout(() => { controls.autoRotate = true; }, 3500);
});

scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x302040, 0.7));
const key = new THREE.DirectionalLight(0xfff1dd, 2.5);
key.position.set(2.2, 4.5, 3.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -1.4;
key.shadow.camera.right = key.shadow.camera.top = 1.4;
key.shadow.camera.near = 1;
key.shadow.camera.far = 12;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 3;
scene.add(key);
const rimL = new THREE.DirectionalLight(0xffffff, 1.6);
rimL.position.set(-3, 2.5, -3);
const rimR = new THREE.DirectionalLight(0xffffff, 1.2);
rimR.position.set(3, 1.5, -3);
scene.add(rimL, rimR);

// Pedestal with a glowing rarity ring.
const pedestal = new THREE.Group();
scene.add(pedestal);
const top = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 0.92, 0.12, 96),
  new THREE.MeshStandardMaterial({ color: 0x1b1b2e, roughness: 0.35, metalness: 0.6 }),
);
top.position.y = -0.06;
top.receiveShadow = true;
pedestal.add(top);
const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 });
const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.885, 0.014, 16, 128), ringMat);
glowRing.rotation.x = Math.PI / 2;
glowRing.position.y = 0.0;
pedestal.add(glowRing);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.35, 0.4, 2.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---- characters ------------------------------------------------------------

const built = OUTFITS.map((o) => {
  const made = o.build();
  made.rig.root.visible = false;
  scene.add(made.rig.root);
  return { ...o, ...made };
});
let current = null;
let clock = 0;
let emoteTime = -1;
const EMOTE_SECONDS = 4.5;

function setPose(rig, t, emote) {
  const { pelvis, spine, chest, head, armL, armR, legL, legR } = rig;
  const breathe = Math.sin(t * 2.1);
  // Idle: breathing, a slow weight shift and looking around.
  let pelvisY = 0.98 + breathe * 0.004;
  let pelvisRotZ = Math.sin(t * 0.8) * 0.025;
  let pelvisRotY = 0;
  let chestRotY = 0;
  let headX = Math.sin(t * 0.7) * 0.04;
  let headY = Math.sin(t * 0.45) * 0.28;
  const arm = {
    L: { x: 0.02 * breathe, z: 0.13 + breathe * 0.015, e: -0.18 },
    R: { x: -0.02 * breathe, z: 0.13 + breathe * 0.015, e: -0.18 },
  };
  const leg = { hip: 0, knee: 0, ankle: 0 };

  if (emote > 0) {
    // "Slipper Shuffle": bounce, twist and pump the fists.
    const b = t * Math.PI * 2 * 1.7;
    const bounce = (1 - Math.cos(2 * b)) / 2;
    const w = emote;
    pelvisY += -0.05 * bounce * w;
    pelvisRotY += Math.sin(b) * 0.4 * w;
    pelvisRotZ += Math.sin(b) * 0.06 * w;
    chestRotY += -Math.sin(b) * 0.25 * w;
    headX += Math.sin(2 * b) * 0.1 * w;
    headY *= 1 - w;
    arm.L = {
      x: (-1.35 + Math.sin(b) * 0.6) * w + arm.L.x * (1 - w),
      z: (0.35 + Math.sin(b) * 0.25) * w + arm.L.z * (1 - w),
      e: (-1.2 - Math.cos(b) * 0.35) * w + arm.L.e * (1 - w),
    };
    arm.R = {
      x: (-1.35 - Math.sin(b) * 0.6) * w + arm.R.x * (1 - w),
      z: (0.35 - Math.sin(b) * 0.25) * w + arm.R.z * (1 - w),
      e: (-1.2 + Math.cos(b) * 0.35) * w + arm.R.e * (1 - w),
    };
    leg.hip = -0.25 * bounce * w;
    leg.knee = 0.5 * bounce * w;
    leg.ankle = -0.25 * bounce * w;
  }

  pelvis.position.y = pelvisY;
  pelvis.rotation.set(0, pelvisRotY, pelvisRotZ);
  spine.rotation.set(breathe * 0.012, 0, -pelvisRotZ * 0.6);
  chest.rotation.y = chestRotY;
  chest.scale.set(1 + breathe * 0.006, 1, 1 + breathe * 0.008);
  head.rotation.set(headX, headY, 0);
  for (const [a, p] of [[armL, arm.L], [armR, arm.R]]) {
    a.shoulder.rotation.set(p.x, 0, a.side * p.z);
    a.elbow.rotation.x = p.e;
  }
  for (const l of [legL, legR]) {
    l.hip.rotation.set(leg.hip, 0, -pelvisRotZ);
    l.knee.rotation.x = leg.knee;
    l.ankle.rotation.x = leg.ankle;
  }
}

// ---- thumbnails ------------------------------------------------------------

function makeThumbnails() {
  const size = 192;
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const thumbCam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  thumbCam.position.set(0.35, 1.62, 2.1);
  thumbCam.lookAt(0, 1.5, 0);
  const pixels = new Uint8Array(size * size * 4);
  const c2 = document.createElement('canvas');
  c2.width = c2.height = size;
  const g = c2.getContext('2d');
  const img = g.createImageData(size, size);
  const oldBg = scene.background;
  scene.background = null;
  pedestal.visible = false;
  const urls = {};
  for (const o of built) {
    for (const p of built) p.rig.root.visible = p === o;
    setPose(o.rig, 0.6, 0);
    o.update(0.6);
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, thumbCam);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
    for (let y = 0; y < size; y++) {
      img.data.set(pixels.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    }
    g.putImageData(img, 0, 0);
    urls[o.id] = c2.toDataURL('image/png');
  }
  renderer.setRenderTarget(null);
  for (const p of built) p.rig.root.visible = false;
  scene.background = oldBg;
  pedestal.visible = true;
  target.dispose();
  return urls;
}

// ---- UI --------------------------------------------------------------------

const votes = loadVotes();

function priceHtml(o) {
  if (o.price === 0) return '<span class="free">FREE</span>';
  return `<span class="tbs">TBS</span><span>${o.price.toLocaleString('en-US')}</span>`;
}

function buildCards(thumbs) {
  const list = $('cards');
  list.innerHTML = '';
  for (const o of built) {
    const r = RARITIES[o.rarity];
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.type = 'button';
    btn.id = `card-${o.id}`;
    btn.style.setProperty('--rar', r.color);
    btn.style.setProperty('--rar-deep', r.deep);
    btn.innerHTML = `
      <span class="thumb"><img alt="" src="${thumbs[o.id]}"></span>
      <span class="card-text">
        <span class="card-name">${o.name}</span>
        <span class="card-price">${priceHtml(o)}</span>
      </span>
      <span class="card-vote" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => select(o.id));
    list.appendChild(btn);
  }
  refreshVotes();
}

function refreshVotes() {
  for (const o of built) {
    const mark = document.querySelector(`#card-${o.id} .card-vote`);
    if (mark) mark.textContent = votes[o.id] === 'yes' ? '👍' : votes[o.id] === 'no' ? '👎' : '';
  }
  const v = current ? votes[current.id] : null;
  $('vote-yes').classList.toggle('on', v === 'yes');
  $('vote-no').classList.toggle('on', v === 'no');
  $('vote-yes').setAttribute('aria-pressed', String(v === 'yes'));
  $('vote-no').setAttribute('aria-pressed', String(v === 'no'));
  const yes = built.filter((o) => votes[o.id] === 'yes').length;
  const no = built.filter((o) => votes[o.id] === 'no').length;
  $('vote-summary').textContent = yes || no ? `${yes} liked · ${no} to change` : 'Like or change each outfit';
}

function select(id) {
  const o = built.find((b) => b.id === id);
  if (!o || o === current) return;
  if (current) current.rig.root.visible = false;
  current = o;
  o.rig.root.visible = true;
  const r = RARITIES[o.rarity];
  document.body.style.setProperty('--rar', r.color);
  document.body.style.setProperty('--rar-deep', r.deep);
  paintBackground(r);
  ringMat.color.set(r.glow);
  ringMat.emissive.set(r.glow);
  rimL.color.set(r.glow);
  $('info-rarity').textContent = r.label;
  $('info-name').textContent = o.name;
  $('info-tagline').textContent = o.tagline;
  $('info-price').innerHTML = priceHtml(o);
  $('info-parts').innerHTML = o.parts.map((p) => `<li>${p}</li>`).join('');
  for (const b of built) $(`card-${b.id}`)?.classList.toggle('selected', b === o);
  emoteTime = -1;
  refreshVotes();
  try { localStorage.setItem('psychwar.lockerSelected', id); } catch { /* storage blocked */ }
}

$('btn-emote').addEventListener('click', () => { emoteTime = 0; });
for (const [btnId, value] of [['vote-yes', 'yes'], ['vote-no', 'no']]) {
  $(btnId).addEventListener('click', () => {
    if (!current) return;
    votes[current.id] = votes[current.id] === value ? undefined : value;
    saveVotes(votes);
    refreshVotes();
  });
}
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const i = built.indexOf(current);
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') select(built[(i + 1) % built.length].id);
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') select(built[(i - 1 + built.length) % built.length].id);
  if (e.key === ' ') { e.preventDefault(); emoteTime = 0; }
});

// ---- layout and loop -------------------------------------------------------

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h;
  // Keep the whole character in view on tall, narrow screens.
  // On tall screens the info panel sits on top, so shift the character down.
  if (w / h < 0.9) {
    camera.fov = 44;
    camera.setViewOffset(w, h, 0, -h * 0.07, w, h);
  } else {
    camera.fov = 28;
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const thumbs = makeThumbnails();
buildCards(thumbs);
let startId = 'mjalli';
try { startId = localStorage.getItem('psychwar.lockerSelected') || startId; } catch { /* storage blocked */ }
select(OUTFITS.some((o) => o.id === startId) ? startId : 'mjalli');
document.body.classList.add('ready');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) controls.autoRotate = false;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  let emote = 0;
  if (emoteTime >= 0) {
    emoteTime += dt;
    const fadeIn = Math.min(1, emoteTime / 0.3);
    const fadeOut = Math.min(1, (EMOTE_SECONDS - emoteTime) / 0.4);
    emote = Math.max(0, Math.min(fadeIn, fadeOut));
    if (emoteTime > EMOTE_SECONDS) emoteTime = -1;
  }
  if (current) {
    setPose(current.rig, clock, emote);
    current.update(clock);
  }
  ringMat.emissiveIntensity = 2 + Math.sin(clock * 2) * 0.6;
  controls.update();
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.psychWarLocker = { select, play: () => { emoteTime = 0; }, renderer, camera, controls, built };

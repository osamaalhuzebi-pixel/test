// One offline match: 2 vs 2 on the Island, 5 minutes, your team against bots.
import * as THREE from '../vendor/three.module.js';
import { World, SPAWNS, CHAR_HEIGHT } from './world.js';
import { buildCharacter, NameTag, TEAM_COLORS } from './characters.js';
import { WEAPONS, WEAPON_ORDER, makeHeldWeapon, makeProjectileMesh } from './weapons.js';
import { BotBrain, BOT_NAMES } from './bots.js';
import { Effects } from './effects.js';
import { Hud, escapeHtml } from './hud.js';
import { Input } from './input.js';
import { sound } from './audio.js';

export const MATCH_SECONDS = 300;
const RESPAWN_SECONDS = 3;
const SHIELD_SECONDS = 2;
const MAX_HEALTH = 100;
const MOVE_SPEED = 6.5;
const JUMP_SPEED = 8.5;
const GRAVITY = 22;
const RADIUS = 0.55;
const REGEN_DELAY = 4;
const REGEN_RATE = 15;

export const REWARDS = { perTag: 10, win: 50, draw: 25, played: 10, winTbs: 5 };

const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

function forwardOf(yaw, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}
function rightOf(yaw, out = new THREE.Vector3()) {
  return out.set(Math.cos(yaw), 0, -Math.sin(yaw));
}

class Character {
  constructor(game, { name, team, isPlayer, palette }) {
    this.name = name;
    this.team = team;
    this.isPlayer = isPlayer;
    this.model = buildCharacter(palette, TEAM_COLORS[team]);
    this.group = this.model.group;
    game.scene.add(this.group);
    if (!isPlayer) {
      this.tag = new NameTag(name, team === 'blue' ? '#8cc8ff' : '#ff9a9a');
      this.group.add(this.tag.sprite);
    }
    this.pos = new THREE.Vector3();
    this.velY = 0;
    this.onGround = true;
    this.yaw = 0;
    this.pitch = 0;
    this.health = MAX_HEALTH;
    this.alive = true;
    this.respawnTimer = 0;
    this.shield = 0;
    this.weaponId = 'blaster';
    this.cooldown = 0;
    this.sinceDamage = 99;
    this.damageMult = 1;
    this.tags = 0;
    this.walkPhase = 0;
    this.moveAmount = 0;
    this.wish = new THREE.Vector3();
    this.wantFire = false;
    this.wantJump = false;
    this.aimTarget = new THREE.Vector3();
    this.held = null;
    this.lastAttacker = null;
  }

  chest(out = new THREE.Vector3()) {
    return out.copy(this.pos).setY(this.pos.y + 1.1);
  }
}

export class Game {
  constructor({ renderer, profile, difficulty, onPauseChange, onEnd }) {
    this.renderer = renderer;
    this.profile = profile;
    this.onPauseChange = onPauseChange;
    this.onEnd = onEnd;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    this.setupLights();
    this.world = new World(this.scene);
    this.effects = new Effects(this.scene);
    this.hud = new Hud();
    this.input = new Input(renderer.domElement, document.getElementById('touch-ui'));
    this.characters = [];
    this.projectiles = [];
    this.score = { blue: 0, red: 0 };
    this.timeLeft = MATCH_SECONDS;
    this.paused = false;
    this.ended = false;
    this.endClock = 0;
    this.difficulty = difficulty;

    this.player = this.addCharacter({ name: profile.nickname, team: 'blue', isPlayer: true, palette: 'mjalli' });
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    this.addCharacter({ name: `Bot ${names[0]}`, team: 'blue', palette: 'ally' });
    this.addCharacter({ name: `Bot ${names[1]}`, team: 'red', palette: 'enemy' });
    this.addCharacter({ name: `Bot ${names[2]}`, team: 'red', palette: 'enemy' });
    for (const c of this.characters) this.respawn(c, true);

    this.hud.show(this.input.isTouch);
    this.hud.setScore(0, 0);
    this.hud.setTimer(this.timeLeft);
    this.updateWeaponHud();
    this.hud.message('GO!', this.input.isTouch ? '' : 'Click the screen to aim');
    setTimeout(() => { if (!this.ended && this.player.alive) this.hud.message(''); }, 1800);

    this.onPauseClick = () => this.pause();
    document.getElementById('btn-pause').addEventListener('click', this.onPauseClick);
    this.onVisibility = () => { if (document.hidden) this.pause(); };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xdff4ff, 0xf6d98b, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = sun.shadow.camera;
    s.left = s.bottom = -30;
    s.right = s.top = 30;
    s.near = 1;
    s.far = 120;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  addCharacter(opts) {
    const c = new Character(this, opts);
    if (!opts.isPlayer) c.brain = new BotBrain(this, c, this.difficulty);
    this.characters.push(c);
    this.refreshHeldWeapon(c);
    return c;
  }

  refreshHeldWeapon(c) {
    if (c.held) c.model.handR.remove(c.held);
    c.held = makeHeldWeapon(c.weaponId);
    c.model.handR.add(c.held);
  }

  updateWeaponHud() {
    const w = WEAPONS[this.player.weaponId];
    const other = WEAPONS[WEAPON_ORDER.find((id) => id !== w.id)];
    this.hud.setWeapon(w, other);
  }

  respawn(c, initial = false) {
    const base = SPAWNS[c.team];
    c.pos.set(base.x + (Math.random() * 2 - 1) * 6, 0, base.z + (Math.random() * 2 - 1) * 3);
    c.yaw = c.team === 'blue' ? 0 : Math.PI;
    c.pitch = 0;
    c.velY = 0;
    c.health = MAX_HEALTH;
    c.alive = true;
    c.shield = initial ? 0 : SHIELD_SECONDS;
    c.sinceDamage = 99;
    c.group.visible = true;
    c.tag?.draw(1);
    c.brain?.onRespawn();
  }

  // ---- main loop -------------------------------------------------------

  pause() {
    if (this.paused || this.ended) return;
    this.paused = true;
    this.input.releasePointerLock();
    this.input.touchFiring = false;
    this.onPauseChange(true);
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.input.consume('pause');
    this.input.requestPointerLock();
    this.onPauseChange(false);
  }

  update(dt) {
    if (this.input.consume('pause')) {
      if (this.paused) this.resume();
      else this.pause();
    }
    if (this.paused) return;
    if (this.ended) {
      this.updateEnd(dt);
      return;
    }

    this.timeLeft -= dt;
    this.hud.setTimer(Math.max(0, this.timeLeft));
    if (this.timeLeft <= 0) {
      this.endMatch();
      return;
    }

    this.updatePlayerControls();
    for (const c of this.characters) c.brain?.update(dt);
    for (const c of this.characters) this.updateCharacter(c, dt);
    this.separateCharacters();
    this.updateCamera();
    this.updatePlayerAim();
    for (const c of this.characters) {
      c.cooldown -= dt;
      if (c.alive && c.wantFire && c.cooldown <= 0) this.fire(c);
    }
    this.updateProjectiles(dt);
    this.effects.update(dt);
    this.world.update(dt);
    this.hud.setHealth(this.player.health);
    this.followSun();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---- player ------------------------------------------------------------

  updatePlayerControls() {
    const p = this.player;
    const inp = this.input;
    const look = inp.consumeLook();
    const sens = inp.isTouch ? 0.0055 : 0.0045;
    p.yaw -= look.x * sens;
    p.pitch = Math.max(-0.85, Math.min(0.6, p.pitch - look.y * sens));
    const move = inp.getMove();
    p.wish.set(0, 0, 0)
      .addScaledVector(forwardOf(p.yaw, _a), move.y)
      .addScaledVector(rightOf(p.yaw, _b), move.x);
    if (p.wish.lengthSq() > 1) p.wish.normalize();
    p.wantJump = inp.consume('jump');
    if (inp.consume('swap')) {
      const i = WEAPON_ORDER.indexOf(p.weaponId);
      p.weaponId = WEAPON_ORDER[(i + 1) % WEAPON_ORDER.length];
      p.cooldown = Math.max(p.cooldown, 0.2);
      this.refreshHeldWeapon(p);
      this.updateWeaponHud();
      sound.play('swap');
    }
    p.wantFire = inp.firing;
  }

  cameraForward(out) {
    const p = this.player;
    const cp = Math.cos(p.pitch);
    return out.set(-Math.sin(p.yaw) * cp, Math.sin(p.pitch), -Math.cos(p.yaw) * cp);
  }

  updateCamera() {
    const p = this.player;
    const fwd = this.cameraForward(_v);
    const right = rightOf(p.yaw, _b);
    const pivot = _a.copy(p.pos);
    pivot.y += 1.6;
    const desired = pivot.clone().addScaledVector(fwd, -3.8).addScaledVector(right, 0.75);
    desired.y += 0.35;
    // Keep the camera from going inside walls.
    const t = this.world.raycast(pivot, desired);
    if (t >= 0) desired.lerpVectors(pivot, desired, Math.max(0.1, t * 0.9));
    if (desired.y < 0.3) desired.y = 0.3;
    this.camera.position.copy(desired);
    this.camera.lookAt(desired.clone().add(fwd));
  }

  // Finds what is under the crosshair, with gentle aim assist for kids.
  updatePlayerAim() {
    const p = this.player;
    const camPos = this.camera.position;
    const fwd = this.cameraForward(new THREE.Vector3());
    const assist = this.input.isTouch ? 0.09 : 0.04;
    let best = null;
    let bestAngle = assist;
    for (const o of this.characters) {
      if (o.team === p.team || !o.alive) continue;
      const chest = o.chest();
      const to = chest.clone().sub(camPos);
      const dist = to.length();
      if (dist > 60) continue;
      const angle = to.angleTo(fwd);
      if (angle < bestAngle && this.world.lineOfSight(camPos, chest)) {
        best = chest;
        bestAngle = angle;
      }
    }
    if (best) {
      p.aimTarget.copy(best);
      return;
    }
    const far = camPos.clone().addScaledVector(fwd, 90);
    const t = this.world.raycast(camPos, far);
    p.aimTarget.lerpVectors(camPos, far, t >= 0 ? t : 1);
  }

  // ---- movement ----------------------------------------------------------

  updateCharacter(c, dt) {
    if (!c.alive) {
      c.respawnTimer -= dt;
      if (c.isPlayer) {
        this.hud.message('TAGGED OUT!', `by ${c.lastAttacker ?? 'someone'} · back in ${Math.max(1, Math.ceil(c.respawnTimer))}`);
      }
      if (c.respawnTimer <= 0) {
        this.respawn(c);
        if (c.isPlayer) this.hud.message('');
      }
      return;
    }
    c.shield = Math.max(0, c.shield - dt);
    c.model.shield.visible = c.shield > 0;
    c.sinceDamage += dt;
    if (c.sinceDamage > REGEN_DELAY && c.health < MAX_HEALTH) {
      c.health = Math.min(MAX_HEALTH, c.health + REGEN_RATE * dt);
      c.tag?.draw(c.health / MAX_HEALTH);
    }

    const speed = MOVE_SPEED * (c.brain ? c.brain.speedMult : 1);
    c.pos.x += c.wish.x * speed * dt;
    c.pos.z += c.wish.z * speed * dt;
    if (c.wantJump && c.onGround) {
      c.velY = JUMP_SPEED;
      c.onGround = false;
      if (c.isPlayer) sound.play('jump');
    }
    c.velY -= GRAVITY * dt;
    c.pos.y += c.velY * dt;
    this.world.resolve(c.pos, RADIUS);
    const ground = this.world.groundHeight(c.pos.x, c.pos.z, c.pos.y, RADIUS);
    if (c.pos.y <= ground) {
      c.pos.y = ground;
      c.velY = 0;
      c.onGround = true;
    } else {
      c.onGround = c.pos.y - ground < 0.05 && c.velY <= 0;
    }
    this.animate(c, dt);
  }

  animate(c, dt) {
    const m = c.model;
    const moving = Math.min(1, c.wish.length());
    c.moveAmount += (moving - c.moveAmount) * Math.min(1, dt * 10);
    c.walkPhase += dt * 11 * c.moveAmount;
    const swing = Math.sin(c.walkPhase);
    m.body.position.y = Math.abs(swing) * 0.07 * c.moveAmount;
    m.body.rotation.z = swing * 0.05 * c.moveAmount;
    m.armL.rotation.x = swing * 0.7 * c.moveAmount;
    m.armL.rotation.z = c.onGround ? 0 : -0.8;
    // Right arm points the weapon where the character is aiming.
    m.armR.rotation.x = Math.PI / 2 + (c.isPlayer ? c.pitch : 0);
    m.armR.rotation.z = 0;
    m.head.rotation.x = c.isPlayer ? -c.pitch * 0.4 : 0;
    c.group.position.copy(c.pos);
    c.group.rotation.y = c.yaw;
  }

  separateCharacters() {
    const cs = this.characters;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i];
        const b = cs[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const min = RADIUS * 2;
        if (d >= min || d < 1e-6) continue;
        const push = (min - d) / 2;
        a.pos.x -= (dx / d) * push;
        a.pos.z -= (dz / d) * push;
        b.pos.x += (dx / d) * push;
        b.pos.z += (dz / d) * push;
      }
    }
  }

  followSun() {
    const p = this.player.pos;
    this.sun.position.set(p.x + 25, 45, p.z + 18);
    this.sun.target.position.copy(p);
  }

  // ---- combat ------------------------------------------------------------

  fire(c) {
    const w = WEAPONS[c.weaponId];
    c.cooldown = w.cooldown;
    const muzzle = c.pos.clone();
    muzzle.y += 1.3;
    muzzle.addScaledVector(rightOf(c.yaw, _b), 0.38).addScaledVector(forwardOf(c.yaw, _a), 0.5);
    const to = c.aimTarget.clone().sub(muzzle);
    const dist = to.length();
    if (dist < 0.5) return;
    let vel;
    if (w.gravity === 0) {
      vel = to.multiplyScalar(w.speed / dist);
    } else {
      // Throw in an arc that lands right on the target.
      const t = Math.max(0.12, dist / w.speed);
      vel = to.divideScalar(t);
      vel.y += 0.5 * w.gravity * t;
    }
    const mesh = makeProjectileMesh(w.id, c.team);
    mesh.position.copy(muzzle);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, pos: muzzle, prev: muzzle.clone(), vel, owner: c, weapon: w, life: w.life });
    const volume = c.isPlayer ? 1 : Math.max(0.15, 1 - c.pos.distanceTo(this.player.pos) / 40);
    sound.play(w.id === 'slipper' ? 'throw' : 'pew', volume);
  }

  updateProjectiles(dt) {
    const keep = [];
    for (const pr of this.projectiles) {
      pr.prev.copy(pr.pos);
      pr.vel.y -= pr.weapon.gravity * dt;
      pr.pos.addScaledVector(pr.vel, dt);
      pr.life -= dt;
      let dead = pr.life <= 0;

      if (!dead) {
        const victim = this.projectileVictim(pr);
        if (victim) {
          this.damage(victim, pr.weapon.damage * pr.owner.damageMult, pr.owner, pr.weapon);
          dead = true;
        }
      }
      if (!dead) {
        const t = this.world.raycast(pr.prev, pr.pos);
        if (t >= 0 || pr.pos.y < 0) {
          const hit = t >= 0 ? _v.lerpVectors(pr.prev, pr.pos, t) : pr.pos;
          this.effects.sparks(hit, pr.owner.team === 'blue' ? 0x5ff2ff : 0xff7a3d);
          dead = true;
        }
      }

      if (dead) {
        this.scene.remove(pr.mesh);
        continue;
      }
      pr.mesh.position.copy(pr.pos);
      if (pr.weapon.id === 'slipper') {
        pr.mesh.rotation.y = Math.atan2(-pr.vel.x, -pr.vel.z);
        pr.mesh.userData.spinner.rotation.x -= dt * 18;
      } else {
        pr.mesh.lookAt(_v.copy(pr.pos).add(pr.vel));
      }
      keep.push(pr);
    }
    this.projectiles = keep;
  }

  projectileVictim(pr) {
    const r = RADIUS + pr.weapon.radius;
    for (const o of this.characters) {
      if (o.team === pr.owner.team || !o.alive) continue;
      const chest = o.chest(_b);
      // Closest point on this frame's path to the character's chest.
      const seg = _a.copy(pr.pos).sub(pr.prev);
      const len2 = seg.lengthSq();
      const t = len2 > 0 ? Math.max(0, Math.min(1, _v.copy(chest).sub(pr.prev).dot(seg) / len2)) : 0;
      const q = _v.copy(pr.prev).addScaledVector(seg, t);
      if (Math.hypot(q.x - o.pos.x, q.z - o.pos.z) < r && q.y > o.pos.y - 0.1 && q.y < o.pos.y + CHAR_HEIGHT + 0.2) return o;
    }
    return null;
  }

  damage(target, amount, attacker, weapon) {
    if (target.shield > 0) {
      this.effects.sparks(target.chest(), 0xffffff, 6);
      return;
    }
    target.health -= amount;
    target.sinceDamage = 0;
    target.tag?.draw(Math.max(0, target.health) / MAX_HEALTH);
    if (weapon.id === 'slipper') sound.play('bonk', attacker.isPlayer || target.isPlayer ? 1 : 0.4);
    if (target.isPlayer) {
      this.hud.hurt();
      sound.play('hurt');
    }
    if (attacker.isPlayer) {
      this.hud.hit();
      sound.play('hit');
    }
    if (target.health <= 0) this.tagOut(target, attacker, weapon);
  }

  tagOut(target, attacker, weapon) {
    target.alive = false;
    target.health = 0;
    target.respawnTimer = RESPAWN_SECONDS;
    target.lastAttacker = attacker.name;
    target.group.visible = false;
    target.model.shield.visible = false;
    target.wish.set(0, 0, 0);
    this.effects.burst(target.chest(), TEAM_COLORS[target.team]);
    sound.play('pop', target.isPlayer || attacker.isPlayer ? 1 : 0.5);
    attacker.tags += 1;
    this.score[attacker.team] += 1;
    this.hud.setScore(this.score.blue, this.score.red);
    const icon = weapon.id === 'slipper' ? ' 🩴' : '';
    this.hud.feed(
      `<span class="${attacker.team}">${escapeHtml(attacker.name)}</span> ${weapon.verb}${icon} <span class="${target.team}">${escapeHtml(target.name)}</span>`,
    );
    if (attacker.isPlayer) this.hud.toast(`+${REWARDS.perTag} 🪙`);
  }

  // ---- end of match ------------------------------------------------------

  endMatch() {
    this.ended = true;
    this.endClock = 0;
    this.input.releasePointerLock();
    this.input.touchFiring = false;
    for (const pr of this.projectiles) this.scene.remove(pr.mesh);
    this.projectiles = [];
    const p = this.player;
    if (!p.alive) this.respawn(p);
    p.model.shield.visible = false;
    const { blue, red } = this.score;
    const outcome = blue > red ? 'win' : blue < red ? 'lose' : 'draw';
    this.outcome = outcome;
    const coins = p.tags * REWARDS.perTag + (outcome === 'win' ? REWARDS.win : outcome === 'draw' ? REWARDS.draw : REWARDS.played);
    const tbs = outcome === 'win' ? REWARDS.winTbs : 0;
    sound.play(outcome === 'lose' ? 'lose' : 'win');
    this.hud.message('');
    this.hud.hide();
    this.onEnd({ outcome, blue, red, tags: p.tags, coins, tbs });
  }

  // Your character does a bara'a dance step while the camera circles around.
  updateEnd(dt) {
    this.endClock += dt;
    const t = this.endClock;
    const p = this.player;
    const m = p.model;
    const dancing = this.outcome !== 'lose';
    if (dancing) {
      m.body.position.x = Math.sin(t * 4) * 0.12;
      m.body.position.y = Math.abs(Math.sin(t * 4)) * 0.12;
      m.body.rotation.z = Math.sin(t * 4) * 0.12;
      m.armR.rotation.x = Math.PI * 0.95;
      m.armR.rotation.z = Math.sin(t * 8) * 0.25;
      m.armL.rotation.x = 0.3;
      m.armL.rotation.z = -0.35;
      p.group.rotation.y = p.yaw + Math.sin(t * 2) * 0.5;
      if (Math.floor(t / 0.5) !== Math.floor((t - dt) / 0.5)) {
        this.effects.burst(_v.copy(p.pos).setY(p.pos.y + 3.5), undefined, 25, 4);
      }
    } else {
      m.body.rotation.x = Math.min(0.25, t * 0.5);
      m.armR.rotation.x = 0;
      m.armL.rotation.x = 0;
    }
    const angle = p.yaw + t * 0.35;
    this.camera.position.set(p.pos.x - Math.sin(angle) * 4.2, p.pos.y + 1.9, p.pos.z - Math.cos(angle) * 4.2);
    this.camera.lookAt(p.pos.x, p.pos.y + 1.1, p.pos.z);
    this.effects.update(dt);
    this.world.update(dt);
  }

  dispose() {
    this.input.dispose();
    this.hud.hide();
    document.getElementById('btn-pause').removeEventListener('click', this.onPauseClick);
    document.removeEventListener('visibilitychange', this.onVisibility);
    disposeScene(this.scene);
  }
}

export function disposeScene(scene) {
  scene.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      m.map?.dispose();
      m.dispose();
    }
  });
}

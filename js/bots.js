// Bot brains. `difficulty` goes from 0 (very easy) to 1 (hard); the game
// picks it from the player's level, so bots get smarter as you improve.
import * as THREE from '../vendor/three.module.js';

export const BOT_NAMES = ['Falcon', 'Camel', 'Hoopoe', 'Gecko', 'Oryx', 'Dune', 'Coconut', 'Pepper', 'Mango', 'Comet'];

const lerp = (a, b, t) => a + (b - a) * t;
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _eye = new THREE.Vector3();
const _chest = new THREE.Vector3();

export class BotBrain {
  constructor(game, character, difficulty) {
    this.game = game;
    this.c = character;
    const d = Math.max(0, Math.min(1, difficulty));
    this.reaction = lerp(0.9, 0.25, d);
    this.aimError = lerp(0.075, 0.015, d);
    this.turnSpeed = lerp(3.2, 8, d);
    this.speedMult = lerp(0.72, 1, d);
    this.viewRange = lerp(32, 50, d);
    this.burstOn = lerp(1.0, 2.2, d);
    this.burstOff = lerp(1.1, 0.4, d);
    character.damageMult = lerp(0.45, 1, d);

    this.target = null;
    this.seenFor = 0;
    this.think = 0;
    this.strafeDir = 1;
    this.strafeTimer = 0;
    this.burstTimer = Math.random() * this.burstOn;
    this.bursting = true;
    this.goal = this.pickGoal();
    this.stuckCheck = 0;
    this.lastPos = new THREE.Vector3();
    this.unstuckTimer = 0;
    this.unstuckDir = new THREE.Vector3();
  }

  onRespawn() {
    this.target = null;
    this.goal = this.pickGoal();
    this.c.weaponId = Math.random() < 0.3 ? 'slipper' : 'blaster';
    this.game.refreshHeldWeapon(this.c);
  }

  pickGoal() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 28;
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  findTarget() {
    const c = this.c;
    _eye.copy(c.pos).y += 1.5;
    let best = null;
    let bestDist = this.viewRange;
    for (const o of this.game.characters) {
      if (o.team === c.team || !o.alive) continue;
      const dist = o.pos.distanceTo(c.pos);
      if (dist >= bestDist) continue;
      _chest.copy(o.pos).y += 1.1;
      if (!this.game.world.lineOfSight(_eye, _chest)) continue;
      best = o;
      bestDist = dist;
    }
    return best;
  }

  update(dt) {
    const c = this.c;
    c.wantFire = false;
    c.wantJump = false;
    if (!c.alive) return;

    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.25;
      const t = this.findTarget();
      if (t !== this.target) this.seenFor = 0;
      this.target = t;
    }

    const wish = c.wish.set(0, 0, 0);
    let desiredYaw = c.yaw;

    if (this.target && this.target.alive) {
      const to = this.target.pos.clone().sub(c.pos);
      to.y = 0;
      const dist = to.length();
      to.normalize();
      this.seenFor += dt;
      desiredYaw = Math.atan2(-to.x, -to.z);

      if (dist > 16) wish.add(to);
      else if (dist < 7) wish.sub(to);
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 1 + Math.random() * 1.5;
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      }
      wish.x += -to.z * this.strafeDir * 0.8;
      wish.z += to.x * this.strafeDir * 0.8;

      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.bursting = !this.bursting;
        this.burstTimer = this.bursting ? this.burstOn : this.burstOff;
      }
      const facing = Math.abs(wrapAngle(desiredYaw - c.yaw)) < 0.3;
      if (this.bursting && facing && this.seenFor > this.reaction) {
        c.wantFire = true;
        const spread = dist * this.aimError;
        c.aimTarget.copy(this.target.pos);
        c.aimTarget.y += 1.1;
        c.aimTarget.x += (Math.random() * 2 - 1) * spread;
        c.aimTarget.y += (Math.random() * 2 - 1) * spread * 0.6;
        c.aimTarget.z += (Math.random() * 2 - 1) * spread;
      }
    } else {
      const to = this.goal.clone().sub(c.pos);
      to.y = 0;
      if (to.length() < 3) this.goal = this.pickGoal();
      wish.copy(to.normalize());
      desiredYaw = Math.atan2(-wish.x, -wish.z);
    }

    if (this.unstuckTimer > 0) {
      this.unstuckTimer -= dt;
      wish.copy(this.unstuckDir);
    }
    if (wish.lengthSq() > 1) wish.normalize();

    this.stuckCheck -= dt;
    if (this.stuckCheck <= 0) {
      const moved = this.lastPos.distanceTo(c.pos);
      if (wish.lengthSq() > 0.1 && moved < 0.6 && this.unstuckTimer <= 0) {
        this.unstuckTimer = 0.9;
        const side = Math.random() < 0.5 ? -1 : 1;
        this.unstuckDir.set(-wish.z * side, 0, wish.x * side).normalize();
        c.wantJump = Math.random() < 0.5;
        this.goal = this.pickGoal();
      }
      this.lastPos.copy(c.pos);
      this.stuckCheck = 0.5;
    }

    const diff = wrapAngle(desiredYaw - c.yaw);
    const step = this.turnSpeed * dt;
    c.yaw += Math.max(-step, Math.min(step, diff));
  }
}

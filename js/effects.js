// Confetti bursts (for tag-outs and wins) and small hit sparks, drawn with a
// single InstancedMesh so lots of pieces stay cheap on tablets.
import * as THREE from '../vendor/three.module.js';

const MAX = 700;
export const CONFETTI_COLORS = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xff70a6, 0xffffff];

export class Effects {
  constructor(scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.16, 0.1),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      MAX,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.parts = [];
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    for (let i = 0; i < MAX; i++) {
      this.parts.push({ life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), gravity: 1 });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.set(0xffffff));
    }
    this.next = 0;
    scene.add(this.mesh);
  }

  spawn(pos, color, speed, life, gravity = 1, upward = 0.5) {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    const p = this.parts[i];
    p.life = p.max = life * (0.7 + Math.random() * 0.6);
    p.gravity = gravity;
    p.pos.copy(pos);
    p.vel.set(Math.random() * 2 - 1, Math.random() * 2 - 1 + upward, Math.random() * 2 - 1).normalize()
      .multiplyScalar(speed * (0.4 + Math.random() * 0.6));
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    p.spin.set(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7);
    this.mesh.setColorAt(i, this.color.set(color));
    this.mesh.instanceColor.needsUpdate = true;
  }

  burst(pos, extraColor, count = 70, power = 7) {
    for (let i = 0; i < count; i++) {
      const color = i % 3 === 0 && extraColor !== undefined ? extraColor : CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      this.spawn(pos, color, power, 2.2, 0.35, 0.9);
    }
  }

  sparks(pos, color, count = 8) {
    for (let i = 0; i < count; i++) this.spawn(pos, color, 4, 0.35, 1.2, 0.2);
  }

  update(dt) {
    const d = this.dummy;
    for (let i = 0; i < MAX; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vel.y -= 9.8 * p.gravity * dt;
      p.vel.multiplyScalar(1 - Math.min(1, 1.6 * dt));
      p.pos.addScaledVector(p.vel, dt);
      p.rot.x += p.spin.x * dt;
      p.rot.y += p.spin.y * dt;
      p.rot.z += p.spin.z * dt;
      d.position.copy(p.pos);
      d.rotation.copy(p.rot);
      d.scale.setScalar(p.life > 0 ? Math.min(1, p.life / (p.max * 0.3)) : 0);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// The Island map: ground, water, cover, and the collision boxes used by
// characters, projectiles and line-of-sight checks.
import * as THREE from '../vendor/three.module.js';

export const ISLAND_RADIUS = 58;
export const PLAY_RADIUS = 52;
export const SPAWNS = {
  blue: new THREE.Vector3(0, 0, 42),
  red: new THREE.Vector3(0, 0, -42),
};

// Characters walk up anything lower than this without jumping.
export const STEP_HEIGHT = 0.35;
export const CHAR_HEIGHT = 1.9;

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function crateTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c98a4b';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#8a5527';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 58, 58);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(6, 6);
  g.lineTo(58, 58);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.boxes = [];
    this.clouds = [];
    this.crateMat = lambert(0xffffff, { map: crateTexture() });
    this.build();
  }

  addCollider(x, z, w, d, h, minY = 0) {
    this.boxes.push({
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2,
      minY, maxY: minY + h,
    });
  }

  addMesh(geometry, material, x, y, z) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  block(x, z, w, d, h, color) {
    this.addMesh(new THREE.BoxGeometry(w, h, d), lambert(color), x, h / 2, z);
    this.addCollider(x, z, w, d, h);
  }

  crate(x, z, level = 0) {
    const s = 1.2;
    this.addMesh(new THREE.BoxGeometry(s, s, s), this.crateMat, x, s * level + s / 2, z);
    this.addCollider(x, z, s, s, s, s * level);
  }

  rock(x, z, w, d, h) {
    const m = this.addMesh(new THREE.DodecahedronGeometry(0.5, 0), lambert(0x9aa3ad, { flatShading: true }), x, h * 0.42, z);
    m.scale.set(w, h, d);
    m.rotation.y = (x * 7 + z * 3) % Math.PI;
    this.addCollider(x, z, w * 0.8, d * 0.8, h * 0.8);
  }

  palm(x, z, h = 5.5) {
    const trunkMat = lambert(0x9b6b3d);
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const segH = h / segments;
      const m = this.addMesh(
        new THREE.CylinderGeometry(0.22 - i * 0.02, 0.26 - i * 0.02, segH, 7),
        trunkMat, x + i * 0.08, segH * i + segH / 2, z,
      );
      m.rotation.z = -0.04;
    }
    const top = new THREE.Vector3(x + segments * 0.08, h, z);
    const leafMat = lambert(0x2fb44a, { side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 4), leafMat);
      leaf.scale.set(1, 1, 0.25);
      leaf.position.set(top.x + Math.cos(a) * 1.3, top.y - 0.3, top.z + Math.sin(a) * 1.3);
      leaf.rotation.order = 'YZX';
      leaf.rotation.y = -a;
      leaf.rotation.z = -Math.PI / 2 - 0.45;
      leaf.castShadow = true;
      this.scene.add(leaf);
    }
    const nutMat = lambert(0x5a3a1a);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      this.addMesh(new THREE.SphereGeometry(0.17, 8, 6), nutMat, top.x + Math.cos(a) * 0.25, top.y - 0.35, top.z + Math.sin(a) * 0.25);
    }
    this.addCollider(x, z, 0.6, 0.6, h);
  }

  hut(x, z, flip) {
    const w = 6, d = 4, h = 2.6;
    this.block(x, z, w, d, h, 0xd9a066);
    const roof = this.addMesh(new THREE.ConeGeometry(4.6, 2.2, 4), lambert(0xf2cf63, { flatShading: true }), x, h + 1.1, z);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.72);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.9), lambert(0x6b3f1d));
    door.position.set(x, 0.95, z + (flip ? 1 : -1) * (d / 2 + 0.01));
    if (!flip) door.rotation.y = Math.PI;
    this.scene.add(door);
  }

  lighthouse(x, z) {
    const h = 12, rings = 6;
    for (let i = 0; i < rings; i++) {
      const r0 = 1.8 - (i / rings) * 0.6;
      const r1 = 1.8 - ((i + 1) / rings) * 0.6;
      this.addMesh(
        new THREE.CylinderGeometry(r1, r0, h / rings, 16),
        lambert(i % 2 ? 0xffffff : 0xe63946), x, (h / rings) * i + h / rings / 2, z,
      );
    }
    this.addMesh(new THREE.CylinderGeometry(1.0, 1.0, 1.2, 12), new THREE.MeshBasicMaterial({ color: 0xffe066 }), x, h + 0.6, z);
    this.addMesh(new THREE.ConeGeometry(1.3, 1.4, 12), lambert(0xe63946), x, h + 1.9, z);
    this.addCollider(x, z, 3.4, 3.4, h + 2.6);
  }

  flag(x, z, color) {
    this.addMesh(new THREE.CylinderGeometry(0.07, 0.07, 5, 6), lambert(0xdddddd), x, 2.5, z);
    const f = this.addMesh(new THREE.PlaneGeometry(1.8, 1.1), lambert(color, { side: THREE.DoubleSide }), x + 0.9, 4.4, z);
    f.castShadow = false;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.03, z > 0 ? SPAWNS.blue.z : SPAWNS.red.z);
    this.scene.add(pad);
  }

  build() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x8fd8ff);
    scene.fog = new THREE.Fog(0x8fd8ff, 80, 220);

    const water = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), lambert(0x22a6e0));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.6;
    scene.add(water);
    this.water = water;

    const shallow = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_RADIUS + 9, 48), lambert(0x5fd6f0));
    shallow.rotation.x = -Math.PI / 2;
    shallow.position.y = -0.55;
    scene.add(shallow);

    const sand = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 4, 1, 48), lambert(0xf6d98b));
    sand.position.y = -0.5;
    sand.receiveShadow = true;
    scene.add(sand);

    const grass = new THREE.Mesh(new THREE.CircleGeometry(38, 48), lambert(0x7ed957));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.01;
    grass.receiveShadow = true;
    scene.add(grass);

    // Both halves of the map are mirrored so neither team has an advantage.
    const half = [
      ['hut', 0, 50],
      ['crate', -6, 32], ['crate', -4.8, 32], ['crate', -5.4, 32, 1],
      ['crate', 7, 30], ['crate', 12, 24], ['crate', 12, 24, 1], ['crate', -14, 22],
      ['block', 0, 24, 8, 1, 1.4, 0xb8b0a2],
      ['rock', -22, 28, 4, 3, 2.6], ['rock', 24, 26, 3.5, 3, 2.2],
      ['palm', -18, 38], ['palm', 18, 40], ['palm', -30, 14], ['palm', 30, 18],
      ['palm', -9, 14], ['palm', 10, 12],
      ['block', -24, 8, 1, 6, 1.6, 0xb8b0a2], ['crate', 20, 8], ['crate', 21.2, 8],
      ['rock', -38, 26, 5, 4, 3], ['rock', 38, 30, 4, 4, 2.4],
      ['crate', -3, 12], ['block', 16, 16, 4, 1, 1.4, 0xb8b0a2],
    ];
    for (const [type, x, z, ...rest] of half) {
      for (const [mx, mz] of [[x, z], [-x, -z]]) {
        if (type === 'crate') this.crate(mx, mz, rest[0] || 0);
        else if (type === 'block') this.block(mx, mz, ...rest);
        else if (type === 'rock') this.rock(mx, mz, ...rest);
        else if (type === 'palm') this.palm(mx, mz);
        else if (type === 'hut') this.hut(mx, mz, mz < 0);
      }
    }

    // The middle: an old stone fort, a lighthouse and a big rock.
    this.block(-6, 0, 1, 7, 2.2, 0xa89f8f);
    this.block(6, 0, 1, 7, 2.2, 0xa89f8f);
    this.crate(0, 0);
    this.crate(0, 0, 1);
    this.lighthouse(40, 0);
    this.rock(-40, 0, 6, 6, 4);
    this.palm(-35, 5);

    this.flag(4, SPAWNS.blue.z + 4, 0x2f8cff);
    this.flag(-4, SPAWNS.red.z - 4, 0xff4d4d);

    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 10, 8), cloudMat);
        puff.position.set(j * 3.5, Math.random() * 1.5, Math.random() * 2);
        cloud.add(puff);
      }
      cloud.position.set(-150 + Math.random() * 300, 35 + Math.random() * 15, -150 + Math.random() * 300);
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(dt) {
    for (const c of this.clouds) {
      c.position.x += dt * 2;
      if (c.position.x > 160) c.position.x = -160;
    }
  }

  // Returns the fraction (0..1) along a->b where it first enters any box, or -1.
  raycast(a, b) {
    let best = -1;
    for (const box of this.boxes) {
      const t = segmentHitsBox(a, b, box);
      if (t >= 0 && (best < 0 || t < best)) best = t;
    }
    return best;
  }

  lineOfSight(a, b) {
    return this.raycast(a, b) < 0;
  }

  // Highest surface under (x, z) that a character at height y can stand on.
  groundHeight(x, z, y, radius) {
    let ground = 0;
    const r = radius * 0.5;
    for (const b of this.boxes) {
      if (b.maxY > y + STEP_HEIGHT || b.maxY <= ground) continue;
      if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) ground = b.maxY;
    }
    return ground;
  }

  // Pushes a character (circle on the XZ plane) out of any box it overlaps.
  resolve(pos, radius) {
    for (const b of this.boxes) {
      if (b.maxY <= pos.y + STEP_HEIGHT || b.minY >= pos.y + CHAR_HEIGHT) continue;
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        const pushes = [
          [b.minX - radius - pos.x, 0], [b.maxX + radius - pos.x, 0],
          [0, b.minZ - radius - pos.z], [0, b.maxZ + radius - pos.z],
        ];
        pushes.sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1]));
        pos.x += pushes[0][0];
        pos.z += pushes[0][1];
      }
    }
    const r = Math.hypot(pos.x, pos.z);
    if (r > PLAY_RADIUS) {
      pos.x *= PLAY_RADIUS / r;
      pos.z *= PLAY_RADIUS / r;
    }
  }
}

function slab(o, d, mn, mx, range) {
  if (Math.abs(d) < 1e-9) return o >= mn && o <= mx;
  let t1 = (mn - o) / d;
  let t2 = (mx - o) / d;
  if (t1 > t2) [t1, t2] = [t2, t1];
  if (t1 > range[0]) range[0] = t1;
  if (t2 < range[1]) range[1] = t2;
  return range[0] <= range[1];
}

const _range = [0, 1];
export function segmentHitsBox(a, b, box) {
  _range[0] = 0;
  _range[1] = 1;
  if (!slab(a.x, b.x - a.x, box.minX, box.maxX, _range)) return -1;
  if (!slab(a.y, b.y - a.y, box.minY, box.maxY, _range)) return -1;
  if (!slab(a.z, b.z - a.z, box.minZ, box.maxZ, _range)) return -1;
  return _range[0];
}

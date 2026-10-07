// Character models built from simple shapes. Mjalli wears Yemeni clothes:
// a white thobe (zanna), a dark jacket, an embroidered belt with a
// decorative jambiya sheath, and a colorful wrapped shal (turban).
import * as THREE from '../vendor/three.module.js';

export const TEAM_COLORS = { blue: 0x2f8cff, red: 0xff4d4d };

export const PALETTES = {
  // The free starter skin.
  mjalli: {
    thobe: 0xf7f4ea, jacket: 0x2c3e66, belt: 0x1f7a4d, trim: 0xf2c14e,
    turban: ['#d7263d', '#ffffff', '#f2c14e'], skin: 0xb57a4f, sandal: 0x7a4a26,
  },
  // Teammate bot: same style, different colors.
  ally: {
    thobe: 0xf3efe2, jacket: 0x6b4a2b, belt: 0x2a6f97, trim: 0xf2c14e,
    turban: ['#2a9d8f', '#ffffff', '#e9c46a'], skin: 0xa86d43, sandal: 0x5a3a1a,
  },
  // Enemy bots.
  enemy: {
    thobe: 0xefe9da, jacket: 0x7a1f2b, belt: 0x3a2a1a, trim: 0xf2c14e,
    turban: ['#222222', '#ffffff', '#e04848'], skin: 0x9c6640, sandal: 0x4a2a12,
  },
};

function turbanTexture(colors) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  const stripe = 12;
  for (let x = -32; x < 160; x += stripe) {
    g.fillStyle = colors[Math.abs(Math.round(x / stripe)) % colors.length];
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + stripe, 0);
    g.lineTo(x + stripe - 16, 32);
    g.lineTo(x - 16, 32);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

const mat = (color) => new THREE.MeshLambertMaterial({ color });

function part(parent, geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function buildArm(p, side) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.38, 1.42, 0);
  part(arm, new THREE.CylinderGeometry(0.085, 0.075, 0.48, 8), mat(p.jacket), 0, -0.24, 0);
  part(arm, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), mat(p.thobe), 0, -0.48, 0);
  part(arm, new THREE.SphereGeometry(0.075, 8, 6), mat(p.skin), 0, -0.55, 0);
  const hand = new THREE.Group();
  hand.position.set(0, -0.56, 0);
  // Held items are modelled pointing down -Z; this turns them to follow the arm.
  hand.rotation.x = -Math.PI / 2;
  arm.add(hand);
  return { arm, hand };
}

// Model faces -Z with its feet at the origin.
export function buildCharacter(palette, teamColor = null) {
  const p = typeof palette === 'string' ? PALETTES[palette] : palette;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  for (const sx of [-0.14, 0.14]) {
    part(body, new THREE.BoxGeometry(0.16, 0.05, 0.32), mat(p.sandal), sx, 0.025, -0.03);
    part(body, new THREE.BoxGeometry(0.12, 0.07, 0.24), mat(p.skin), sx, 0.08, -0.03);
  }

  part(body, new THREE.CylinderGeometry(0.27, 0.36, 1.0, 14), mat(p.thobe), 0, 0.6, 0);
  part(body, new THREE.CylinderGeometry(0.33, 0.3, 0.58, 14), mat(p.jacket), 0, 1.2, 0);
  part(body, new THREE.BoxGeometry(0.15, 0.52, 0.05), mat(p.thobe), 0, 1.2, -0.3);
  part(body, new THREE.CylinderGeometry(0.12, 0.14, 0.12, 10), mat(p.thobe), 0, 1.5, 0);

  // Embroidered belt with gold trim.
  part(body, new THREE.CylinderGeometry(0.335, 0.335, 0.14, 16), mat(p.belt), 0, 0.97, 0);
  for (const y of [0.91, 1.03]) {
    const trim = part(body, new THREE.TorusGeometry(0.336, 0.014, 6, 24), mat(p.trim), 0, y, 0);
    trim.rotation.x = Math.PI / 2;
  }

  // Jambiya sheath at the front of the belt (decoration only).
  const jambiya = new THREE.Group();
  jambiya.position.set(0, 0.97, -0.36);
  part(jambiya, new THREE.CylinderGeometry(0.035, 0.045, 0.15, 8), mat(0xe8d7b0), 0, 0.12, 0);
  part(jambiya, new THREE.BoxGeometry(0.13, 0.05, 0.05), mat(0xe8d7b0), 0, 0.21, 0);
  part(jambiya, new THREE.CylinderGeometry(0.05, 0.045, 0.16, 8), mat(p.trim), 0, -0.03, 0);
  const tip = part(jambiya, new THREE.TorusGeometry(0.1, 0.04, 6, 12, Math.PI * 0.75), mat(p.trim), 0.1, -0.11, 0);
  tip.rotation.z = Math.PI * 0.95;
  body.add(jambiya);

  const left = buildArm(p, -1);
  const right = buildArm(p, 1);
  body.add(left.arm, right.arm);

  const head = new THREE.Group();
  head.position.set(0, 1.68, 0);
  body.add(head);
  const face = part(head, new THREE.SphereGeometry(0.21, 14, 12), mat(p.skin), 0, 0, 0);
  face.scale.y = 1.05;
  for (const sx of [-0.075, 0.075]) {
    part(head, new THREE.SphereGeometry(0.032, 8, 6), mat(0x111111), sx, 0.03, -0.19);
  }
  part(head, new THREE.BoxGeometry(0.15, 0.035, 0.04), mat(0x2a1a10), 0, -0.07, -0.19);

  // The shal: a striped wrap with two twisted bands and a hanging tail.
  const tex = turbanTexture(p.turban);
  const turbanMat = new THREE.MeshLambertMaterial({ map: tex });
  part(head, new THREE.CylinderGeometry(0.235, 0.22, 0.18, 18), turbanMat, 0, 0.16, 0);
  const band1 = part(head, new THREE.TorusGeometry(0.225, 0.05, 8, 20), mat(new THREE.Color(p.turban[0]).getHex()), 0, 0.1, 0);
  band1.rotation.x = Math.PI / 2 + 0.12;
  const band2 = part(head, new THREE.TorusGeometry(0.215, 0.045, 8, 20), mat(new THREE.Color(p.turban[2]).getHex()), 0, 0.2, 0);
  band2.rotation.x = Math.PI / 2 - 0.15;
  const top = part(head, new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), turbanMat, 0, 0.24, 0);
  top.scale.y = 0.5;
  const tail = part(head, new THREE.BoxGeometry(0.13, 0.34, 0.025), turbanMat, 0.1, -0.08, 0.22);
  tail.rotation.x = 0.15;

  let ring = null;
  if (teamColor !== null) {
    ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.64, 24),
      new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.85 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
  }

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 16, 12),
    new THREE.MeshBasicMaterial({ color: teamColor ?? 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shield.position.y = 0.95;
  shield.visible = false;
  group.add(shield);

  return { group, body, head, armL: left.arm, armR: right.arm, handR: right.hand, handL: left.hand, shield, ring };
}

// Floating name with a small health bar above a character.
export class NameTag {
  constructor(name, color) {
    this.name = name;
    this.color = color;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 72;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, transparent: true }));
    this.sprite.scale.set(1.7, 0.48, 1);
    this.sprite.position.y = 2.35;
    this.draw(1);
  }

  draw(health) {
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, 256, 72);
    g.font = 'bold 30px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(0,0,0,0.75)';
    g.strokeText(this.name, 128, 32);
    g.fillStyle = this.color;
    g.fillText(this.name, 128, 32);
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(48, 46, 160, 16);
    g.fillStyle = health > 0.35 ? '#5cf26b' : '#ffcf33';
    g.fillRect(50, 48, 156 * Math.max(0, health), 12);
    this.texture.needsUpdate = true;
  }
}

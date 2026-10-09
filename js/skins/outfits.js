// The five Psych War outfits. Each one builds on the shared rig and adds
// its own clothes, armor, hair and back bling.
import * as THREE from '../../vendor/three.module.js';
import { buildRig, mesh, G, M, curvedSpike } from './rig.js';

export const RARITIES = {
  common: { label: 'Common', color: '#a5aebb', deep: '#3a4150', glow: 0xb9c2cf },
  rare: { label: 'Rare', color: '#3d9bff', deep: '#0b2a6b', glow: 0x3d9bff },
  epic: { label: 'Epic', color: '#c05cff', deep: '#3a0d6b', glow: 0xc05cff },
  legendary: { label: 'Legendary', color: '#ff9d2e', deep: '#6b2a08', glow: 0xff9d2e },
  mythic: { label: 'Mythic', color: '#ffd23f', deep: '#5c4300', glow: 0xffd23f },
};

// ---- hair ------------------------------------------------------------------

function hairCap(head, color, rough = 0.75) {
  const mat = M.fabric(color, rough);
  const cap = mesh(head, new THREE.SphereGeometry(0.136, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.52), mat, 0, 0.02, -0.004);
  cap.scale.set(1, 1.1, 1.05);
  cap.rotation.x = -0.38;
  return mat;
}

function fadeHair(head, color) {
  const mat = hairCap(head, color);
  const top = mesh(head, G.sphere(0.118), mat, 0, 0.1, 0.005);
  top.scale.set(1, 0.55, 1.08);
  const quiff = mesh(head, G.sphere(0.06), mat, 0.02, 0.135, 0.07);
  quiff.scale.set(1.4, 0.7, 1);
  quiff.rotation.z = -0.3;
}

function curlyHair(head, color) {
  const mat = hairCap(head, color, 0.9);
  const ball = G.sphere(0.032, 16, 12);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 90; i++) {
    const y = 1 - (i / 89) * 1.1;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = golden * i;
    const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    if (dir.y < 0.05 && dir.z > -0.2) continue; // keep the face clear
    if (dir.y < 0.35 && dir.z > 0.55) continue; // keep the forehead clear
    const curl = mesh(head, ball, mat, dir.x * 0.142, 0.03 + dir.y * 0.15, dir.z * 0.142 - 0.01);
    curl.scale.setScalar(0.85 + ((i * 37) % 10) / 25);
  }
}

function slickHair(head, color) {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const cap = mesh(head, new THREE.SphereGeometry(0.138, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), mat, 0, 0.02, -0.006);
  cap.scale.set(1, 1.08, 1.06);
  cap.rotation.x = -0.42;
  const back = mesh(head, G.sphere(0.12), mat, 0, 0.06, -0.05);
  back.scale.set(1.05, 0.8, 1.1);
}

// ---- small shared parts ----------------------------------------------------

function ring(parent, r, tube, mat, y, depth = 1, x = 0, z = 0) {
  const t = mesh(parent, G.torus(r, tube), mat, x, y, z);
  t.rotation.x = Math.PI / 2;
  t.scale.y = depth;
  return t;
}

function cuffs(rig, mat, r = 0.052) {
  for (const arm of [rig.armL, rig.armR]) ring(arm.elbow, r, 0.016, mat, -0.235);
}

// ---- outfits ---------------------------------------------------------------

function mjalli() {
  const olive = M.fabric(0x5d6d3b);
  const rib = M.fabric(0x2c3122, 0.95);
  const rig = buildRig({
    skin: 0xc68c5a, eyes: 0x4a2c17, hair: 0x1d1410,
    shirtMat: olive, pants: 0x2f343c, shoe: 0xf2f2f2, sole: 0x1b1b1b, glove: 0x1e1e1e,
  });
  fadeHair(rig.head, 0x1d1410);
  const c = rig.chest;
  ring(c, 0.09, 0.028, rib, 0.535, 0.8);
  mesh(c, G.cyl(0.064, 0.066, 0.03), M.fabric(0xf2f2f2), 0, 0.55, 0);
  ring(c, 0.156, 0.022, rib, 0.075, 0.7);
  const zip = mesh(c, G.box(0.012, 0.42, 0.012, 0.004), M.metal(0xc9ccd1), 0, 0.31, 0.127);
  zip.rotation.x = -0.1;
  const patch = mesh(c, G.box(0.075, 0.05, 0.012, 0.008), M.plastic(0xff8a00, 0.6), 0.09, 0.39, 0.125);
  patch.rotation.y = 0.45;
  const badge = mesh(c, G.cyl(0.026, 0.026, 0.01), M.plastic(0x3d9bff, 0.5), -0.1, 0.4, 0.122);
  badge.rotation.set(Math.PI / 2, 0, 0);
  badge.rotation.z = 0.5;
  cuffs(rig, rib);

  for (const leg of [rig.legL, rig.legR]) {
    const pocket = mesh(leg.hip, G.box(0.06, 0.11, 0.075, 0.015), M.fabric(0x262a31), leg.side * 0.08, -0.24, 0.005);
    pocket.rotation.z = leg.side * 0.05;
    const pad = mesh(leg.knee, G.sphere(0.058), M.plastic(0x15171a, 0.5), 0, 0.0, 0.045);
    pad.scale.set(1, 1.1, 0.6);
    mesh(leg.shoe, G.box(0.136, 0.022, 0.2, 0.01), M.plastic(0xff8a00, 0.5), 0, -0.02, 0.055);
    for (let i = 0; i < 3; i++) mesh(leg.shoe, G.box(0.06, 0.008, 0.012, 0.004), M.plastic(0x1b1b1b), 0, 0.045 - i * 0.004, 0.06 + i * 0.03);
  }

  const pack = new THREE.Group();
  pack.position.set(0, 0.3, -0.19);
  c.add(pack);
  const packMat = M.fabric(0x45522b);
  mesh(pack, G.box(0.27, 0.32, 0.13, 0.05), packMat);
  mesh(pack, G.box(0.28, 0.12, 0.14, 0.04), M.fabric(0x3a4523), 0, 0.12, -0.005);
  mesh(pack, G.box(0.17, 0.1, 0.05, 0.02), packMat, 0, -0.07, -0.08);
  mesh(pack, G.sphere(0.022), M.plastic(0xff8a00, 0.4), 0.1, 0.0, -0.08);
  for (const sx of [-1, 1]) {
    const strap = mesh(c, G.torus(0.1, 0.014, Math.PI * 1.1), M.fabric(0x2c3122), sx * 0.1, 0.43, -0.01);
    strap.rotation.set(0, Math.PI / 2, -0.15);
  }
  return { rig, update() {} };
}

function mero() {
  const blue = M.fabric(0x1e5eff);
  const blueDark = M.fabric(0x1646c4);
  const rig = buildRig({
    skin: 0x8d5524, eyes: 0x2b1a0e, hair: 0x111111,
    shirtMat: blue, pants: 0x1b2440, shoeMat: M.metal(0xffc533, 0.25), sole: 0xffffff, glove: null,
  });
  curlyHair(rig.head, 0x141414);
  const c = rig.chest;
  rig.torso.scale.set(1.07, 1, 1.07);
  for (const arm of [rig.armL, rig.armR]) {
    arm.upper.scale.set(1.12, 1, 1.12);
    arm.fore.scale.set(1.1, 1, 1.1);
    arm.deltoid.scale.multiplyScalar(1.08);
  }
  ring(c, 0.1, 0.045, blue, 0.535, 0.85);
  const hood = mesh(c, G.sphere(0.1), blue, 0, 0.52, -0.1);
  hood.scale.set(1.45, 0.75, 0.85);
  ring(c, 0.162, 0.024, blueDark, 0.065, 0.72);
  const pocket = mesh(c, G.box(0.22, 0.1, 0.03, 0.02), blueDark, 0, 0.17, 0.118);
  pocket.rotation.x = -0.06;
  for (const sx of [-1, 1]) {
    const cord = mesh(c, G.capsule(0.006, 0.12), M.fabric(0xffffff), sx * 0.035, 0.43, 0.142);
    cord.rotation.x = -0.15;
    mesh(c, G.cyl(0.008, 0.008, 0.025, 12), M.metal(0xffc533), sx * 0.035, 0.355, 0.152);
  }
  cuffs(rig, blueDark, 0.058);

  for (const leg of [rig.legL, rig.legR]) {
    mesh(leg.hip, G.box(0.012, 0.36, 0.014, 0.005), M.fabric(0xffffff), leg.side * 0.079, -0.2, 0);
    mesh(leg.knee, G.box(0.012, 0.3, 0.014, 0.005), M.fabric(0xffffff), leg.side * 0.063, -0.18, 0);
    ring(leg.knee, 0.06, 0.018, M.fabric(0x141b30), -0.37);
    mesh(leg.shoe, G.box(0.137, 0.02, 0.24, 0.01), M.plastic(0xffffff, 0.4), 0, -0.022, 0.05);
  }

  const shadesMat = new THREE.MeshPhysicalMaterial({
    color: 0x2848ff, metalness: 1, roughness: 0.06, iridescence: 1, iridescenceIOR: 1.6, side: THREE.DoubleSide,
  });
  const shades = mesh(rig.head, new THREE.CylinderGeometry(0.141, 0.141, 0.042, 64, 1, true, -0.95, 1.9), shadesMat, 0, 0.022, 0.002);
  shades.scale.set(1, 1, 1.05);
  const bar = mesh(rig.head, new THREE.CylinderGeometry(0.143, 0.143, 0.008, 64, 1, true, -1.0, 2.0), M.metal(0xffc533, 0.2), 0, 0.045, 0.002);
  bar.scale.set(1, 1, 1.05);

  const phones = new THREE.Group();
  phones.position.set(0, 0.565, 0.01);
  phones.rotation.x = -0.35;
  c.add(phones);
  const white = M.plastic(0xffffff, 0.3);
  const band = mesh(phones, G.torus(0.1, 0.013, Math.PI), white);
  band.rotation.x = Math.PI / 2;
  band.rotation.z = Math.PI;
  for (const sx of [-1, 1]) {
    const cup = mesh(phones, G.cyl(0.045, 0.045, 0.035), M.plastic(0x1e5eff, 0.35), sx * 0.1, 0, 0);
    cup.rotation.z = Math.PI / 2;
    const pad = mesh(phones, G.cyl(0.038, 0.038, 0.02), M.fabric(0x111111), sx * 0.08, 0, 0);
    pad.rotation.z = Math.PI / 2;
  }

  const board = new THREE.Group();
  board.position.set(0.02, 0.28, -0.2);
  board.rotation.set(0.12, 0, 0.32);
  c.add(board);
  mesh(board, G.box(0.22, 0.8, 0.022, 0.011), M.plastic(0xff4fa3, 0.45));
  mesh(board, G.box(0.2, 0.76, 0.006, 0.003), M.rubber(0x161616), 0, 0, 0.013);
  const stripe = mesh(board, G.box(0.21, 0.06, 0.004, 0.002), M.plastic(0xffc533, 0.4), 0, 0.12, -0.012);
  stripe.rotation.z = 0.4;
  for (const y of [-0.26, 0.26]) {
    mesh(board, G.box(0.16, 0.025, 0.03, 0.008), M.metal(0xc9ccd1), 0, y, -0.025);
    for (const x of [-0.08, 0.08]) {
      const wheel = mesh(board, G.cyl(0.03, 0.03, 0.03), M.plastic(0x7df0ff, 0.5), x, y, -0.05);
      wheel.rotation.z = Math.PI / 2;
    }
  }
  return { rig, update() {} };
}

function donga() {
  const orange = M.paint(0xff7a1a);
  const dark = M.metal(0x2b2b31, 0.45);
  const cyan = M.glow(0x22e3ff, 4);
  const rig = buildRig({
    skin: 0xe0ac69, eyes: 0x1e90ff, hair: 0x332211,
    shirt: 0x2a2a2e, pants: 0x2a2a2e, shoeMat: orange, sole: 0x1a1a1d, gloveMat: M.paint(0x3a3a40), glove: 0x3a3a40,
  });
  const c = rig.chest;
  mesh(c, G.lathe([[0.168, 0.2], [0.196, 0.3], [0.218, 0.39], [0.218, 0.45], [0.195, 0.5], [0.13, 0.535], [0.09, 0.545]], 0.74), orange);
  for (let i = 0; i < 3; i++) mesh(c, G.box(0.2 - i * 0.015, 0.045, 0.05, 0.015), dark, 0, 0.17 - i * 0.055, 0.1);
  const core = mesh(c, G.cyl(0.036, 0.036, 0.02), cyan, 0, 0.38, 0.158);
  core.rotation.x = Math.PI / 2;
  const coreRing = mesh(c, G.torus(0.042, 0.01), dark, 0, 0.38, 0.16);
  coreRing.rotation.y = 0;

  for (const arm of [rig.armL, rig.armR]) {
    const pad = mesh(arm.shoulder, new THREE.SphereGeometry(0.115, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), orange, arm.side * 0.012, 0.01, 0);
    pad.scale.set(1.1, 0.95, 1.12);
    pad.rotation.z = -arm.side * 0.35;
    const rim = mesh(pad, G.torus(0.113, 0.014), dark);
    rim.rotation.x = Math.PI / 2;
    mesh(arm.elbow, G.cyl(0.064, 0.056, 0.17), orange, 0, -0.15, 0);
    ring(arm.elbow, 0.064, 0.008, cyan, -0.1);
  }
  ring(rig.pelvis, 0.172, 0.03, dark, 0.08, 0.72);
  mesh(rig.pelvis, G.box(0.07, 0.05, 0.03, 0.01), cyan, 0, 0.08, 0.125);
  for (const leg of [rig.legL, rig.legR]) {
    mesh(leg.hip, G.box(0.13, 0.2, 0.05, 0.02), orange, leg.side * 0.012, -0.17, 0.072).rotation.x = 0.06;
    const cap = mesh(leg.knee, G.sphere(0.066), dark, 0, 0.0, 0.04);
    cap.scale.set(1, 1.1, 0.75);
    mesh(leg.knee, G.cyl(0.074, 0.08, 0.17), orange, 0, -0.32, 0);
    leg.shoeUpper.scale.set(1.08, 0.85, 1.8);
  }

  const helmet = mesh(rig.head, G.sphere(0.168), orange, 0, 0.02, -0.005);
  helmet.scale.set(1, 1.05, 1.05);
  mesh(rig.head, G.box(0.2, 0.13, 0.08, 0.035), dark, 0, -0.035, 0.12);
  mesh(rig.head, G.box(0.17, 0.026, 0.02, 0.01), cyan, 0, 0.03, 0.172);
  mesh(rig.head, G.box(0.035, 0.05, 0.3, 0.015), M.paint(0xd95f0a), 0, 0.185, -0.01);
  const ivory = M.plastic(0xf3e5c0, 0.45);
  for (const sx of [-1, 1]) {
    curvedSpike(rig.head, ivory, new THREE.Vector3(sx * 0.14, 0.09, -0.01), new THREE.Vector3(sx, 0.35, 0.15), new THREE.Vector3(-sx * 0.6, 1.8, 0.2), 0.3, 0.042, 7);
  }

  const shield = new THREE.Group();
  shield.position.set(0, 0.33, -0.22);
  c.add(shield);
  const disc = mesh(shield, G.cyl(0.3, 0.3, 0.04, 64), orange);
  disc.rotation.x = Math.PI / 2;
  const rim = mesh(shield, G.torus(0.3, 0.026), dark);
  rim.rotation.y = 0;
  for (const rot of [0, Math.PI / 2]) {
    const barMesh = mesh(shield, G.box(0.06, 0.56, 0.02, 0.01), dark, 0, 0, -0.026);
    barMesh.rotation.z = rot + Math.PI / 4;
  }
  const boss = mesh(shield, G.sphere(0.07), cyan, 0, 0, -0.035);
  boss.scale.z = 0.5;

  return {
    rig,
    update(t) {
      const pulse = 4 + Math.sin(t * 3) * 1.5;
      cyan.emissiveIntensity = pulse;
    },
  };
}

function sweidan() {
  const white = M.plastic(0xf5f5fa, 0.45);
  const purple = M.paint(0x7c3aed);
  const silver = M.metal(0xd7dbe3, 0.25);
  const rig = buildRig({
    skin: 0xf1c27d, eyes: 0x7c3aed, hair: 0xb46cff,
    shirtMat: white, pantsMat: white, shoeMat: white, sole: 0x6d28d9, gloveMat: purple, glove: 0x7c3aed,
  });
  fadeHair(rig.head, 0xb46cff);
  const c = rig.chest;
  mesh(c, G.box(0.2, 0.13, 0.05, 0.02), purple, 0, 0.35, 0.128);
  mesh(c, G.box(0.11, 0.035, 0.01, 0.005), M.glow(0x22e3ff, 2), 0, 0.38, 0.155);
  [0xff4fd8, 0x7dff6a, 0xffd23f].forEach((col, i) => mesh(c, G.sphere(0.012, 16, 12), M.glow(col, 3), -0.05 + i * 0.05, 0.325, 0.155));
  ring(c, 0.11, 0.024, silver, 0.555);
  ring(c, 0.158, 0.02, purple, 0.07, 0.7);
  for (const arm of [rig.armL, rig.armR]) {
    ring(arm.shoulder, 0.059, 0.014, purple, -0.1);
    for (let i = 0; i < 3; i++) ring(arm.elbow, 0.05, 0.01, silver, 0.025 - i * 0.022);
    ring(arm.elbow, 0.058, 0.02, purple, -0.235);
  }
  for (const leg of [rig.legL, rig.legR]) {
    ring(leg.hip, 0.081, 0.014, purple, -0.12);
    for (let i = 0; i < 3; i++) ring(leg.knee, 0.066, 0.011, silver, 0.03 - i * 0.025);
    mesh(leg.knee, G.cyl(0.075, 0.08, 0.15), white, 0, -0.33, 0);
    ring(leg.knee, 0.078, 0.014, purple, -0.27);
    leg.shoeUpper.scale.set(1.1, 0.85, 1.8);
  }

  mesh(rig.head, G.sphere(0.215, 64, 48), M.glass(0xd8c8ff, 0.18), 0, 0.02, 0.01);
  const visorTop = mesh(rig.head, new THREE.SphereGeometry(0.218, 64, 24, 0, Math.PI * 2, 0, Math.PI * 0.22), M.metal(0xffc533, 0.15), 0, 0.02, 0.01);
  visorTop.rotation.x = 0.35;
  const ant = mesh(rig.head, G.cyl(0.006, 0.006, 0.16, 12), silver, 0.15, 0.2, -0.05);
  ant.rotation.z = -0.35;
  const tip = mesh(rig.head, G.sphere(0.018), M.glow(0xff4fd8, 3), 0.18, 0.275, -0.05);

  const pack = new THREE.Group();
  pack.position.set(0, 0.3, -0.19);
  c.add(pack);
  mesh(pack, G.box(0.3, 0.34, 0.1, 0.04), white);
  mesh(pack, G.box(0.04, 0.26, 0.012, 0.006), M.glow(0x22e3ff, 2), 0, 0, -0.056);
  const flames = [];
  for (const sx of [-1, 1]) {
    mesh(pack, G.cyl(0.072, 0.072, 0.36), purple, sx * 0.11, 0.0, -0.08);
    mesh(pack, G.sphere(0.072), purple, sx * 0.11, 0.18, -0.08);
    const nozzle = mesh(pack, G.cyl(0.04, 0.06, 0.08), silver, sx * 0.11, -0.22, -0.08);
    nozzle.rotation.x = 0;
    const outer = mesh(pack, G.cone(0.045, 0.2), M.glow(0xff4fd8, 4), sx * 0.11, -0.36, -0.08);
    outer.rotation.x = Math.PI;
    const inner = mesh(pack, G.cone(0.025, 0.14), M.glow(0x9af4ff, 5), sx * 0.11, -0.33, -0.08);
    inner.rotation.x = Math.PI;
    outer.castShadow = inner.castShadow = false;
    flames.push(outer, inner);
  }
  return {
    rig,
    update(t) {
      flames.forEach((f, i) => {
        const s = 0.8 + Math.sin(t * 30 + i * 2) * 0.12 + Math.sin(t * 17 + i) * 0.1;
        f.scale.set(1, s, 1);
      });
      tip.material.emissiveIntensity = 4 + Math.sin(t * 4) * 2;
    },
  };
}

function huzebi() {
  const black = M.fabric(0x151417, 0.7);
  const gold = M.metal(0xffc533, 0.38);
  const red = M.glow(0xff2a3d, 3);
  const rig = buildRig({
    skin: 0xc68642, eyes: 0xffc533, eyeGlow: true, hair: 0x0d0d0d,
    shirtMat: black, pants: 0x111114, shoeMat: M.plastic(0x101012, 0.25), sole: 0x050505, glove: 0x1a1a1d,
  });
  slickHair(rig.head, 0x0d0d0d);
  const c = rig.chest;
  const skirt = mesh(rig.pelvis, G.lathe([[0.17, 0.06], [0.185, -0.08], [0.215, -0.28], [0.25, -0.5]], 0.74), black);
  skirt.material = black.clone();
  skirt.material.side = THREE.DoubleSide;
  ring(rig.pelvis, 0.25, 0.012, gold, -0.5, 0.74);
  ring(rig.pelvis, 0.17, 0.026, gold, 0.08, 0.72);
  mesh(rig.pelvis, G.box(0.07, 0.055, 0.03, 0.012), gold, 0, 0.08, 0.128);
  mesh(rig.pelvis, G.sphere(0.014, 16, 12), red, 0, 0.08, 0.146);
  mesh(c, G.box(0.014, 0.44, 0.012, 0.005), gold, 0, 0.3, 0.128).rotation.x = -0.1;
  for (let i = 0; i < 4; i++) mesh(c, G.sphere(0.012, 16, 12), gold, 0.04, 0.42 - i * 0.08, 0.13 - (i === 0 ? 0.004 : 0));
  ring(c, 0.088, 0.02, gold, 0.535, 0.8);

  for (const arm of [rig.armL, rig.armR]) {
    mesh(arm.shoulder, G.box(0.13, 0.03, 0.13, 0.012), gold, arm.side * 0.01, 0.07, 0).rotation.z = -arm.side * 0.2;
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI - Math.PI / 2;
      mesh(arm.shoulder, G.cyl(0.005, 0.005, 0.05, 8), gold, arm.side * (0.07 + Math.cos(a) * 0.0), 0.03, Math.sin(a) * 0.06);
    }
    ring(arm.elbow, 0.053, 0.016, gold, -0.235);
  }
  for (const leg of [rig.legL, rig.legR]) {
    mesh(leg.knee, G.cyl(0.068, 0.072, 0.16), M.plastic(0x101012, 0.25), 0, -0.33, 0);
    mesh(leg.shoe, G.box(0.1, 0.03, 0.05, 0.012), gold, 0, 0.0, 0.15);
  }

  const chain = mesh(c, G.torus(0.105, 0.006), gold, 0, 0.5, 0.06);
  chain.rotation.x = Math.PI / 2 - 0.9;
  const medal = mesh(c, G.cyl(0.035, 0.035, 0.012), gold, 0, 0.42, 0.155);
  medal.rotation.x = Math.PI / 2 - 0.15;
  mesh(c, G.sphere(0.014, 16, 12), red, 0, 0.42, 0.163);

  const crown = new THREE.Group();
  crown.position.set(0, 0.13, -0.01);
  crown.rotation.x = -0.15;
  rig.head.add(crown);
  mesh(crown, G.sphere(0.105), M.fabric(0x8a0f1a), 0, 0.02, 0).scale.y = 0.55;
  mesh(crown, new THREE.CylinderGeometry(0.122, 0.118, 0.055, 64, 1, true), gold).material.side = THREE.DoubleSide;
  ring(crown, 0.12, 0.008, gold, -0.027);
  ring(crown, 0.122, 0.008, gold, 0.027);
  const gems = [0xff2a3d, 0x3d9bff, 0x22e38a];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.sin(a) * 0.118;
    const z = Math.cos(a) * 0.118;
    mesh(crown, G.cone(0.022, 0.075), gold, x, 0.065, z);
    mesh(crown, G.sphere(0.012, 16, 12), gold, x, 0.105, z);
    mesh(crown, G.sphere(0.011, 16, 12), M.glow(gems[i % 3], 1.8), Math.sin(a) * 0.123, 0.0, Math.cos(a) * 0.123);
  }

  const cape = new THREE.Group();
  cape.position.set(0, 0.52, -0.02);
  c.add(cape);
  const shape = new THREE.CylinderGeometry(0.2, 0.46, 1.15, 48, 8, true, Math.PI - 0.95, 1.9);
  shape.translate(0, -0.575, 0);
  shape.scale(1, 1, 0.75);
  mesh(cape, shape, M.fabric(0x0d0d10, 0.75)).material.side = THREE.FrontSide;
  const lining = mesh(cape, shape, M.fabric(0xa30f1d, 0.6));
  lining.material.side = THREE.BackSide;
  const hem = new THREE.TorusGeometry(0.46, 0.012, 12, 64, 1.9);
  const hemMesh = mesh(cape, hem, gold, 0, -1.15, 0);
  hemMesh.rotation.set(Math.PI / 2, 0, -Math.PI / 2 - 0.95);
  hemMesh.scale.y = 0.75;
  return {
    rig,
    update(t) {
      cape.rotation.x = -0.06 - Math.sin(t * 1.3) * 0.04;
    },
  };
}

export const OUTFITS = [
  {
    id: 'mjalli', name: 'Mjalli', rarity: 'common', price: 0,
    tagline: 'Ready for the first drop.',
    parts: ['Bomber jacket', 'Cargo pants', 'Street kicks', 'Back bling: Scout Pack'],
    build: mjalli,
  },
  {
    id: 'mero', name: 'Mero', rarity: 'rare', price: 400,
    tagline: 'Gold kicks. Zero chill.',
    parts: ['Oversized hoodie', 'Mirror shades', 'Gold sneakers', 'Back bling: Skate Deck'],
    build: mero,
  },
  {
    id: 'donga', name: 'Donga', rarity: 'epic', price: 800,
    tagline: 'Built like a tank. Charges like a bull.',
    parts: ['Horned helmet', 'Power core armor', 'Heavy boots', 'Back bling: Bull Shield'],
    build: donga,
  },
  {
    id: 'sweidan', name: 'Sweidan', rarity: 'legendary', price: 1200,
    tagline: 'Landed from orbit. Staying for the win.',
    parts: ['Glass dome helmet', 'Star suit', 'Moon boots', 'Back bling: Twin Jetpack'],
    build: sweidan,
  },
  {
    id: 'huzebi', name: 'Huzebi', rarity: 'mythic', price: 2000,
    tagline: 'Every island needs a king.',
    parts: ['Golden crown', 'Royal long coat', 'Glowing gold eyes', 'Back bling: King\'s Cape'],
    build: huzebi,
  },
];

// A stylized hero body with real joints, built from smooth shapes.
// Every outfit starts from this rig and adds clothes, armor and back bling.
// The character faces +Z with its feet on y = 0.
import * as THREE from '../../vendor/three.module.js';
import { RoundedBoxGeometry } from '../../vendor/addons/geometries/RoundedBoxGeometry.js';

// ---- materials -------------------------------------------------------------

let fabricBump = null;
function fabricTexture() {
  if (fabricBump) return fabricBump;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // A fine woven pattern with a little noise.
      const weave = (Math.sin(x * 1.6) * Math.sin(y * 1.6) + 1) * 40;
      const v = 110 + weave + Math.random() * 40;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  fabricBump = new THREE.CanvasTexture(c);
  fabricBump.wrapS = fabricBump.wrapT = THREE.RepeatWrapping;
  fabricBump.repeat.set(6, 6);
  return fabricBump;
}

export const M = {
  fabric: (color, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, bumpMap: fabricTexture(), bumpScale: 0.35 }),
  skin: (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 }),
  plastic: (color, rough = 0.4) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }),
  paint: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  metal: (color, rough = 0.28) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 1 }),
  rubber: (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
  glow: (color, strength = 4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: 0.4 }),
  glass: (color, opacity = 0.25) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.03, metalness: 0, transparent: true, opacity, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide,
  }),
};

// ---- geometry helpers ------------------------------------------------------

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const G = {
  sphere: (r, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h),
  capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 12, 32),
  cyl: (rt, rb, h, seg = 40, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  torus: (r, tube, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, 16, 64, arc),
  box: (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)),
  cone: (r, h, seg = 32) => new THREE.ConeGeometry(r, h, seg),
  // Smooth body section turned around Y; flatten front-to-back with `depth`.
  lathe: (points, depth = 0.7, seg = 64) => {
    const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    g.scale(1, 1, depth);
    return g;
  },
};

// A rounded, tapered limb (thicker at the top) centered on its middle.
function limbGeometry(rTop, rBot, len, bulge = 0, bulgeAt = 0.3) {
  const pts = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push([Math.sin(a) * rBot, -len / 2 - Math.cos(a) * rBot]);
  }
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const r = rBot + (rTop - rBot) * t + bulge * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - (1 - bulgeAt) + 0.35) / 0.7)));
    pts.push([r, -len / 2 + len * t]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push([Math.cos(a) * rTop, len / 2 + Math.sin(a) * rTop]);
  }
  pts[0][0] = 0.0001;
  pts[pts.length - 1][0] = 0.0001;
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40);
}

// A head with a rounder skull and a narrower chin.
function headGeometry() {
  const g = new THREE.SphereGeometry(0.13, 64, 48);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y >= 0) continue;
    const t = Math.pow(-y / 0.13, 1.6);
    pos.setX(i, pos.getX(i) * (1 - 0.24 * t));
    pos.setZ(i, pos.getZ(i) * (1 - 0.1 * t) + 0.012 * t);
  }
  g.scale(1, 1.12, 1.04);
  g.computeVertexNormals();
  return g;
}

// A horn or tail: cones stacked along a curve, getting thinner.
export function curvedSpike(parent, material, start, dir, bend, length, radius, segments = 6) {
  const group = new THREE.Group();
  group.position.copy(start);
  parent.add(group);
  let pos = new THREE.Vector3();
  let d = dir.clone().normalize();
  const step = length / segments;
  for (let i = 0; i < segments; i++) {
    const r0 = radius * (1 - i / segments);
    const r1 = radius * (1 - (i + 1) / segments) + 0.001;
    const seg = mesh(group, G.cyl(r1, r0, step * 1.15, 24), material);
    seg.position.copy(pos).addScaledVector(d, step / 2);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    pos = pos.clone().addScaledVector(d, step);
    d = d.clone().add(bend.clone().multiplyScalar(1 / segments)).normalize();
  }
  return group;
}

// ---- body ------------------------------------------------------------------

const DEFAULT_LOOK = {
  skin: 0xc68c5a,
  eyes: 0x4a2c17,
  shirt: 0xdddddd,
  pants: 0x333a44,
  shoe: 0xffffff,
  sole: 0x222222,
  glove: null,
  hair: 0x1d1410,
};

// Builds the jointed body. `look` sets base colors and materials; the outfit
// adds everything else to the returned joints.
export function buildRig(lookIn = {}) {
  const look = { ...DEFAULT_LOOK, ...lookIn };
  const mat = {
    skin: M.skin(look.skin),
    shirt: look.shirtMat ?? M.fabric(look.shirt),
    sleeve: look.sleeveMat ?? look.shirtMat ?? M.fabric(look.sleeve ?? look.shirt),
    pants: look.pantsMat ?? M.fabric(look.pants),
    shoe: look.shoeMat ?? M.plastic(look.shoe, 0.5),
    sole: M.rubber(look.sole),
    glove: look.glove !== null ? (look.gloveMat ?? M.plastic(look.glove, 0.6)) : null,
  };

  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.98;
  root.add(pelvis);

  // Hips and pants top.
  mesh(pelvis, G.lathe([[0.001, -0.13], [0.09, -0.125], [0.14, -0.085], [0.162, -0.02], [0.165, 0.04], [0.157, 0.1]], 0.7), mat.pants);

  const spine = new THREE.Group();
  pelvis.add(spine);
  const chest = new THREE.Group();
  chest.position.y = 0.0;
  spine.add(chest);
  const torso = mesh(chest, G.lathe([
    [0.15, 0.05], [0.148, 0.14], [0.158, 0.22], [0.185, 0.31], [0.208, 0.38],
    [0.216, 0.44], [0.2, 0.49], [0.15, 0.525], [0.08, 0.548], [0.06, 0.552],
  ], 0.64), mat.shirt);

  const neck = mesh(chest, G.cyl(0.05, 0.056, 0.13), mat.skin, 0, 0.6, -0.005);

  const head = new THREE.Group();
  head.position.set(0, 0.705, 0.005);
  chest.add(head);
  const face = buildHead(head, look, mat.skin);

  const arms = [-1, 1].map((side) => buildArm(chest, side, mat));
  const legs = [-1, 1].map((side) => buildLeg(pelvis, side, mat));

  return {
    root, pelvis, spine, chest, head, neck, torso, face, look, mat,
    armL: arms[1], armR: arms[0], legL: legs[1], legR: legs[0],
  };
}

function buildHead(head, look, skinMat) {
  const skull = mesh(head, headGeometry(), skinMat, 0, 0.012, 0);
  for (const sx of [-1, 1]) {
    const ear = mesh(head, G.sphere(0.03, 24, 16), skinMat, sx * 0.126, 0.0, -0.005);
    ear.scale.set(0.5, 1, 0.8);
  }
  const nose = mesh(head, G.sphere(0.02, 24, 16), skinMat, 0, -0.018, 0.128);
  nose.scale.set(1, 1.15, 1.1);

  const eyes = [];
  const white = M.plastic(0xffffff, 0.2);
  const iris = M.plastic(look.eyes, 0.3);
  if (look.eyeGlow) {
    iris.emissive = new THREE.Color(look.eyes);
    iris.emissiveIntensity = 2.5;
  }
  const pupil = M.plastic(0x050505, 0.2);
  const shine = M.glow(0xffffff, 1.5);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * 0.046, 0.018, 0.108);
    head.add(eye);
    mesh(eye, G.sphere(0.028, 32, 24), white).scale.set(1, 0.92, 1);
    mesh(eye, G.sphere(0.016, 32, 24), iris, 0, 0, 0.0215).scale.z = 0.5;
    mesh(eye, G.sphere(0.0085, 24, 16), pupil, 0, 0, 0.0262).scale.z = 0.5;
    mesh(eye, G.sphere(0.0035, 12, 8), shine, 0.006, 0.006, 0.03);
    const lid = mesh(eye, new THREE.SphereGeometry(0.0295, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), skinMat);
    lid.rotation.x = -0.3;
    eyes.push(eye);
    const brow = mesh(head, G.capsule(0.0075, 0.034), M.plastic(look.hair, 0.8), sx * 0.048, 0.066, 0.125);
    brow.rotation.z = Math.PI / 2 + sx * 0.12;
  }
  const mouth = mesh(head, G.torus(0.022, 0.0045, Math.PI * 0.8), M.plastic(0x6a2424, 0.5), 0, -0.064, 0.123);
  mouth.rotation.z = Math.PI + Math.PI * 0.1;
  mouth.rotation.x = -0.25;
  return { skull, eyes, mouth };
}

function buildArm(chest, side, mat) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.222, 0.455, 0);
  shoulder.rotation.z = side * 0.16;
  chest.add(shoulder);
  const deltoid = mesh(shoulder, G.sphere(0.08), mat.sleeve, -side * 0.01, -0.005, 0);
  deltoid.scale.set(1, 0.9, 1.05);
  const upper = mesh(shoulder, limbGeometry(0.066, 0.05, 0.2, 0.006), mat.sleeve, 0, -0.15, 0);

  const elbow = new THREE.Group();
  elbow.position.y = -0.29;
  elbow.rotation.x = -0.15;
  shoulder.add(elbow);
  const fore = mesh(elbow, limbGeometry(0.054, 0.042, 0.18, 0.006, 0.8), mat.sleeve, 0, -0.13, 0);

  const wrist = new THREE.Group();
  wrist.position.y = -0.265;
  elbow.add(wrist);
  const hand = buildHand(wrist, side, mat.glove ?? mat.skin, mat.skin, !!mat.glove);
  return { shoulder, elbow, wrist, deltoid, upper, fore, hand, side };
}

function buildHand(wrist, side, palmMat, fingerMat, gloved) {
  const palm = mesh(wrist, G.box(0.05, 0.105, 0.096, 0.022), palmMat, -side * 0.002, -0.058, 0);
  const fingers = [];
  const fm = gloved ? palmMat : fingerMat;
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.position.set(-side * 0.003, -0.105, -0.034 + i * 0.0225);
    f.rotation.x = 0;
    f.rotation.z = -side * 0.25;
    wrist.add(f);
    const len = i === 3 ? 0.034 : i === 0 ? 0.04 : 0.048;
    mesh(f, G.capsule(0.0125, len), fm, 0, -len / 2 - 0.006, 0);
    fingers.push(f);
  }
  const thumb = new THREE.Group();
  thumb.position.set(-side * 0.012, -0.04, 0.05);
  thumb.rotation.set(-0.6, 0, -side * 0.3);
  wrist.add(thumb);
  mesh(thumb, G.capsule(0.014, 0.034), fm, 0, -0.027, 0);
  return { palm, fingers, thumb };
}

function buildLeg(pelvis, side, mat) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.086, -0.06, 0);
  pelvis.add(hip);
  const thigh = mesh(hip, limbGeometry(0.088, 0.064, 0.28, 0.008), mat.pants, 0, -0.2, 0);

  const knee = new THREE.Group();
  knee.position.y = -0.43;
  hip.add(knee);
  const shin = mesh(knee, limbGeometry(0.066, 0.052, 0.3, 0.01, 0.75), mat.pants, 0, -0.2, 0);

  const ankle = new THREE.Group();
  ankle.position.y = -0.42;
  knee.add(ankle);
  const shoe = new THREE.Group();
  ankle.add(shoe);
  const upper = mesh(shoe, G.sphere(0.07), mat.shoe, 0, 0.0, 0.045);
  upper.scale.set(0.95, 0.75, 1.75);
  const collar = mesh(shoe, G.cyl(0.066, 0.07, 0.07), mat.shoe, 0, 0.02, -0.01);
  const sole = mesh(shoe, G.box(0.13, 0.035, 0.29, 0.016), mat.sole, 0, -0.05, 0.045);
  return { hip, knee, ankle, thigh, shin, shoe, shoeUpper: upper, collar, sole, side };
}

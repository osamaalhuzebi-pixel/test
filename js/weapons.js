// Weapon stats plus the meshes for held weapons and projectiles.
// Every model here points down -Z.
import * as THREE from '../vendor/three.module.js';

export const WEAPONS = {
  blaster: {
    id: 'blaster', name: 'Starter Blaster', icon: '⚡',
    cooldown: 0.17, damage: 9, speed: 65, gravity: 0, radius: 0.15, life: 1.4,
    verb: 'tagged',
  },
  slipper: {
    id: 'slipper', name: 'The Slipper', icon: '🩴',
    cooldown: 0.6, damage: 34, speed: 30, gravity: 16, radius: 0.32, life: 3,
    verb: 'bonked',
  },
};

export const WEAPON_ORDER = ['blaster', 'slipper'];

const mat = (color) => new THREE.MeshLambertMaterial({ color });

export function makeSlipper(color = 0x2fb35a) {
  const g = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.38), mat(color));
  const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 12), mat(color));
  heel.position.z = 0.17;
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12, Math.PI), mat(0xffffff));
  strap.rotation.y = Math.PI / 2;
  strap.position.set(0, 0.02, -0.06);
  g.add(sole, heel, strap);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function makeBlaster() {
  const g = new THREE.Group();
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.42), mat(0xffb703));
  bodyMesh.position.z = -0.12;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), mat(0x3a3a5a));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.42;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5ff2ff }));
  tip.position.z = -0.53;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), mat(0x8d5cf6));
  grip.position.set(0, -0.1, 0.02);
  g.add(bodyMesh, barrel, tip, grip);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export function makeHeldWeapon(id) {
  if (id === 'slipper') {
    const s = makeSlipper();
    s.rotation.z = Math.PI / 2;
    s.position.z = -0.1;
    return s;
  }
  return makeBlaster();
}

const boltGeo = new THREE.SphereGeometry(1, 8, 6);
const boltMats = {
  blue: new THREE.MeshBasicMaterial({ color: 0x5ff2ff }),
  red: new THREE.MeshBasicMaterial({ color: 0xff7a3d }),
};

export function makeProjectileMesh(id, team) {
  if (id === 'slipper') {
    const outer = new THREE.Group();
    const s = makeSlipper(team === 'blue' ? 0x2fb35a : 0xe76f51);
    s.scale.setScalar(1.4);
    outer.add(s);
    outer.userData.spinner = s;
    return outer;
  }
  const m = new THREE.Mesh(boltGeo, boltMats[team]);
  m.scale.set(0.09, 0.09, 0.45);
  return m;
}

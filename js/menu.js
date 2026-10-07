// Main menu background: Mjalli standing on a podium, turning slowly.
import * as THREE from '../vendor/three.module.js';
import { buildCharacter } from './characters.js';
import { makeHeldWeapon } from './weapons.js';
import { disposeScene } from './game.js';

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2b1a7a');
  grad.addColorStop(0.6, '#6a3fd1');
  grad.addColorStop(1, '#f08bd6');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class MenuScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = gradientTexture();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6a3fd1, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, -4);
    this.scene.add(key);

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.25, 0.35, 32),
      new THREE.MeshLambertMaterial({ color: 0xffd84a }),
    );
    podium.position.y = -0.175;
    this.scene.add(podium);

    this.model = buildCharacter('mjalli');
    this.model.handR.add(makeHeldWeapon('slipper'));
    this.scene.add(this.model.group);
    this.time = 0;
    this.resize(window.innerWidth, window.innerHeight);
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    const m = this.model;
    m.group.rotation.y = Math.sin(t * 0.6) * 0.7;
    m.body.position.y = Math.abs(Math.sin(t * 2)) * 0.04;
    m.armR.rotation.x = 0.5 + Math.sin(t * 2) * 0.15;
    m.armL.rotation.z = -0.15;
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // On wide screens Mjalli stands to the right of the menu buttons.
    const side = aspect > 1.2 ? 1.3 : 0;
    this.camera.position.set(side, 1.25, -5.2);
    this.camera.lookAt(side, 1.0, 0);
  }

  dispose() {
    disposeScene(this.scene);
    this.scene.background.dispose();
  }
}

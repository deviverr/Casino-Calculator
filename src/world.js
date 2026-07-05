// The 3D layer: an after-hours office with one glowing calculator-arcade
// cabinet in the middle of it. The game canvas becomes the CRT texture.

import * as THREE from 'three';
import { store } from './store.js';

const KEY_ROWS = [
  ['C', 'pm', '%', '/'],
  ['7', '8', '9', 'x'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '0', '.', '='],
];

const KEY_LABEL = { pm: '+/-', x: '×', '/': '÷', '-': '−' };

  const CAMS = {
    title: { pos: [1.9, 1.65, 3.1], tgt: [0, 1.25, 0] },
    play: { pos: [0, 1.52, 1.34], tgt: [0, 1.43, 0.2] },
    donate: { pos: [0.45, 0.85, 1.55], tgt: [0, 0.55, 0.3] },
  };

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(glCanvas, screenCanvas, onKey) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.Fog(0x05070c, 7, 20);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 40);
  camera.position.set(...CAMS.title.pos);

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x30364a, 0.9));
  const hemi = new THREE.HemisphereLight(0x2a3040, 0x0a0c10, 0.5);
  scene.add(hemi);

  const screenGlow = new THREE.PointLight(0x66ffcc, 1.4, 5, 1.6);
  screenGlow.position.set(0, 1.5, 0.9);
  scene.add(screenGlow);

  const marqueeGlow = new THREE.PointLight(0xffb640, 0.8, 3.5, 1.8);
  marqueeGlow.position.set(0, 2.15, 0.7);
  scene.add(marqueeGlow);

  const ceilA = new THREE.PointLight(0x8890a8, 0.55, 9, 1.4);
  ceilA.position.set(-2.6, 3.0, 3.2);
  scene.add(ceilA);
  const ceilB = new THREE.PointLight(0x8890a8, 0.5, 9, 1.4);
  ceilB.position.set(2.8, 3.0, 4.4);
  scene.add(ceilB);

  const exitGlow = new THREE.PointLight(0x2fff7a, 0.5, 3, 2);
  exitGlow.position.set(-5.6, 2.5, 4.5);
  scene.add(exitGlow);

  // ---------- materials ----------
  const mat = {
    floor: new THREE.MeshLambertMaterial({ color: 0x181b22 }),
    wall: new THREE.MeshLambertMaterial({ color: 0x222835 }),
    ceil: new THREE.MeshLambertMaterial({ color: 0x141720 }),
    body: new THREE.MeshLambertMaterial({ color: 0x2a2f3d }),
    bodyDark: new THREE.MeshLambertMaterial({ color: 0x1a1e28 }),
    trim: new THREE.MeshLambertMaterial({ color: 0xb98a2c }),
    desk: new THREE.MeshLambertMaterial({ color: 0x3a3428 }),
    metal: new THREE.MeshLambertMaterial({ color: 0x2c303a }),
    dark: new THREE.MeshLambertMaterial({ color: 0x11141a }),
    keyNum: new THREE.MeshLambertMaterial({ color: 0xd8dce4 }),
    keyOp: new THREE.MeshLambertMaterial({ color: 0xe8a33c }),
    keyEq: new THREE.MeshLambertMaterial({ color: 0x53c06c }),
    keyC: new THREE.MeshLambertMaterial({ color: 0xc75454 }),
    plant: new THREE.MeshLambertMaterial({ color: 0x1e4a2a }),
    pot: new THREE.MeshLambertMaterial({ color: 0x503a2a }),
  };

  const box = (w, h, d, m, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---------- office ----------
  const ROOM = 14;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), mat.ceil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3.2;
  scene.add(ceil);

  const mkWall = (w, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2), mat.wall);
    m.position.set(x, 1.6, z);
    m.rotation.y = ry;
    scene.add(m);
  };
  mkWall(ROOM * 2, 0, -6, 0);
  mkWall(ROOM * 2, 0, 9, Math.PI);
  mkWall(15, -6, 1.5, Math.PI / 2);
  mkWall(15, 6, 1.5, -Math.PI / 2);

  // night windows on the back wall
  const winTex = canvasTexture(256, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#0b1230');
    g.addColorStop(1, '#1c1030');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = Math.random() < 0.5 ? '#ffd97a' : '#7ac9ff';
      c.globalAlpha = 0.25 + Math.random() * 0.5;
      c.fillRect(Math.random() * 256 | 0, 50 + Math.random() * 78 | 0, 2, 2);
    }
    c.globalAlpha = 1;
  });
  for (const wx of [-3.6, 0, 3.6]) {
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.3),
      new THREE.MeshBasicMaterial({ map: winTex }),
    );
    win.position.set(wx, 1.9, -5.97);
    scene.add(win);
    box(2.56, 1.46, 0.04, mat.dark, wx, 1.9, -5.99);
  }

  // desks with dead monitors
  const mkDesk = (x, z, ry, monitorOn) => {
    const g = new THREE.Group();
    box(1.5, 0.06, 0.75, mat.desk, 0, 0.72, 0, g);
    for (const [lx, lz] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) {
      box(0.05, 0.72, 0.05, mat.metal, lx, 0.36, lz, g);
    }
    box(0.52, 0.34, 0.03, mat.dark, 0, 1.02, -0.12, g);
    if (monitorOn) {
      const scr = box(0.46, 0.28, 0.005, new THREE.MeshBasicMaterial({ color: 0x0d2b33 }), 0, 1.02, -0.1, g);
      scr.userData.flicker = true;
    }
    box(0.06, 0.12, 0.06, mat.metal, 0, 0.79, -0.12, g);
    // chair
    const seat = box(0.42, 0.05, 0.42, mat.dark, 0, 0.48, 0.55, g);
    box(0.42, 0.5, 0.05, mat.dark, 0, 0.75, 0.75, g);
    box(0.05, 0.46, 0.05, mat.metal, 0, 0.24, 0.55, g);
    void seat;
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
  };
  mkDesk(-3.1, 2.6, 0.5, false);
  mkDesk(-3.4, 5.0, 0.2, true);
  mkDesk(3.2, 3.0, -0.4, false);
  mkDesk(3.5, 5.6, -0.15, false);
  mkDesk(-0.4, 6.5, Math.PI + 0.3, false);

  // EXIT sign
  const exitTex = canvasTexture(128, 48, (c) => {
    c.fillStyle = '#03140a';
    c.fillRect(0, 0, 128, 48);
    c.fillStyle = '#2fff7a';
    c.font = 'bold 28px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('EXIT', 64, 26);
  });
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: exitTex }));
  exitSign.position.set(-5.97, 2.5, 4.5);
  exitSign.rotation.y = Math.PI / 2;
  scene.add(exitSign);

  // plant + water cooler
  box(0.3, 0.3, 0.3, mat.pot, 5.2, 0.15, -4.6);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), mat.plant);
  leaf.position.set(5.2, 0.85, -4.6);
  scene.add(leaf);
  box(0.4, 1.0, 0.4, new THREE.MeshLambertMaterial({ color: 0x37404e }), -5.2, 0.5, -3.8);
  const jug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.4, 10),
    new THREE.MeshLambertMaterial({ color: 0x3b6a8a, transparent: true, opacity: 0.85 }),
  );
  jug.position.set(-5.2, 1.22, -3.8);
  scene.add(jug);

  // ceiling light fixtures
  for (const [lx, lz] of [[-2.6, 3.2], [2.8, 4.4]]) {
    box(1.4, 0.05, 0.3, new THREE.MeshBasicMaterial({ color: 0x6a7284 }), lx, 3.17, lz);
  }

  // ---------- the cabinet ----------
  const cab = new THREE.Group();
  scene.add(cab);

  box(1.3, 2.06, 0.8, mat.body, 0, 1.03, 0, cab);          // main body
  box(1.36, 0.1, 0.86, mat.bodyDark, 0, 0.05, 0, cab);     // base skirt
  box(1.36, 0.04, 0.86, mat.trim, 0, 2.08, 0, cab);        // top trim

  // side art stripes
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xb9483c });
  for (const sx of [-0.651, 0.651]) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.9), stripeMat);
    stripe.position.set(sx, 1.03, -0.1);
    stripe.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    cab.add(stripe);
  }

  // marquee
  const marqueeTex = canvasTexture(512, 96, (c) => {
    c.fillStyle = '#33101c';
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#ffb640';
    c.font = 'bold 40px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('CASINO CALCULATOR', 256, 42);
    c.fillStyle = '#7dff8a';
    c.font = 'bold 16px monospace';
    c.fillText('= TRUE OR BLUFF =', 256, 76);
  });
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.24), new THREE.MeshBasicMaterial({ map: marqueeTex }));
  marquee.position.set(0, 1.95, 0.407);
  cab.add(marquee);
  box(1.3, 0.28, 0.02, mat.bodyDark, 0, 1.95, 0.392, cab);

  // CRT screen (the game)
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.magFilter = THREE.NearestFilter;
  screenTex.minFilter = THREE.LinearFilter;
  screenTex.generateMipmaps = false;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 0.78),
    new THREE.MeshBasicMaterial({ map: screenTex }),
  );
  screen.position.set(0, 1.43, 0.402);
  cab.add(screen);
  box(1.16, 0.9, 0.03, mat.bodyDark, 0, 1.43, 0.385, cab); // bezel

  // keypad deck
  const deck = new THREE.Group();
  deck.position.set(0, 0.93, 0.38);
  deck.rotation.x = -0.42;
  cab.add(deck);
  box(1.3, 0.06, 0.5, mat.bodyDark, 0, -0.03, 0.11, deck);

  const keyMeshes = [];
  const keyFont = (label) => canvasTexture(64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = '#10131a';
    c.font = 'bold 30px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, 32, 34);
  });

  KEY_ROWS.forEach((row, rI) => {
    row.forEach((k, cI) => {
      if (k === '0' && cI === 1) return; // wide zero occupies two cells
      const wide = k === '0';
      const w = wide ? 0.285 : 0.135;
      const keyMat = k === '=' ? mat.keyEq : k === 'C' ? mat.keyC
        : ['+', '-', 'x', '/', '%', 'pm'].includes(k) ? mat.keyOp : mat.keyNum;
      const key = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, 0.1), keyMat.clone());
      const x = -0.45 + cI * 0.15 + (wide ? 0.075 : 0);
      const z = -0.15 + rI * 0.065; // down the slope
      key.position.set(x, 0.02, z);
      key.userData.key = k;
      key.userData.baseY = 0.02;
      deck.add(key);
      const lab = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, 0.09),
        new THREE.MeshBasicMaterial({ map: keyFont(KEY_LABEL[k] || k), transparent: true }),
      );
      lab.rotation.x = -Math.PI / 2;
      lab.position.set(x, 0.039, z);
      lab.userData.key = k;
      deck.add(lab);
      keyMeshes.push(key, lab);
    });
  });

  // coin door + fake donation decal
  box(0.5, 0.42, 0.02, mat.bodyDark, 0, 0.42, 0.402, cab);
  const decal = canvasTexture(256, 128, (c) => {
    c.fillStyle = '#161a22';
    c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#b98a2c';
    c.lineWidth = 4;
    c.strokeRect(6, 6, 244, 116);
    c.fillStyle = '#0a0c10';
    c.fillRect(103, 22, 50, 10);
    c.fillStyle = '#ffb640';
    c.font = 'bold 17px monospace';
    c.textAlign = 'center';
    c.fillText('FAKE DONATIONS', 128, 66);
    c.fillText('ONLY', 128, 88);
    c.fillStyle = '#59d8ff';
    c.font = '11px monospace';
    c.fillText('NO REAL MONEY. EVER.', 128, 112);
  });
  const coinFace = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.38), new THREE.MeshBasicMaterial({ map: decal }));
  coinFace.position.set(0, 0.42, 0.415);
  cab.add(coinFace);

  // ---------- interaction ----------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  glCanvas.addEventListener('pointerdown', (e) => {
    const r = glCanvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(keyMeshes, false)[0];
    if (hit) onKey(hit.object.userData.key);
  });

  // ---------- camera rig ----------
  let camState = 'title';
  const curPos = new THREE.Vector3(...CAMS.title.pos);
  const curTgt = new THREE.Vector3(...CAMS.title.tgt);
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const pressed = new Map(); // key id -> time remaining

  function pressKey(k) {
    pressed.set(k, 0.12);
  }

  function fitForViewport(base, state) {
    const portrait = Math.max(0, Math.min(1, (0.82 - camera.aspect) / 0.38));
    if (!portrait) return base;
    const extraZ = state === 'play' ? 1.9 : state === 'donate' ? 0.38 : 0.78;
    const sideRelax = state === 'title' ? 0.68 : 0.82;
    return {
      pos: [
        base.pos[0] * sideRelax,
        base.pos[1] + 0.05 * portrait,
        base.pos[2] + extraZ * portrait,
      ],
      tgt: [
        base.tgt[0],
        base.tgt[1] + 0.03 * portrait,
        base.tgt[2],
      ],
    };
  }

  function resize() {
    const w = glCanvas.clientWidth || window.innerWidth;
    const h = glCanvas.clientHeight || (window.innerHeight - 28);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let elapsed = 0;

  function update(dt, cameraState) {
    elapsed += dt;
    camState = cameraState;

    // key press animation
    for (const [k, t] of pressed) {
      const nt = t - dt;
      if (nt <= 0) pressed.delete(k);
      else pressed.set(k, nt);
    }
    for (const m of keyMeshes) {
      if (m.userData.baseY === undefined) continue;
      const down = pressed.has(m.userData.key);
      m.position.y += ((down ? m.userData.baseY - 0.014 : m.userData.baseY) - m.position.y) * 0.5;
    }

    // camera
    let target;
    if (camState === 'orbit') {
      const a = elapsed * 0.12;
      target = fitForViewport({ pos: [Math.sin(a) * 3.3, 1.75, Math.cos(a) * 3.3], tgt: [0, 1.25, 0] }, 'title');
    } else {
      target = fitForViewport(CAMS[camState] || CAMS.title, camState);
    }
    const sway = store.settings.sway ? 1 : 0;
    const px = target.pos[0] + mouse.x * 0.06 * sway;
    const py = target.pos[1] - mouse.y * 0.04 * sway;
    const k = 1 - Math.pow(0.02, dt); // framerate-independent lerp
    curPos.lerp(new THREE.Vector3(px, py, target.pos[2]), k);
    curTgt.lerp(new THREE.Vector3(...target.tgt), k);
    camera.position.copy(curPos);
    camera.lookAt(curTgt);

    // living office
    screenGlow.intensity = 1.25 + Math.sin(elapsed * 2.1) * 0.15;
    ceilA.intensity = 0.55 + (Math.random() < 0.01 ? -0.25 : 0);
    scene.traverse((o) => {
      if (o.userData.flicker && Math.random() < 0.03) {
        o.material.color.setHex(Math.random() < 0.5 ? 0x0d2b33 : 0x11333d);
      }
    });

    screenTex.needsUpdate = true;
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);

  return { update, resize, pressKey };
}

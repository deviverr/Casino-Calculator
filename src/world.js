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

function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return t;
}

export function createWorld(glCanvas, screenCanvas, onKey) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090d14);
  scene.fog = new THREE.Fog(0x090d14, 10, 24);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 40);
  camera.position.set(...CAMS.title.pos);

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x536070, 1.15));
  const hemi = new THREE.HemisphereLight(0xa9b8ce, 0x1c2230, 0.85);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff2d0, 0.55);
  keyLight.position.set(-3.2, 4.5, 4.5);
  scene.add(keyLight);

  const screenGlow = new THREE.PointLight(0x66ffcc, 1.8, 5, 1.6);
  screenGlow.position.set(0, 1.5, 0.9);
  scene.add(screenGlow);

  const marqueeGlow = new THREE.PointLight(0xffb640, 1.2, 4, 1.8);
  marqueeGlow.position.set(0, 2.15, 0.7);
  scene.add(marqueeGlow);

  const ceilA = new THREE.PointLight(0xf3f7ff, 1.25, 9, 1.25);
  ceilA.position.set(-2.6, 3.0, 3.2);
  scene.add(ceilA);
  const ceilB = new THREE.PointLight(0xf3f7ff, 1.05, 9, 1.25);
  ceilB.position.set(2.8, 3.0, 4.4);
  scene.add(ceilB);
  const ceilC = new THREE.PointLight(0xffe8b0, 0.75, 7, 1.45);
  ceilC.position.set(0.2, 3.0, -2.0);
  scene.add(ceilC);

  const exitGlow = new THREE.PointLight(0x2fff7a, 0.75, 3, 2);
  exitGlow.position.set(-5.6, 2.5, 4.5);
  scene.add(exitGlow);

  // ---------- materials ----------
  const floorTex = canvasTexture(512, 512, (c) => {
    c.fillStyle = '#26313c';
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) {
      for (let x = 0; x < 512; x += 64) {
        c.fillStyle = ((x + y) / 64) % 2 ? '#202a34' : '#2b3743';
        c.fillRect(x, y, 64, 64);
        c.strokeStyle = '#111821';
        c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, 62, 62);
      }
    }
    for (let i = 0; i < 2600; i++) {
      const v = 42 + Math.random() * 40;
      c.fillStyle = `rgba(${v},${v + 12},${v + 20},0.28)`;
      c.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }
  }, { repeat: [7, 7] });

  const wallTex = canvasTexture(512, 256, (c) => {
    c.fillStyle = '#2f3a49';
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#384555';
    c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#212a35';
    c.fillRect(0, 192, 512, 64);
    c.strokeStyle = 'rgba(255,255,255,0.055)';
    for (let x = 0; x <= 512; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    for (let y = 64; y <= 192; y += 32) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }
  }, { repeat: [4, 2] });

  const ceilTex = canvasTexture(512, 512, (c) => {
    c.fillStyle = '#202734';
    c.fillRect(0, 0, 512, 512);
    c.strokeStyle = '#0f141c';
    c.lineWidth = 3;
    for (let x = 0; x <= 512; x += 128) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 512);
      c.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 900; i++) c.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }, { repeat: [6, 6] });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  for (const tex of [floorTex, wallTex, ceilTex]) tex.anisotropy = Math.min(8, maxAniso);

  const mat = {
    floor: new THREE.MeshLambertMaterial({ color: 0xffffff, map: floorTex }),
    wall: new THREE.MeshLambertMaterial({ color: 0xffffff, map: wallTex }),
    ceil: new THREE.MeshLambertMaterial({ color: 0xffffff, map: ceilTex }),
    body: new THREE.MeshLambertMaterial({ color: 0x2a2f3d }),
    bodyDark: new THREE.MeshLambertMaterial({ color: 0x1a1e28 }),
    trim: new THREE.MeshLambertMaterial({ color: 0xb98a2c }),
    desk: new THREE.MeshLambertMaterial({ color: 0x5a4c3d }),
    metal: new THREE.MeshLambertMaterial({ color: 0x596170 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x11141a }),
    partition: new THREE.MeshLambertMaterial({ color: 0x3f5062 }),
    paper: new THREE.MeshLambertMaterial({ color: 0xd8d0ba }),
    cork: new THREE.MeshLambertMaterial({ color: 0x8f6237 }),
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

  const plane = (w, h, m, x, y, z, ry = 0, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
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

  // baseboards and a little office clutter make the room read at a glance
  box(ROOM * 2, 0.08, 0.06, mat.metal, 0, 0.18, -5.95);
  box(ROOM * 2, 0.08, 0.06, mat.metal, 0, 0.18, 8.95);
  box(0.06, 0.08, 15, mat.metal, -5.95, 0.18, 1.5);
  box(0.06, 0.08, 15, mat.metal, 5.95, 0.18, 1.5);

  const whiteboardTex = canvasTexture(384, 192, (c) => {
    c.fillStyle = '#dce6df';
    c.fillRect(0, 0, 384, 192);
    c.strokeStyle = '#6e7880';
    c.lineWidth = 8;
    c.strokeRect(4, 4, 376, 184);
    c.fillStyle = '#3d5870';
    c.font = 'bold 22px monospace';
    c.fillText('Q3 SOLVENCY REVIEW', 28, 48);
    c.strokeStyle = '#c74f56';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(28, 134);
    c.lineTo(100, 102);
    c.lineTo(168, 116);
    c.lineTo(238, 70);
    c.lineTo(340, 88);
    c.stroke();
    c.fillStyle = '#293542';
    c.font = '16px monospace';
    c.fillText('NO REAL MONEY', 32, 164);
  });
  plane(1.9, 0.95, new THREE.MeshBasicMaterial({ map: whiteboardTex }), -4.15, 1.65, -5.965);

  const corkTex = canvasTexture(256, 192, (c) => {
    c.fillStyle = '#8c5b32';
    c.fillRect(0, 0, 256, 192);
    c.strokeStyle = '#56341d';
    c.lineWidth = 8;
    c.strokeRect(4, 4, 248, 184);
    const notes = [
      ['#f0e5b0', 28, 28, 60, 42],
      ['#bde3ff', 116, 34, 78, 50],
      ['#ffd0d0', 52, 104, 72, 48],
      ['#d7ffc4', 154, 112, 58, 42],
    ];
    for (const [col, x, y, w, h] of notes) {
      c.fillStyle = col;
      c.fillRect(x, y, w, h);
      c.fillStyle = '#2a2f36';
      c.fillRect(x + w / 2 - 3, y + 5, 6, 6);
    }
  });
  plane(1.15, 0.86, new THREE.MeshBasicMaterial({ map: corkTex }), 4.45, 1.55, -5.965);

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
    box(0.44, 0.018, 0.16, mat.dark, 0, 0.77, 0.16, g);
    box(0.24, 0.012, 0.18, mat.paper, -0.42, 0.77, -0.08, g);
    box(0.18, 0.012, 0.14, mat.paper, 0.48, 0.77, 0.1, g);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 10), new THREE.MeshLambertMaterial({ color: 0xb94d3b }));
    mug.position.set(0.54, 0.81, -0.18);
    g.add(mug);
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

  const mkPartition = (x, z, ry, w = 2.1) => {
    const p = box(w, 1.05, 0.06, mat.partition, x, 0.76, z);
    p.rotation.y = ry;
    box(w, 0.05, 0.08, mat.metal, x, 1.31, z).rotation.y = ry;
    return p;
  };
  mkPartition(-3.25, 3.55, 0.45);
  mkPartition(3.3, 4.0, -0.38);
  mkPartition(-0.8, 5.7, Math.PI + 0.12, 2.6);
  mkPartition(1.2, 6.55, Math.PI / 2, 1.9);

  // filing cabinets and a vending machine brighten the silhouettes in the side walls
  for (const [x, z] of [[5.55, -2.0], [5.55, -1.25]]) {
    box(0.36, 0.95, 0.52, new THREE.MeshLambertMaterial({ color: 0x687282 }), x, 0.48, z);
    box(0.28, 0.02, 0.03, mat.dark, x, 0.72, z - 0.265);
    box(0.28, 0.02, 0.03, mat.dark, x, 0.42, z - 0.265);
  }
  const vendingTex = canvasTexture(192, 384, (c) => {
    c.fillStyle = '#251823';
    c.fillRect(0, 0, 192, 384);
    c.fillStyle = '#ff4f6d';
    c.font = 'bold 28px monospace';
    c.textAlign = 'center';
    c.fillText('SODA', 96, 58);
    c.fillStyle = '#26384b';
    c.fillRect(28, 88, 98, 176);
    c.fillStyle = '#75d7ff';
    for (let y = 104; y < 252; y += 36) {
      for (let x = 42; x < 110; x += 28) c.fillRect(x, y, 16, 24);
    }
    c.fillStyle = '#11131a';
    c.fillRect(138, 92, 28, 96);
    c.fillStyle = '#ffd23e';
    c.fillRect(144, 110, 16, 8);
  });
  const vending = plane(0.72, 1.42, new THREE.MeshBasicMaterial({ map: vendingTex }), -5.97, 0.92, -1.1, Math.PI / 2);
  void vending;

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
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
  for (const [lx, lz] of [[-2.6, 3.2], [2.8, 4.4]]) {
    box(1.55, 0.05, 0.38, new THREE.MeshBasicMaterial({ color: 0x5f6878 }), lx, 3.17, lz);
    box(1.34, 0.02, 0.24, lightPanelMat, lx, 3.135, lz);
  }
  box(1.25, 0.05, 0.32, new THREE.MeshBasicMaterial({ color: 0x5f6878 }), 0.2, 3.17, -2.0);
  box(1.04, 0.02, 0.2, new THREE.MeshBasicMaterial({ color: 0xffe8b0 }), 0.2, 3.135, -2.0);

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

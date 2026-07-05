import './style.css';
import '@fontsource/press-start-2p';

import * as S from './screen.js';
import { store, load } from './store.js';
import { audio } from './audio.js';
import { game } from './game.js';

const $ = (id) => document.getElementById(id);

const KEYBOARD_MAP = {
  Enter: '=', ' ': '=', Escape: 'esc', Backspace: 'C',
  c: 'C', C: 'C', t: 'true', T: 'true', b: 'bluff', B: 'bluff', d: 'x', D: 'x',
  '+': '+', '-': '-', '*': 'x', x: 'x', X: 'x', '/': '/', '%': '%',
  '=': '=', '.': '.', p: 'pm', P: 'pm',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
};

const CALC_KEYS = ['C', 'pm', '%', '/', '7', '8', '9', 'x', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];
const CALC_LABEL = { pm: '±', x: '×', '/': '÷', '-': '−' };

let world = null;

function pressKey(k) {
  audio.init(); // audio context needs a user gesture; every key is one
  if (CALC_KEYS.includes(k)) world?.pressKey(k);
  game.key(k);
}

function setProgress(pct, hint) {
  $('loaderFill').style.width = `${pct}%`;
  if (hint) $('loaderHint').textContent = hint;
}

function buildFlatPad() {
  const pad = $('flatPad');
  for (const k of CALC_KEYS) {
    const b = document.createElement('button');
    b.textContent = CALC_LABEL[k] || k;
    if (k === '=') b.className = 'eq';
    else if (k === 'C') b.className = 'clear';
    else if (['+', '-', 'x', '/', '%', 'pm'].includes(k)) b.className = 'op';
    else if (k === '0') b.className = 'zero';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); pressKey(k); });
    pad.appendChild(b);
  }
}

async function boot() {
  load();
  setProgress(20, 'LOADING PIXEL FONT…');
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise((res) => setTimeout(res, 2500)),
    ]);
  } catch (e) { /* fall back to whatever monospace we get */ }

  setProgress(45, 'BUILDING THE OFFICE…');

  if (store.settings.video3d) {
    try {
      const { createWorld } = await import('./world.js');
      world = createWorld($('gl'), S.canvas, pressKey);
    } catch (e) {
      console.warn('WebGL unavailable, using 2D mode', e);
      world = null;
    }
  }

  if (!world) {
    $('gl').classList.add('hidden');
    $('flat').classList.remove('hidden');
    buildFlatPad();
  }

  setProgress(80, 'WAKING THE AUDITOR…');

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.autoPause();
  });

  // input
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let k = null;
    if (e.key >= '0' && e.key <= '9') k = e.key;
    else k = KEYBOARD_MAP[e.key] ?? null;
    if (k !== null) {
      e.preventDefault();
      pressKey(k);
    }
  });

  const flatCtx = world ? null : $('flatScreen').getContext('2d');

  game.go('boot');
  window.__cc = { game, S, store, audio, world }; // console debug handle
  setProgress(100, 'DEAL ME IN.');
  setTimeout(() => $('loader').classList.add('done'), 250);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S.tick(dt);
    game.update(dt);
    game.draw(dt);
    S.crtPass();
    if (world) {
      world.update(dt, game.cameraState());
    } else {
      flatCtx.imageSmoothingEnabled = false;
      flatCtx.drawImage(S.canvas, 0, 0);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();

// The game's entire UI renders onto this 480x360 offscreen canvas.
// In 3D mode it becomes the CRT texture; in 2D mode it's blitted directly.

import { store } from './store.js';

export const W = 480;
export const H = 360;

export const canvas = document.createElement('canvas');
canvas.width = W;
canvas.height = H;
export const ctx = canvas.getContext('2d');

export const PAL = {
  bg: '#0d1117',
  panel: '#161d29',
  panel2: '#1c2534',
  line: '#2e3b52',
  text: '#d7dde6',
  dim: '#66718a',
  amber: '#ffb640',
  green: '#7dff8a',
  red: '#ff5a5a',
  cyan: '#59d8ff',
  purple: '#b98aff',
  gold: '#ffd23e',
  dark: '#05070b',
};

let t = 0;
export function tick(dt) { t += dt; }
export function now() { return t; }
export function blink(period = 0.9) { return (t % period) < period * 0.6; }

export function clear(color = PAL.bg) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

export function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

export function frame(x, y, w, h, color = PAL.line, fill = null) {
  if (fill) rect(x, y, w, h, fill);
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, 2);
  ctx.fillRect(x | 0, (y + h - 2) | 0, w | 0, 2);
  ctx.fillRect(x | 0, y | 0, 2, h | 0);
  ctx.fillRect((x + w - 2) | 0, y | 0, 2, h | 0);
}

export function text(str, x, y, size = 8, color = PAL.text, align = 'left') {
  ctx.font = `${size}px "Press Start 2P"`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, Math.round(x), Math.round(y));
}

export function textShadow(str, x, y, size, color, align = 'left', shadow = PAL.dark) {
  text(str, x + Math.max(1, size / 8), y + Math.max(1, size / 8), size, shadow, align);
  text(str, x, y, size, color, align);
}

export function bar(x, y, w, h, pct, color, back = PAL.panel2) {
  rect(x, y, w, h, back);
  rect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, Math.max(0, pct))), h - 2, color);
}

export function wrap(str, maxChars) {
  const words = String(str).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// keycap hint, e.g. keyHint(10, 340, '=', 'CONFIRM')
export function keyHint(x, y, key, label, color = PAL.amber) {
  const kw = key.length * 8 + 8;
  frame(x, y - 2, kw, 13, PAL.line, PAL.panel2);
  text(key, x + 4, y + 1, 8, color);
  text(label, x + kw + 5, y + 1, 8, PAL.dim);
  return x + kw + 5 + label.length * 8 + 14; // next x
}

// ---------- CRT post-processing (drawn straight onto the canvas) ----------
let scanCache = null;

function buildScan() {
  scanCache = document.createElement('canvas');
  scanCache.width = W;
  scanCache.height = H;
  const c = scanCache.getContext('2d');
  c.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

export function crtPass() {
  if (!store.settings.crt) return;
  if (!scanCache) buildScan();
  ctx.drawImage(scanCache, 0, 0);
  if (store.settings.flash) {
    const flick = 0.02 + 0.015 * Math.sin(t * 47);
    ctx.fillStyle = `rgba(140,190,255,${flick.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// cracks overlay: damage rendered as glass fractures on the CRT itself
const CRACKS = [
  [[70, 40], [120, 90], [110, 160], [160, 200]],
  [[400, 60], [350, 110], [370, 190], [320, 230]],
  [[240, 330], [220, 260], [270, 210], [250, 150]],
  [[60, 300], [130, 270], [180, 300], [230, 320]],
  [[430, 300], [380, 260], [400, 200]],
];

export function drawCracks(n) {
  if (n <= 0) return;
  ctx.strokeStyle = 'rgba(210,230,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < Math.min(n, CRACKS.length); i++) {
    const pts = CRACKS[i];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < pts.length; j++) {
      const [px, py] = pts[j];
      ctx.lineTo(px + Math.sin(i * 7 + j * 13) * 4, py + Math.cos(i * 5 + j * 11) * 4);
      // splinters
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.sin(j * 31 + i) * 14, py + Math.cos(j * 17 + i) * 14);
      ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
}

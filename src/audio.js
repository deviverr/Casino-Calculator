// WebAudio engine: synthesized SFX + a tiny chiptune step-sequencer.
// No audio files — everything is generated, so the build stays lean.

import { store } from './store.js';

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(note) {
  // 'A4', 'C#3', 'Eb2' → Hz
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return 440;
  let semi = NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const oct = Number(m[3]);
  const midi = (oct + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---------- tracks ----------
// steps are 16th notes; null = rest, '.' = sustain handled as rest (punchy chip style)
const bar = (s) => s.trim().split(/\s+/).map((n) => (n === '.' ? null : n));

const TRACKS = {
  title: {
    bpm: 96,
    channels: [
      { type: 'triangle', vol: 0.30, notes: bar(`
        A1 . . A2 A1 . A2 . F1 . . F2 F1 . F2 .
        C2 . . C3 C2 . C3 . G1 . . G2 G1 . G2 .`) },
      { type: 'square', vol: 0.10, notes: bar(`
        . . A3 . C4 . E4 . . . A3 . C4 . F4 E4
        . . G3 . C4 . E4 . D4 . B3 . G3 . . .`) },
      { type: 'square', vol: 0.05, notes: bar(`
        E5 . . . . . . . . . C5 . . . . .
        . . . . E5 . . . . . D5 . . . B4 .`) },
    ],
  },
  round: {
    bpm: 138,
    channels: [
      { type: 'sawtooth', vol: 0.16, notes: bar(`
        A1 A1 . A1 . A1 A2 . A1 A1 . A1 G1 . G2 .
        F1 F1 . F1 . F1 F2 . E1 E1 . E1 E2 . E1 .`) },
      { type: 'square', vol: 0.07, notes: bar(`
        . . A4 . . . E4 . . . A4 . B4 C5 . .
        . . C5 . . . A4 . . . E4 . D4 E4 . .`) },
    ],
  },
  shop: {
    bpm: 112,
    channels: [
      { type: 'triangle', vol: 0.26, notes: bar(`
        C2 . G2 . E2 . G2 . F2 . C3 . A2 . C3 .
        G2 . D3 . B2 . D3 . C2 . G2 . C2 . . .`) },
      { type: 'square', vol: 0.08, notes: bar(`
        E4 . G4 . . C5 . . A4 . . F4 . A4 . .
        B4 . . G4 . D4 . . C4 . E4 G4 C5 . . .`) },
    ],
  },
  boss: {
    bpm: 150,
    channels: [
      { type: 'sawtooth', vol: 0.17, notes: bar(`
        E1 . E1 . F1 . E1 . E1 . E1 . D#1 . E1 .
        E1 . E1 . F1 . F#1 . G1 . F#1 . F1 . E1 .`) },
      { type: 'square', vol: 0.07, notes: bar(`
        . E5 . . . Eb5 . . . E5 . . . F5 . .
        . E5 . . . Eb5 . . . D5 . . . B4 . .`) },
    ],
  },
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      this.timer = setInterval(() => this.pump(), 30);
    } catch (e) { this.ctx = null; }
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = store.settings;
    this.master.gain.value = s.master;
    this.musicGain.gain.value = s.music;
    this.sfxGain.gain.value = s.sfx;
  }

  // ---------- music ----------
  music(name) {
    if (this.trackName === name) return;
    this.trackName = name;
    this.track = TRACKS[name] || null;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.08;
  }

  stopMusic() { this.trackName = null; this.track = null; }

  pump() {
    if (!this.ctx || !this.track) return;
    const spb = 60 / this.track.bpm / 4; // seconds per 16th
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      for (const ch of this.track.channels) {
        const note = ch.notes[this.step % ch.notes.length];
        if (note) this.blip(freq(note), spb * 0.9, ch.type, ch.vol, this.nextTime, this.musicGain);
      }
      // hats
      if (this.step % 4 === 2) this.noise(0.03, 0.03, 6000, this.nextTime, this.musicGain);
      this.step++;
      this.nextTime += spb;
    }
  }

  // ---------- primitives ----------
  blip(f, dur, type, vol, when, out) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(out || this.sfxGain);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  noise(dur, vol, cutoff, when, out) {
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(out || this.sfxGain);
    src.start(when);
  }

  seq(notes, gap, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    notes.forEach((n, i) => this.blip(typeof n === 'number' ? n : freq(n), dur, type, vol, t + i * gap));
  }

  // ---------- sfx ----------
  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'key': this.blip(2200, 0.02, 'square', 0.05, t); this.noise(0.02, 0.06, 4000, t); break;
      case 'nav': this.blip(900, 0.04, 'square', 0.05, t); break;
      case 'ok': this.seq(['C5', 'G5'], 0.06, 0.08, 'square', 0.07); break;
      case 'back': this.seq(['G4', 'C4'], 0.06, 0.08, 'square', 0.06); break;
      case 'denied': this.seq(['C3', 'C3'], 0.09, 0.09, 'sawtooth', 0.09); break;
      case 'deal': this.noise(0.06, 0.12, 2500, t); this.blip(500, 0.05, 'square', 0.06, t + 0.05); break;
      case 'tick': this.blip(1400, 0.015, 'square', 0.035, t); break;
      case 'win': this.seq(['C5', 'E5', 'G5', 'C6'], 0.07, 0.12, 'square', 0.08); break;
      case 'bigwin': this.seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.08, 0.16, 'triangle', 0.12); break;
      case 'wrong': this.noise(0.25, 0.16, 900, t); this.seq(['E3', 'C3', 'A2'], 0.1, 0.14, 'sawtooth', 0.1); break;
      case 'crack': this.noise(0.18, 0.22, 7000, t); this.blip(180, 0.2, 'sawtooth', 0.08, t); break;
      case 'shatter': this.noise(0.5, 0.25, 8000, t); this.seq(['A2', 'G#2', 'G2', 'F#2'], 0.14, 0.2, 'sawtooth', 0.1); break;
      case 'cash': this.noise(0.05, 0.1, 6000, t); this.seq(['B5', 'E6'], 0.07, 0.2, 'triangle', 0.12); break;
      case 'buy': this.seq(['E5', 'A5'], 0.05, 0.1, 'square', 0.08); this.noise(0.04, 0.08, 5000, t); break;
      case 'coin': this.seq([1200, 1800], 0.05, 0.1, 'square', 0.08); break;
      case 'flip': for (let i = 0; i < 8; i++) this.blip(700 + i * 120, 0.03, 'square', 0.05, t + i * 0.09); break;
      case 'alarm': this.seq(['E5', 'Bb4', 'E5', 'Bb4'], 0.13, 0.12, 'square', 0.09); break;
      case 'boot': this.seq(['C4', 'E4', 'G4'], 0.09, 0.1, 'triangle', 0.09); break;
      case 'gameover': this.seq(['E4', 'Eb4', 'D4', 'C#4', 'C4'], 0.16, 0.22, 'triangle', 0.12); break;
      case 'victory': this.seq(['C5', 'E5', 'G5', 'C6', 'G5', 'E6', 'C6', 'G6'], 0.09, 0.18, 'triangle', 0.12); break;
      case 'donate': this.seq([1200, 1800, 900, 2400, 3000], 0.06, 0.1, 'square', 0.08); break;
      case 'peek': this.seq(['B5', 'B5'], 0.08, 0.05, 'sine', 0.09); break;
    }
  }
}

export const audio = new AudioEngine();

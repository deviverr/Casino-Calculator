// Scene router + every screen the CRT can show.
// All input arrives as calculator key ids:
// 0-9 . = + - x / % pm C   (plus aliases: up/down/left/right/esc from a keyboard)

import * as S from './screen.js';
import { store, save, wipe, qualifies, addScore } from './store.js';
import { audio } from './audio.js';
import { Run } from './run.js';
import { BOOT_LINES, TWISTS, FINAL_ANTE, itemById, perkById, quotaFor } from './content.js';

const { PAL, W, H } = S;

export const game = {
  scene: 'boot',
  run: null,
  idle: 0,
  arg: null,

  go(name, arg = null) {
    this.arg = arg;
    this.scene = name;
    this.idle = 0;
    scenes[name].enter?.(arg);
  },

  key(k) {
    this.idle = 0;
    scenes[this.scene].key?.(k);
  },

  update(dt) {
    this.idle += dt;
    scenes[this.scene].update?.(dt);
  },

  draw(dt) {
    scenes[this.scene].draw(dt);
  },

  cameraState() {
    if (this.scene === 'donate') return 'donate';
    if (this.scene === 'boot' || this.scene === 'title' || this.scene === 'disclaimer') {
      return this.scene === 'title' && this.idle > 15 ? 'orbit' : 'title';
    }
    return 'play';
  },
};

const isUp = (k) => k === '+' || k === 'up' || k === '8';
const isDown = (k) => k === '-' || k === 'down' || k === '2';
const isBack = (k) => k === 'C' || k === 'esc';

const CONTROL_PRESETS = [
  {
    id: 'cabinet',
    name: '= TRUE / C BLUFF',
    trueKeys: ['=', 'true'],
    bluffKeys: ['C', 'bluff'],
    trueHint: '=',
    bluffHint: 'C',
    trueLabel: '= TRUE',
    bluffLabel: 'C BLUFF',
    note: 'GREEN = TRUE, RED C = BLUFF. T/B ALSO WORK.',
  },
  {
    id: 'classic',
    name: '+ TRUE / - BLUFF',
    trueKeys: ['+', 'true'],
    bluffKeys: ['-', 'bluff'],
    trueHint: '+',
    bluffHint: '-',
    trueLabel: '+ TRUE',
    bluffLabel: '- BLUFF',
    note: 'CLASSIC MATH SIGNS. T/B ALSO WORK.',
  },
  {
    id: 'letters',
    name: 'T TRUE / B BLUFF',
    trueKeys: ['true'],
    bluffKeys: ['bluff'],
    trueHint: 'T',
    bluffHint: 'B',
    trueLabel: 'T TRUE',
    bluffLabel: 'B BLUFF',
    note: 'KEYBOARD MODE. CABINET KEYS STILL TYPE WAGERS.',
  },
];

function controls() {
  return CONTROL_PRESETS.find((p) => p.id === store.settings.controls) || CONTROL_PRESETS[0];
}

function cycleControls(dir = 1) {
  const current = CONTROL_PRESETS.findIndex((p) => p.id === store.settings.controls);
  const next = (Math.max(0, current) + dir + CONTROL_PRESETS.length) % CONTROL_PRESETS.length;
  store.settings.controls = CONTROL_PRESETS[next].id;
  save();
  audio.sfx('nav');
}

function drawLogo(y) {
  S.textShadow('CASINO', W / 2, y, 24, PAL.amber, 'center');
  S.textShadow('CALCULATOR', W / 2, y + 30, 24, PAL.green, 'center');
  S.text('TRUE OR BLUFF? THE AUDITOR IS WAITING.', W / 2, y + 64, 8, PAL.dim, 'center');
}

function drawMenu(items, cursor, x, y, lh = 18) {
  items.forEach((it, i) => {
    const sel = i === cursor;
    if (sel) {
      S.rect(x - 6, y + i * lh - 3, 250, 14, PAL.panel2);
      S.text('>', x - 2, y + i * lh, 8, PAL.amber);
    }
    S.text(it.label, x + 12, y + i * lh, 8, it.dim ? PAL.dim : sel ? PAL.text : '#9aa4b8');
  });
}

function hintsRow(hints, y = H - 16) {
  let x = 8;
  for (const [k, label] of hints) x = S.keyHint(x, y, k, label);
}

// ======================================================================
// BOOT
// ======================================================================
let bootT = 0;

const boot = {
  enter() { bootT = 0; },
  update(dt) {
    bootT += dt;
    if (bootT > BOOT_LINES.length * 0.28 + 1.2) this.finish();
  },
  finish() {
    audio.sfx('boot');
    game.go(store.seenDisclaimer ? 'title' : 'disclaimer');
  },
  key() { this.finish(); },
  draw() {
    S.clear('#050807');
    const n = Math.min(BOOT_LINES.length, Math.floor(bootT / 0.28));
    for (let i = 0; i < n; i++) S.text(BOOT_LINES[i], 14, 16 + i * 14, 8, '#59ff87');
    if (S.blink(0.5)) S.text('_', 14, 16 + n * 14, 8, '#59ff87');
  },
};

// ======================================================================
// DISCLAIMER
// ======================================================================
const disclaimer = {
  key(k) {
    if (k === '=') {
      store.seenDisclaimer = true;
      save();
      audio.sfx('ok');
      game.go('title');
    }
  },
  draw() {
    S.clear();
    S.frame(12, 10, W - 24, H - 44, PAL.amber, PAL.panel);
    S.textShadow('READ ME, GAMBLER', W / 2, 22, 16, PAL.amber, 'center');
    const lines = [
      'CASINO CALCULATOR is a PARODY video game.',
      '',
      'NO REAL MONEY. Chips are fictional. Wins are',
      'fictional. Debts are fictional. Nothing here',
      'can be bought, sold, cashed out or refunded.',
      '',
      'NO REAL GAMBLING. Outcomes are for fun, the',
      'odds are made up, and the house is a prop.',
      '',
      'IN-GAME "DONATIONS" ARE FAKE. The donation',
      'machine is a joke and accepts only fake chips.',
      'The only real link is the optional tip jar',
      'below the screen. It buys the dev coffee.',
      '',
      'If gambling stops being fun in real life,',
      'talk to someone. gamblingtherapy.org',
    ];
    let y = 48;
    for (const ln of lines) { S.text(ln, 28, y, 8, ln.includes('FAKE') || ln.includes('NO REAL') ? PAL.green : PAL.text); y += 15; }
    if (S.blink()) S.text('PRESS = TO AGREE AND ENTER', W / 2, H - 24, 8, PAL.amber, 'center');
  },
};

// ======================================================================
// TITLE
// ======================================================================
const title = {
  cursor: 0,
  items() {
    const it = [];
    if (store.runSave) it.push({ id: 'continue', label: `CONTINUE  (ANTE ${store.runSave.ante})` });
    it.push({ id: 'new', label: 'NEW RUN' });
    it.push({ id: 'howto', label: 'HOW TO PLAY' });
    it.push({ id: 'leaderboard', label: 'LEADERBOARD' });
    it.push({ id: 'settings', label: 'SETTINGS' });
    it.push({ id: 'donate', label: 'DONATE (FAKE)' });
    it.push({ id: 'disclaimer', label: 'DISCLAIMER' });
    return it;
  },
  enter() { audio.music('title'); this.cursor = 0; },
  key(k) {
    const items = this.items();
    if (isUp(k)) { this.cursor = (this.cursor + items.length - 1) % items.length; audio.sfx('nav'); }
    else if (isDown(k)) { this.cursor = (this.cursor + 1) % items.length; audio.sfx('nav'); }
    else if (k === '=') {
      const id = items[this.cursor].id;
      audio.sfx('ok');
      if (id === 'continue') { game.run = Run.restore(store.runSave); game.go('play'); }
      else if (id === 'new') { game.run = new Run(); game.go('play'); }
      else game.go(id);
    }
  },
  draw() {
    S.clear();
    drawLogo(34);
    drawMenu(this.items(), this.cursor, W / 2 - 110, 140);
    S.text(`v2.0  ·  RUNS PLAYED: ${store.runsPlayed}`, W / 2, H - 46, 8, PAL.dim, 'center');
    if (game.idle > 15 && S.blink()) {
      S.textShadow('INSERT COIN (PLEASE DO NOT)', W / 2, H - 70, 8, PAL.gold, 'center');
    }
    hintsRow([['+', 'UP'], ['-', 'DOWN'], ['=', 'SELECT']]);
  },
};

// ======================================================================
// HOW TO PLAY
// ======================================================================
const HOWTO_PAGES = [
  [
    ['THE LOOP', PAL.amber],
    ['Each ANTE, the machine loads a MAGAZINE of', 0],
    ['equation shells. You can see HOW MANY are', 0],
    ['TRUE and how many are BLUFFS - not which.', 0],
    ['', 0],
    ['For each shell: type a WAGER, press = to', 0],
    ['DEAL, then call TRUE or BLUFF before', 0],
    ['the timer dies. Default cabinet controls:', 0],
    ['= TRUE and C BLUFF. T/B also work.', PAL.green],
    ['Bluffs are subtle: off by', 0],
    ['a little, or two digits swapped.', 0],
    ['', 0],
    ['Count the shells. If only bluffs remain,', PAL.green],
    ['you KNOW. Bet like you know.', PAL.green],
  ],
  [
    ['DEBT & DAMAGE', PAL.amber],
    ['When the magazine runs dry, the AUDITOR', 0],
    ['collects a DEBT. Cannot pay = REPOSSESSED.', 0],
    ['', 0],
    ['Every wrong call CRACKS the LCD. Run out', 0],
    ['of integrity and the screen SHATTERS.', 0],
    ['Both endings are permanent. Runs are runs.', 0],
    ['', 0],
    ['Winning builds a COMBO multiplier. After', 0],
    ['any win you may LET IT RIDE on a coin', 0],
    ['flip: double or lose the whole payout.', 0],
    ['Survive ANTE 8 to go SOLVENT.', PAL.green],
  ],
  [
    ['SHOP & TOOLS', PAL.amber],
    ['Between antes, spend chips on:', 0],
    ['', 0],
    ['PERKS - passive cheats. Slower clocks,', 0],
    ['insurance, bluff bounties, weighted coins.', 0],
    ['Five slots. Choose a build.', 0],
    ['', 0],
    ['ITEMS - one-shot tools used mid-shell', 0],
    ['with keys 1-4: PEEK the last digit,', 0],
    ['LENS the truth, EJECT the shell, FREEZE', 0],
    ['the clock, or slot a JACKPOT CELL (x3', 0],
    ['pay... 2 cracks if wrong).', 0],
  ],
];

const howto = {
  page: 0,
  enter() { this.page = 0; },
  key(k) {
    if (isBack(k)) { audio.sfx('back'); game.go('title'); }
    else if (k === '=' || isDown(k) || k === 'right' || k === '6') {
      if (this.page < HOWTO_PAGES.length - 1) { this.page++; audio.sfx('nav'); }
      else { audio.sfx('back'); game.go('title'); }
    } else if (isUp(k) || k === 'left' || k === '4') {
      if (this.page > 0) { this.page--; audio.sfx('nav'); }
    }
  },
  draw() {
    S.clear();
    S.frame(12, 10, W - 24, H - 44, PAL.line, PAL.panel);
    S.textShadow(`HOW TO PLAY  ${this.page + 1}/${HOWTO_PAGES.length}`, W / 2, 22, 16, PAL.cyan, 'center');
    let y = 52;
    for (const [ln, col] of HOWTO_PAGES[this.page]) {
      S.text(ln, 28, y, 8, col || PAL.text);
      y += 16;
    }
    hintsRow([['=', 'NEXT'], ['+', 'PREV'], ['C', 'BACK']]);
  },
};

// ======================================================================
// SETTINGS
// ======================================================================
const settings = {
  cursor: 0,
  confirmWipe: false,
  rows() {
    const s = store.settings;
    return [
      { id: 'master', label: 'MASTER VOLUME', val: s.master },
      { id: 'music', label: 'MUSIC VOLUME', val: s.music },
      { id: 'sfx', label: 'SFX VOLUME', val: s.sfx },
      { id: 'crt', label: 'CRT EFFECTS', val: s.crt },
      { id: 'sway', label: 'CAMERA SWAY', val: s.sway },
      { id: 'flash', label: 'FLICKER FX', val: s.flash },
      { id: 'controls', label: 'CALL CONTROLS', val: controls().name },
      { id: 'video3d', label: 'RENDERER', val: s.video3d },
      { id: 'disclaimer', label: 'VIEW DISCLAIMER' },
      { id: 'wipe', label: this.confirmWipe ? 'SURE? = ERASES EVERYTHING' : 'RESET ALL DATA' },
    ];
  },
  enter() { this.cursor = 0; this.confirmWipe = false; },
  adjust(row, dir) {
    const s = store.settings;
    if (['master', 'music', 'sfx'].includes(row.id)) {
      s[row.id] = Math.round(Math.min(1, Math.max(0, s[row.id] + dir * 0.1)) * 10) / 10;
      audio.applyVolumes();
      audio.sfx('nav');
    } else if (['crt', 'sway', 'flash'].includes(row.id)) {
      s[row.id] = !s[row.id];
      audio.sfx('nav');
    } else if (row.id === 'controls') {
      cycleControls(dir);
      return;
    } else if (row.id === 'video3d') {
      s.video3d = !s.video3d;
      save();
      location.reload();
      return;
    }
    save();
  },
  key(k) {
    const rows = this.rows();
    if (isBack(k)) { audio.sfx('back'); game.go('title'); return; }
    if (isUp(k)) { this.cursor = (this.cursor + rows.length - 1) % rows.length; this.confirmWipe = false; audio.sfx('nav'); return; }
    if (isDown(k)) { this.cursor = (this.cursor + 1) % rows.length; this.confirmWipe = false; audio.sfx('nav'); return; }
    const row = rows[this.cursor];
    if (k === '4' || k === 'left') this.adjust(row, -1);
    else if (k === '6' || k === 'right') this.adjust(row, +1);
    else if (k === '=') {
      if (row.id === 'disclaimer') game.go('disclaimer_view');
      else if (row.id === 'wipe') {
        if (!this.confirmWipe) { this.confirmWipe = true; audio.sfx('denied'); }
        else { wipe(); audio.sfx('shatter'); game.go('boot'); }
      } else this.adjust(row, +1);
    }
  },
  draw() {
    S.clear();
    S.textShadow('SETTINGS', W / 2, 20, 16, PAL.cyan, 'center');
    const rows = this.rows();
    let y = 60;
    rows.forEach((row, i) => {
      const sel = i === this.cursor;
      if (sel) S.rect(24, y - 4, W - 48, 16, PAL.panel2);
      S.text((sel ? '> ' : '  ') + row.label, 32, y, 8, sel ? PAL.text : '#9aa4b8');
      if (typeof row.val === 'number') {
        S.bar(300, y, 120, 8, row.val, PAL.green);
        S.text(String(Math.round(row.val * 10)), 430, y, 8, PAL.dim);
      } else if (typeof row.val === 'boolean') {
        const label = row.id === 'video3d' ? (row.val ? '3D' : '2D') : row.val ? 'ON' : 'OFF';
        S.text(label, 300, y, 8, row.val ? PAL.green : PAL.red);
      } else if (typeof row.val === 'string') {
        S.text(row.val, 238, y, 8, PAL.amber);
      }
      y += 24;
    });
    if (this.rows()[this.cursor].id === 'controls') {
      S.text(controls().note, W / 2, H - 40, 8, PAL.dim, 'center');
    } else if (this.rows()[this.cursor].id === 'video3d') {
      S.text('SWITCHING RENDERER RELOADS THE GAME', W / 2, H - 40, 8, PAL.dim, 'center');
    }
    hintsRow([['+', 'UP'], ['-', 'DN'], ['4', 'LESS'], ['6', 'MORE'], ['=', 'SET'], ['C', 'BACK']]);
  },
};

// read-only disclaimer view from settings
const disclaimer_view = {
  key(k) { if (k === '=' || isBack(k)) { audio.sfx('back'); game.go('settings'); } },
  draw() { disclaimer.draw(); },
};

// ======================================================================
// LEADERBOARD
// ======================================================================
const leaderboard = {
  highlight: -1,
  enter(arg) { this.highlight = arg?.highlight ?? -1; },
  key(k) { if (k === '=' || isBack(k)) { audio.sfx('back'); game.go('title'); } },
  draw() {
    S.clear();
    S.textShadow('HALL OF SOLVENCY', W / 2, 18, 16, PAL.gold, 'center');
    S.text('LOCAL RANKINGS - THIS MACHINE ONLY', W / 2, 42, 8, PAL.dim, 'center');
    const lb = store.leaderboard;
    if (!lb.length) {
      S.text('NO SURVIVORS YET.', W / 2, 140, 8, PAL.dim, 'center');
      S.text('THE AUDITOR REMAINS UNDEFEATED.', W / 2, 158, 8, PAL.dim, 'center');
    }
    let y = 70;
    S.text('RK  NAME       SCORE     ANTE', 60, y, 8, PAL.dim);
    y += 18;
    lb.forEach((e, i) => {
      const col = i === this.highlight ? PAL.gold : i === 0 ? PAL.green : PAL.text;
      const rank = String(i + 1).padStart(2, ' ');
      const name = e.name.padEnd(9, ' ');
      const score = String(e.score).padStart(7, ' ');
      const ante = e.ante > FINAL_ANTE ? 'OT' + (e.ante - FINAL_ANTE) : String(e.ante);
      S.text(`${rank}  ${name}${score}      ${ante}`, 60, y, 8, col);
      if (i === this.highlight && S.blink()) S.text('*', 40, y, 8, PAL.gold);
      y += 18;
    });
    hintsRow([['=', 'BACK']]);
  },
};

// ======================================================================
// NAME ENTRY (arcade initials)
// ======================================================================
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nameentry = {
  chars: [0, 0, 0],
  pos: 0,
  score: 0,
  ante: 1,
  enter(arg) {
    this.chars = [0, 0, 0];
    this.pos = 0;
    this.score = arg.score;
    this.ante = arg.ante;
    audio.music('title');
  },
  key(k) {
    if (isUp(k)) { this.chars[this.pos] = (this.chars[this.pos] + 1) % 26; audio.sfx('nav'); }
    else if (isDown(k)) { this.chars[this.pos] = (this.chars[this.pos] + 25) % 26; audio.sfx('nav'); }
    else if (k === '4' || k === 'left') { this.pos = Math.max(0, this.pos - 1); audio.sfx('nav'); }
    else if (k === '=' || k === '6' || k === 'right') {
      if (this.pos < 2) { this.pos++; audio.sfx('nav'); }
      else {
        const name = this.chars.map((c) => ALPHA[c]).join('');
        const idx = addScore(name, this.score, this.ante);
        audio.sfx('victory');
        game.go('leaderboard', { highlight: idx });
      }
    }
  },
  draw() {
    S.clear();
    S.textShadow('YOU MADE THE BOARD', W / 2, 50, 16, PAL.gold, 'center');
    S.text(`SCORE ${this.score}`, W / 2, 84, 8, PAL.green, 'center');
    this.chars.forEach((c, i) => {
      const x = W / 2 - 60 + i * 60;
      const sel = i === this.pos;
      S.frame(x - 22, 130, 44, 52, sel ? PAL.amber : PAL.line, PAL.panel);
      S.text(ALPHA[c], x, 146, 24, sel ? PAL.amber : PAL.text, 'center');
      if (sel && S.blink(0.5)) S.rect(x - 14, 186, 28, 3, PAL.amber);
    });
    S.text('SIGN THE MACHINE', W / 2, 220, 8, PAL.dim, 'center');
    hintsRow([['+', 'A-Z'], ['-', 'Z-A'], ['=', 'NEXT/OK']]);
  },
};

// ======================================================================
// DONATE (100% fake)
// ======================================================================
const THANKS = [
  'THANK YOU. NOTHING HAPPENED.',
  'YOUR GENEROSITY HAS BEEN SIMULATED.',
  'A PLAQUE WITH YOUR NAME HAS BEEN IMAGINED.',
  'THE AUDITOR SHED ONE (1) FAKE TEAR.',
  'A STATUE OF YOU WAS BUILT, THEN UNBUILT.',
  'GDP UNAFFECTED. HEART: WARMED.',
];

const donate = {
  thanks: '',
  thanksT: 0,
  enter() { this.thanks = ''; audio.music('shop'); },
  give(n) {
    store.donated += n;
    save();
    this.thanks = THANKS[Math.min(THANKS.length - 1, Math.floor(Math.random() * THANKS.length))];
    this.thanksT = 3;
    audio.sfx('donate');
  },
  update(dt) { if (this.thanksT > 0) this.thanksT -= dt; },
  key(k) {
    if (isBack(k)) { audio.sfx('back'); game.go('title'); return; }
    if (k === '1') this.give(10);
    else if (k === '2') this.give(100);
    else if (k === '3') this.give(10000);
  },
  draw() {
    S.clear();
    S.textShadow('FAKE DONATION MACHINE', W / 2, 18, 16, PAL.purple, 'center');
    // coin slot art
    S.frame(W / 2 - 60, 50, 120, 70, PAL.line, PAL.panel);
    S.rect(W / 2 - 30, 74, 60, 8, PAL.dark);
    S.text('INSERT FAKE CHIPS', W / 2, 96, 8, PAL.dim, 'center');
    S.text(`TOTAL FAKELY DONATED: ${store.donated}`, W / 2, 140, 8, PAL.gold, 'center');
    S.text('THESE CHIPS DO NOT EXIST. NEITHER DOES', W / 2, 166, 8, PAL.dim, 'center');
    S.text('THIS CHARITY. NO REAL MONEY. EVER.', W / 2, 180, 8, PAL.dim, 'center');
    if (this.thanksT > 0) S.textShadow(this.thanks, W / 2, 212, 8, PAL.green, 'center');
    S.text('REAL (OPTIONAL) TIP JAR: LINK BELOW SCREEN', W / 2, 260, 8, PAL.cyan, 'center');
    hintsRow([['1', 'GIVE 10'], ['2', 'GIVE 100'], ['3', 'GIVE 10000'], ['C', 'BACK']]);
  },
};

// ======================================================================
// PLAY (the run)
// ======================================================================
const play = {
  paused: false,
  pauseStart: 0,
  rideT: 0,
  auditFlash: 0,

  enter() { this.paused = false; this.rideT = 0; },

  music() {
    const r = game.run;
    if (!r) return;
    if (r.phase === 'shop' || r.phase === 'audit' || r.phase === 'victory') audio.music('shop');
    else if (r.round.twist) audio.music('boss');
    else audio.music('round');
  },

  update(dt) {
    const r = game.run;
    if (!r || this.paused) return;
    this.music();
    r.update();
    if (r.phase === 'ride') {
      this.rideT += dt;
      if (this.rideT > 1.4) { this.rideT = 0; r.resolveRide(); }
    }
    if (r.phase === 'dead') game.go('gameover', { score: r.score, ante: r.ante, reason: r.deathReason });
    // timer ticks
    if (r.phase === 'call' && !r.mods.frozen) {
      const left = r.timeLeft();
      if (left < 3000 && Math.floor(left / 500) !== Math.floor((left + dt * 1000) / 500)) audio.sfx('tick');
    }
  },

  togglePause() {
    const r = game.run;
    if (this.paused) {
      if (r.phase === 'call') r.callDeadline += performance.now() - this.pauseStart;
      this.paused = false;
    } else {
      this.paused = true;
      this.pauseStart = performance.now();
    }
    audio.sfx('nav');
  },

  key(k) {
    const r = game.run;
    if (!r) return;
    if (this.paused) {
      if (k === '=') this.togglePause();
      else if (isBack(k)) { audio.sfx('back'); game.go('title'); }
      return;
    }
    if (k === 'pm' || k === 'esc') { this.togglePause(); return; }

    switch (r.phase) {
      case 'wager':
        if (k >= '0' && k <= '9') r.typeDigit(k);
        else if (k === 'C') r.clearWager();
        else if (k === '%') r.setWagerPct(0.5);
        else if (k === 'x') r.setWagerPct(1);
        else if (k === '=') r.deal();
        else if (k === '/') r.cashOut();
        break;
      case 'call':
        if (controls().trueKeys.includes(k)) r.resolve(true);
        else if (controls().bluffKeys.includes(k)) r.resolve(false);
        else if (k >= '1' && k <= '4') r.useItem(Number(k) - 1);
        break;
      case 'result':
        if (k === '=') r.continueFromResult();
        else if (k === 'x' && r.canRide()) r.startRide();
        break;
      case 'audit':
        if (k === '=') r.payAudit();
        break;
      case 'shop': this.shopKey(k); break;
      case 'victory':
        if (k === '=') { audio.sfx('ok'); r.enterOvertime(); }
        else if (isBack(k)) {
          r.endRunVoluntarily();
          if (qualifies(r.score)) game.go('nameentry', { score: r.score, ante: r.ante });
          else game.go('title');
        }
        break;
    }
  },

  shopKey(k) {
    const r = game.run;
    const offers = r.shopOffers();
    if (isUp(k)) { r.shop.cursor = (r.shop.cursor + offers.length - 1) % offers.length; audio.sfx('nav'); }
    else if (isDown(k)) { r.shop.cursor = (r.shop.cursor + 1) % offers.length; audio.sfx('nav'); }
    else if (k === '=') { r.shop.cursor = Math.min(r.shop.cursor, offers.length - 1); r.shopBuy(offers[r.shop.cursor]); }
    else if (k === '/') r.shopReroll();
    else if (isBack(k)) r.leaveShop();
  },

  // ---------- drawing ----------
  draw(dt) {
    const r = game.run;
    if (!r) { S.clear(); return; }
    S.clear();
    this.drawTopBar(r);
    switch (r.phase) {
      case 'wager': this.drawTable(r); this.drawWager(r); break;
      case 'call': this.drawTable(r); this.drawCall(r); break;
      case 'result': this.drawTable(r); this.drawResult(r); break;
      case 'ride': this.drawTable(r); this.drawRide(r); break;
      case 'audit': this.drawAudit(r); break;
      case 'shop': this.drawShop(r); break;
      case 'victory': this.drawVictory(r); break;
    }
    if (r.msgT > 0) S.textShadow(r.msg, W / 2, H - 34, 8, PAL.red, 'center');
    S.drawCracks(r.maxIntegrity - r.integrity);
    if (this.paused) this.drawPause();
  },

  drawTopBar(r) {
    S.rect(0, 0, W, 26, PAL.dark);
    S.rect(0, 26, W, 2, PAL.line);
    S.text(`CHIPS ${r.chips}`, 8, 9, 8, PAL.gold);
    const anteLabel = r.overtime || r.ante > FINAL_ANTE ? `OT${r.ante - FINAL_ANTE}` : `${r.ante}/${FINAL_ANTE}`;
    S.text(`ANTE ${anteLabel}`, 150, 9, 8, PAL.cyan);
    S.text(`DEBT ${r.round.quota}`, 240, 9, 8, PAL.red);
    // integrity blocks
    S.text('LCD', 352, 9, 8, PAL.dim);
    for (let i = 0; i < r.maxIntegrity; i++) {
      S.rect(384 + i * 12, 8, 9, 10, i < r.integrity ? PAL.green : '#3a2430');
    }
  },

  drawTable(r) {
    // left panel: magazine + items + perks
    S.frame(6, 34, 140, H - 60, PAL.line, PAL.panel);
    S.text('MAGAZINE', 14, 42, 8, PAL.dim);
    const shells = r.round.shells;
    shells.forEach((s, i) => {
      const x = 14 + (i % 8) * 16;
      const y = 58 + Math.floor(i / 8) * 16;
      let col = '#39445c'; // upcoming
      if (i < r.round.idx) col = s.isTrue ? PAL.green : PAL.red;
      else if (i === r.round.idx) col = S.blink(0.6) ? PAL.text : '#8f9ab2';
      S.rect(x, y, 12, 12, col);
    });
    const compY = 96;
    if (r.round.twist === 'blind') {
      S.text('LEFT: ?T ?B', 14, compY, 8, PAL.purple);
    } else {
      S.text(`LEFT:`, 14, compY, 8, PAL.dim);
      S.text(`${r.round.remTrue}T`, 60, compY, 8, PAL.green);
      S.text(`${r.round.remBluff}B`, 90, compY, 8, PAL.red);
    }
    S.text(`COMBO x${r.round.combo.toFixed(1)}`, 14, compY + 14, 8, r.round.combo > 1 ? PAL.amber : PAL.dim);

    S.text('ITEMS 1-4', 14, 136, 8, PAL.dim);
    for (let i = 0; i < 4; i++) {
      const id = r.items[i];
      S.text(`${i + 1} ${id ? itemById(id).name : '-'}`, 14, 150 + i * 13, 8, id ? PAL.cyan : '#39445c');
    }

    S.text('PERKS', 14, 212, 8, PAL.dim);
    for (let i = 0; i < 5; i++) {
      const id = r.perks[i];
      S.text(id ? perkById(id).name : '-', 14, 226 + i * 13, 8, id ? PAL.purple : '#39445c');
    }

    if (r.round.twist) {
      const tw = TWISTS[r.round.twist];
      S.frame(6, H - 22, 140, 18, PAL.red, '#2a1420');
      S.text(tw.name, 12, H - 17, 8, PAL.red);
    }
  },

  mainX: 160,

  drawWager(r) {
    const x = this.mainX;
    S.text(`SHELL ${r.round.idx + 1}/${r.round.shells.length}`, x, 44, 8, PAL.dim);
    S.textShadow('PLACE YOUR WAGER', x, 66, 16, PAL.text);
    S.frame(x, 96, 220, 34, PAL.amber, PAL.dark);
    const wtxt = r.wagerStr || '0';
    S.text(wtxt + (S.blink(0.7) ? '_' : ''), x + 10, 106, 16, PAL.gold);
    S.text(`OF ${r.chips}`, x + 232, 108, 8, PAL.dim);
    if (r.round.twist === 'highstakes') S.text(`MIN WAGER ${r.minWager()} (HIGH STAKES)`, x, 140, 8, PAL.red);
    let y = 168;
    S.text('TYPE DIGITS. THE MACHINE IS', x, y, 8, PAL.dim);
    S.text('LITERALLY A CALCULATOR.', x, y + 13, 8, PAL.dim);
    const hints = [['0-9', 'TYPE'], ['%', 'HALF'], ['x', 'ALL-IN'], ['=', 'DEAL']];
    if (r.canCashOut()) hints.push(['/', 'CASH OUT']);
    let hx = x;
    for (const [k, label] of hints.slice(0, 4)) hx = S.keyHint(hx, 220, k, label);
    hx = x;
    if (r.canCashOut()) hx = S.keyHint(hx, 240, '/', `CASH OUT (DEBT ${r.round.quota} PAID EARLY)`, PAL.green);
    S.keyHint(x, 262, 'C', 'CLEAR', PAL.dim);
    const c = controls();
    hintsRow([[`${c.trueHint}/${c.bluffHint}`, 'LATER: TRUE/BLUFF'], ['+/-', 'MENU NAV'], ['pm', 'PAUSE']], H - 16);
  },

  drawCall(r) {
    const x = this.mainX;
    const s = r.shell();
    const flicker = r.round.twist === 'static' && Math.random() < 0.12;
    S.text(`SHELL ${r.round.idx + 1}/${r.round.shells.length}   WAGER ${r.activeWager}`, x, 44, 8, PAL.dim);
    if (!flicker) {
      const jitter = r.round.twist === 'static' ? Math.round((Math.random() - 0.5) * 5) : 0;
      const eq = `${s.expr}=${s.shown}`;
      const size = eq.length > 12 ? 16 : 24;
      S.textShadow(eq, x + jitter, 84, size, PAL.text);
      S.textShadow('?', x + eq.length * size + jitter + 6, 84, size, PAL.amber);
    }
    // timer
    const pct = r.mods.frozen ? 1 : r.timeLeft() / r.callTotal;
    const col = pct > 0.5 ? PAL.green : pct > 0.25 ? PAL.amber : PAL.red;
    S.bar(x, 126, 280, 10, pct, col);
    if (r.mods.frozen) S.text('FROZEN', x + 288, 127, 8, PAL.cyan);

    // reveals
    let ry = 150;
    if (r.mods.peekDigit !== null) { S.text(`PEEK: TRUE ANSWER ENDS IN ${r.mods.peekDigit}`, x, ry, 8, PAL.cyan); ry += 15; }
    if (r.mods.revealed) { S.text(`LENS: IT IS ${r.mods.revealed}`, x, ry, 8, PAL.cyan); ry += 15; }
    if (r.mods.jackpot) { S.text('JACKPOT CELL ARMED: x3 / 2 CRACKS', x, ry, 8, PAL.gold); ry += 15; }

    // big call buttons
    const c = controls();
    S.frame(x, 196, 130, 44, PAL.green, '#12301b');
    S.text(c.trueLabel, x + 22, 212, 8, PAL.green);
    S.frame(x + 150, 196, 130, 44, PAL.red, '#301218');
    S.text(c.bluffLabel, x + 170, 212, 8, PAL.red);

    S.text(`PAYS x${r.payoutMult(s).toFixed(2)}`, x, 252, 8, PAL.amber);
    hintsRow([[c.trueHint, 'TRUE'], [c.bluffHint, 'BLUFF'], ['T/B', 'KEYBOARD'], ['1-4', 'ITEM']]);
  },

  drawResult(r) {
    const x = this.mainX;
    const res = r.lastResult;
    if (res.rodeLost) {
      S.textShadow('COIN SAYS NO', x, 70, 24, PAL.red);
      S.text('THE RIDE IS OVER. EVERYTHING IS GONE.', x, 110, 8, PAL.dim);
    } else if (res.correct) {
      S.textShadow(res.rode ? 'DOUBLED!' : 'CORRECT!', x, 70, 24, PAL.green);
      S.text(res.rode ? `STAKE NOW ${r.rideStake}` : `+${res.profit} CHIPS`, x, 108, 16, PAL.gold);
    } else {
      S.textShadow(res.timeout ? 'TOO SLOW' : 'WRONG', x, 70, 24, PAL.red);
      S.text(`TRUTH: ${res.truth}`, x, 108, 8, PAL.text);
      S.text(`IT WAS ${res.wasTrue ? 'TRUE' : 'A BLUFF'}`, x, 124, 8, res.wasTrue ? PAL.green : PAL.red);
      if (res.cracked) S.text('THE LCD CRACKS.', x, 146, 8, PAL.red);
      if (res.refunded) S.text('CHIP MAGNET REFUNDED YOUR WAGER.', x, 162, 8, PAL.cyan);
    }
    const hints = [['=', 'CONTINUE']];
    if (r.canRide()) hints.push(['x', `LET IT RIDE (${r.rideStake} AT STAKE)`]);
    let hx = x;
    let hy = 210;
    for (const [k, label] of hints) { S.keyHint(hx, hy, k, label, k === 'x' ? PAL.gold : PAL.amber); hy += 22; }
  },

  drawRide(r) {
    const x = this.mainX;
    S.textShadow('LET IT RIDE', x, 60, 16, PAL.gold);
    S.text(`${r.rideStake} CHIPS ON A COIN`, x, 90, 8, PAL.dim);
    // spinning pixel coin
    const t = S.now();
    const w = Math.abs(Math.sin(t * 10)) * 48 + 4;
    const cx = x + 120;
    S.rect(cx - w / 2, 140, w, 48, S.blink(0.14) ? PAL.gold : PAL.amber);
    S.rect(cx - w / 2 + 4, 148, Math.max(0, w - 8), 32, PAL.dark);
  },

  drawAudit(r) {
    const can = r.chips >= r.round.quota;
    S.textShadow('THE AUDIT', W / 2, 60, 24, can ? PAL.cyan : PAL.red, 'center');
    S.text('THE AUDITOR SLIDES A CLAW ACROSS THE FELT', W / 2, 100, 8, PAL.dim, 'center');
    S.text(`DEBT DUE:  ${r.round.quota}`, W / 2, 140, 16, PAL.red, 'center');
    S.text(`YOU HOLD:  ${r.chips}`, W / 2, 166, 16, can ? PAL.green : PAL.red, 'center');
    if (can) {
      S.text(`AFTER PAYMENT: ${r.chips - r.round.quota}${r.has('interest') ? ' +10% INTEREST' : ''}`, W / 2, 200, 8, PAL.dim, 'center');
      if (S.blink()) S.text('PRESS = TO PAY THE MAN', W / 2, 240, 8, PAL.amber, 'center');
    } else {
      S.text('YOU CANNOT PAY.', W / 2, 205, 8, PAL.red, 'center');
      S.text('PRESS = TO FACE THE CONSEQUENCES', W / 2, 240, 8, PAL.dim, 'center');
    }
  },

  drawShop(r) {
    S.textShadow('BLACK MARKET SUPPLY CLOSET', W / 2, 36, 16, PAL.purple, 'center');
    S.text(`CHIPS ${r.chips}   NEXT DEBT ${quotaFor(r.ante)}`, W / 2, 60, 8, PAL.dim, 'center');
    const offers = r.shopOffers();
    r.shop.cursor = Math.min(r.shop.cursor, offers.length - 1);
    let y = 84;
    offers.forEach((o, i) => {
      const sel = i === r.shop.cursor;
      if (sel) S.rect(20, y - 4, W - 40, 30, PAL.panel2);
      const afford = r.chips >= o.cost;
      const kindCol = o.kind === 'perk' ? PAL.purple : o.kind === 'item' ? PAL.cyan : PAL.green;
      S.text((sel ? '> ' : '  ') + o.name, 28, y, 8, kindCol);
      S.text(`${o.cost}`, W - 70, y, 8, afford ? PAL.gold : PAL.red);
      S.text(o.desc, 44, y + 13, 8, sel ? PAL.text : PAL.dim);
      y += 34;
    });
    S.text(`PERK SLOTS ${r.perks.length}/5   ITEM SLOTS ${r.items.length}/4   LCD ${r.integrity}/${r.maxIntegrity}`, W / 2, y + 4, 8, PAL.dim, 'center');
    hintsRow([['+', 'UP'], ['-', 'DN'], ['=', 'BUY'], ['/', `REROLL ${r.rerollCost()}`], ['C', 'NEXT ANTE']]);
  },

  drawVictory(r) {
    S.textShadow('SOLVENT', W / 2, 60, 24, PAL.gold, 'center');
    S.text('ANTE 8 CLEARED. THE AUDITOR NODS, ONCE.', W / 2, 100, 8, PAL.text, 'center');
    S.text(`SCORE ${r.score}   CHIPS ${r.chips}`, W / 2, 130, 8, PAL.green, 'center');
    S.text('THE MACHINE HUMS. IT OFFERS OVERTIME:', W / 2, 170, 8, PAL.dim, 'center');
    S.text('ENDLESS ANTES. RISING DEBTS. NO MERCY.', W / 2, 184, 8, PAL.dim, 'center');
    hintsRow([['=', 'OVERTIME'], ['C', 'BANK SCORE + RETIRE']], H - 24);
  },

  drawPause() {
    S.rect(0, 0, W, H, 'rgba(4,6,10,0.82)');
    S.textShadow('PAUSED', W / 2, 120, 24, PAL.text, 'center');
    S.text('RUN IS AUTOSAVED AT EVERY SHELL', W / 2, 160, 8, PAL.dim, 'center');
    hintsRow([['=', 'RESUME'], ['C', 'QUIT TO TITLE']], 200);
  },
};

// ======================================================================
// GAME OVER
// ======================================================================
const gameover = {
  data: null,
  enter(arg) {
    this.data = arg;
    audio.stopMusic();
  },
  key(k) {
    if (k !== '=' && !isBack(k)) return;
    audio.sfx('ok');
    if (qualifies(this.data.score)) game.go('nameentry', { score: this.data.score, ante: this.data.ante });
    else game.go('title');
  },
  draw() {
    S.clear('#0a0508');
    const shattered = this.data.reason === 'SHATTERED';
    S.textShadow(this.data.reason, W / 2, 80, 24, PAL.red, 'center');
    S.text(
      shattered
        ? 'THE LCD GAVE OUT. GLASS EVERYWHERE. FAKE GLASS.'
        : 'THE AUDITOR TOOK THE MACHINE. AND YOUR DIGNITY.',
      W / 2, 122, 8, PAL.dim, 'center',
    );
    S.text(`FINAL SCORE  ${this.data.score}`, W / 2, 160, 16, PAL.gold, 'center');
    S.text(`REACHED ANTE ${this.data.ante}`, W / 2, 190, 8, PAL.text, 'center');
    if (qualifies(this.data.score) && S.blink()) {
      S.text('HIGH SCORE! PRESS = TO SIGN', W / 2, 230, 8, PAL.green, 'center');
    } else if (S.blink()) {
      S.text('PRESS = TO CRAWL BACK', W / 2, 230, 8, PAL.amber, 'center');
    }
    S.drawCracks(shattered ? 5 : 0);
  },
};

// ======================================================================
const scenes = {
  boot, disclaimer, disclaimer_view, title, howto, settings,
  leaderboard, nameentry, donate, play, gameover,
};

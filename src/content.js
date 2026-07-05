// Game content: quotas, equation generation, perks (passive), items (consumable), audit twists.

export const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const pick = (arr) => arr[ri(0, arr.length - 1)];

// debt the AUDITOR collects at the end of each ante
export function quotaFor(ante) {
  const table = [0, 150, 240, 400, 620, 950, 1450, 2200, 3300];
  if (ante < table.length) return table[ante];
  return Math.round(table[8] * Math.pow(1.55, ante - 8) / 50) * 50; // OVERTIME scaling
}

export const FINAL_ANTE = 8;

export function tierFor(ante) {
  return Math.min(5, 1 + Math.floor((ante - 1) / 2));
}

export function timerFor(ante, twist) {
  let ms = Math.max(5000, 8500 - (ante - 1) * 400);
  if (twist === 'crunch') ms *= 0.6;
  return Math.round(ms);
}

// ---------- equations ----------
function bluffOf(answer) {
  for (let i = 0; i < 30; i++) {
    let wrong;
    if (Math.random() < 0.5) {
      const d = pick([1, 2, 3, 4, 5, 6, 10, 20, 100]);
      wrong = answer + (Math.random() < 0.5 ? -d : d);
    } else {
      const s = String(Math.abs(answer)).split('');
      if (s.length >= 2) {
        const j = ri(0, s.length - 2);
        [s[j], s[j + 1]] = [s[j + 1], s[j]];
        wrong = parseInt(s.join(''), 10) * Math.sign(answer || 1);
      } else wrong = answer + ri(1, 5);
    }
    if (wrong !== answer && wrong > 0) return wrong;
  }
  return answer + 1;
}

export function makeShell(tier, forcedTruth = null) {
  let a, b, c, answer, expr;
  switch (tier) {
    case 1:
      a = ri(11, 99); b = ri(11, 99);
      if (Math.random() < 0.5) { answer = a + b; expr = `${a}+${b}`; }
      else { if (b > a) [a, b] = [b, a]; answer = a - b; expr = `${a}-${b}`; }
      break;
    case 2:
      if (Math.random() < 0.6) { a = ri(3, 9); b = ri(12, 99); answer = a * b; expr = `${a}x${b}`; }
      else { a = ri(101, 999); b = ri(101, 999); answer = a + b; expr = `${a}+${b}`; }
      break;
    case 3:
      a = ri(11, 49); b = ri(11, 29); answer = a * b; expr = `${a}x${b}`;
      break;
    case 4:
      a = ri(11, 39); b = ri(11, 29); c = ri(10, 99);
      if (Math.random() < 0.5) { answer = a * b + c; expr = `${a}x${b}+${c}`; }
      else { answer = a * b - c; expr = `${a}x${b}-${c}`; }
      break;
    default: {
      // tier 5: division traps and squares
      const r = Math.random();
      if (r < 0.4) { b = ri(12, 29); c = ri(13, 39); answer = c; a = b * c; expr = `${a}/${b}`; }
      else if (r < 0.7) { a = ri(13, 32); answer = a * a; expr = `${a}x${a}`; }
      else { a = ri(21, 59); b = ri(21, 49); c = ri(101, 399); answer = a * b - c; expr = `${a}x${b}-${c}`; }
    }
  }
  const isTrue = forcedTruth === null ? Math.random() < 0.5 : forcedTruth;
  const shown = isTrue ? answer : bluffOf(answer);
  return { expr, shown, answer, isTrue };
}

export function buildMagazine(ante) {
  const n = Math.min(8, 5 + Math.floor((ante - 1) / 2));
  const trueCount = ri(Math.round(n * 0.35), Math.round(n * 0.65));
  const truths = [];
  for (let i = 0; i < n; i++) truths.push(i < trueCount);
  // shuffle
  for (let i = truths.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [truths[i], truths[j]] = [truths[j], truths[i]];
  }
  const tier = tierFor(ante);
  return truths.map((tr) => makeShell(tier, tr));
}

// ---------- audit twists (boss blinds) ----------
export const TWISTS = {
  blind: { name: 'BLIND AUDIT', desc: 'Shell composition is hidden this round.' },
  crunch: { name: 'CRUNCH TIME', desc: 'Timers cut to 60%.' },
  highstakes: { name: 'HIGH STAKES', desc: 'Minimum wager is 25% of your chips.' },
  static: { name: 'BAD SIGNAL', desc: 'The display flickers. Read fast.' },
};

export function twistFor(ante) {
  if (ante === 3) return 'blind';
  if (ante === 6) return 'crunch';
  if (ante === FINAL_ANTE) return pick(['highstakes', 'static']);
  if (ante > FINAL_ANTE) return pick(Object.keys(TWISTS));
  return null;
}

// ---------- perks (jokers) ----------
export const PERKS = [
  { id: 'slowclock', name: 'SLOW CLOCK', cost: 70, desc: '+3 seconds on every timer.' },
  { id: 'insurance', name: 'INSURANCE', cost: 120, desc: 'First wrong call each round does not crack the LCD.' },
  { id: 'lucky7', name: 'LUCKY 7', cost: 90, desc: 'Equations containing a 7 pay x2.' },
  { id: 'bluffbounty', name: 'BLUFF BOUNTY', cost: 100, desc: 'Correctly called BLUFFs pay +75%.' },
  { id: 'believer', name: 'TRUE BELIEVER', cost: 90, desc: 'Correctly called TRUEs pay +50%.' },
  { id: 'overclock', name: 'OVERCLOCK', cost: 130, desc: 'Combo grows +1.0 instead of +0.5.' },
  { id: 'magnet', name: 'CHIP MAGNET', cost: 80, desc: '25% chance lost wagers are refunded.' },
  { id: 'interest', name: 'COMPOUND', cost: 110, desc: '+10% of chips after each audit (max +200).' },
  { id: 'ducttape', name: 'DUCT TAPE', cost: 100, desc: '+1 max LCD integrity, and repairs 1 crack.' },
  { id: 'weighted', name: 'WEIGHTED COIN', cost: 95, desc: 'LET IT RIDE flips win 60% of the time.' },
  { id: 'hotstreak', name: 'HOT STREAK', cost: 115, desc: 'Timeouts: no crack, combo survives. Wager still lost.' },
  { id: 'glassjaw', name: 'GLASS JAW', cost: 60, desc: 'All payouts x1.75... but max integrity becomes 2.' },
];

export const MAX_PERKS = 5;

// ---------- items (consumables) ----------
export const ITEMS = [
  { id: 'peek', name: 'PEEK', cost: 40, desc: 'Reveal the LAST DIGIT of the true answer.' },
  { id: 'lens', name: 'LENS', cost: 90, desc: 'Fully reveal TRUE or BLUFF for this shell.' },
  { id: 'eject', name: 'EJECT', cost: 55, desc: 'Skip this shell. Counters update.' },
  { id: 'solder', name: 'SOLDER', cost: 80, desc: 'Repair 1 LCD crack.' },
  { id: 'freeze', name: 'FREEZE', cost: 45, desc: 'Stop the timer for this shell.' },
  { id: 'jackpot', name: 'JACKPOT CELL', cost: 65, desc: 'This shell pays x3. Wrong = 2 cracks.' },
];

export const MAX_ITEMS = 4;

export function perkById(id) { return PERKS.find((p) => p.id === id); }
export function itemById(id) { return ITEMS.find((p) => p.id === id); }

// boot screen gag lines
export const BOOT_LINES = [
  'SOLVENCY(tm) ARCADE BIOS v2.0',
  'CHECKSUM............OK',
  'LCD INTEGRITY.......4/4',
  'CHIP DISPENSER......LOADED',
  'MORALS..............NOT FOUND',
  'FAKE MONEY..........INFINITE',
  'REAL MONEY..........ABSENT (BY DESIGN)',
  'AUDITOR.............AWAKE. HUNGRY.',
  'BOOT COMPLETE.',
];

// Persistent state: settings, leaderboard, fake-donation counter, run save.

const KEY = 'casino-calculator-v2';

const DEFAULTS = {
  settings: {
    master: 0.8,
    music: 0.6,
    sfx: 0.9,
    crt: true,
    sway: true,
    flash: true,   // screen flash effects (accessibility)
    video3d: true, // false = 2D fallback mode
  },
  leaderboard: [], // [{ name, score, ante, ts }]
  donated: 0,      // fake chips "donated" — a running gag
  seenDisclaimer: false,
  runsPlayed: 0,
  runSave: null,   // serialized in-progress run
};

export const store = structuredClone(DEFAULTS);

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') {
      Object.assign(store.settings, raw.settings || {});
      store.leaderboard = Array.isArray(raw.leaderboard) ? raw.leaderboard.slice(0, 10) : [];
      store.donated = Number.isFinite(raw.donated) ? raw.donated : 0;
      store.seenDisclaimer = !!raw.seenDisclaimer;
      store.runsPlayed = Number.isFinite(raw.runsPlayed) ? raw.runsPlayed : 0;
      store.runSave = raw.runSave || null;
    }
  } catch (e) { /* corrupt or blocked storage: play with defaults */ }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) { /* private mode: session-only */ }
}

export function qualifies(score) {
  if (score <= 0) return false;
  if (store.leaderboard.length < 10) return true;
  return score > store.leaderboard[store.leaderboard.length - 1].score;
}

export function addScore(name, score, ante) {
  store.leaderboard.push({ name, score, ante, ts: Date.now() });
  store.leaderboard.sort((a, b) => b.score - a.score);
  store.leaderboard = store.leaderboard.slice(0, 10);
  save();
  return store.leaderboard.findIndex((e) => e.name === name && e.score === score);
}

export function wipe() {
  Object.assign(store, structuredClone(DEFAULTS));
  save();
}

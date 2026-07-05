// Global leaderboard client. Points at the Cloudflare Worker in
// server/leaderboard. Without VITE_LEADERBOARD_URL everything no-ops and
// the game stays local-only.

const BASE = (import.meta.env.VITE_LEADERBOARD_URL || '').replace(/\/$/, '');

export const remoteEnabled = !!BASE;

async function fetchJson(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, signal: ctrl.signal });
    if (!res.ok) throw new Error(`leaderboard ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTop() {
  if (!BASE) return [];
  const list = await fetchJson('/top');
  return Array.isArray(list) ? list.slice(0, 10) : [];
}

export function submitScore(entry) {
  if (!BASE) return;
  fetch(`${BASE}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
    keepalive: true,
  }).catch(() => { /* fire and forget */ });
}

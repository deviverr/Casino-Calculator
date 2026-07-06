// Privacy-respecting event pings. No PII, no cookies, no fingerprinting —
// a random per-session id and coarse game events only.
// Disabled entirely unless VITE_ANALYTICS_URL is set at build time.

const ENDPOINT = import.meta.env.VITE_ANALYTICS_URL || '';
const sid = Math.random().toString(36).slice(2, 10);

export function track(event, data = {}) {
  if (!ENDPOINT) return;
  try {
    const payload = JSON.stringify({ event, sid, t: Date.now(), ...data });
    if (!navigator.sendBeacon?.(ENDPOINT, payload)) {
      fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
    }
  } catch (e) { /* analytics must never break the game */ }
}

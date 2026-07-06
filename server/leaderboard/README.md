# Casino Calculator — Global Leaderboard Worker

A tiny Cloudflare Worker plus D1 database for the global leaderboard and opt-in,
privacy-respecting launch analytics. The static game still runs without it.

## API

- `GET /top` → top 25 entries: `[{ name, score, ante, ts }]`
- `POST /submit` → `{ name: "AAA", score: 12345, ante: 8 }` → `{ ok: true, rank: 3 }`
- `POST /event` → coarse event pings only: boot, run_start, ante_cleared, etc.

Validation: 3-letter A-Z name, integer score in (0, 50M], ante 1-99.
Events include a random per-session id from the client. No cookies, accounts,
fingerprints, IP storage, or personal data.

## Deploy

```sh
cd server/leaderboard
npm install
npx wrangler d1 create casino-calculator              # paste database_id into wrangler.jsonc
npm run migrate:remote
npm run deploy
```

Then build the game with the Worker URL:

```sh
VITE_LEADERBOARD_URL=https://casino-calculator-leaderboard.<you>.workers.dev \
VITE_ANALYTICS_URL=https://casino-calculator-leaderboard.<you>.workers.dev/event \
npm run build
```

Without `VITE_LEADERBOARD_URL` the game silently stays local-only. Without
`VITE_ANALYTICS_URL` it sends no analytics requests.

## Honesty caveat (documented on purpose)

Scores are client-reported. Good enough for a friendly launch board; before
promoting it as competitive, add verification: submit the run's RNG seed plus
decision log and replay it server-side. That is the Phase-3 anti-cheat item in
ROADMAP.md.

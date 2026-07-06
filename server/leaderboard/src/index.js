// Launch backend for Casino Calculator.
// GET  /top     -> top 25 scores, JSON
// POST /submit  -> { name: "AAA", score: 12345, ante: 8 }
// POST /event   -> privacy-respecting analytics event, no cookies or PII

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

const MAX_SCORE = 50_000_000; // generous ceiling given table-limit economy
const MAX_BODY = 1024;
const VALID_EVENTS = new Set([
  'boot',
  'run_start',
  'run_continue',
  'ante_cleared',
  'victory',
  'death',
  'fake_donation',
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
  });
}

async function readSmallJson(request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY) return { error: 'too large' };
  if (!request.body) return { value: null };

  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return { error: 'too large' };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: 'bad json' };
  }
}

function validateScore(body) {
  const name = String(body?.name ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const score = Math.floor(Number(body?.score));
  const ante = Math.floor(Number(body?.ante));
  if (name.length !== 3) return null;
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) return null;
  if (!Number.isFinite(ante) || ante < 1 || ante > 99) return null;
  return { name, score, ante, ts: Date.now() };
}

function validateEvent(body) {
  const event = String(body?.event ?? '').slice(0, 32);
  if (!VALID_EVENTS.has(event)) return null;
  const sid = String(body?.sid ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  if (sid.length < 6) return null;

  const data = {};
  for (const [key, value] of Object.entries(body ?? {})) {
    if (['event', 'sid', 't'].includes(key)) continue;
    if (!/^[a-z_]{1,24}$/i.test(key)) continue;
    if (typeof value === 'string') data[key] = value.slice(0, 80);
    else if (typeof value === 'number' && Number.isFinite(value)) data[key] = value;
    else if (typeof value === 'boolean') data[key] = value;
  }
  return { event, sid, data: JSON.stringify(data).slice(0, 600), ts: Date.now() };
}

function logError(err) {
  console.log(JSON.stringify({ event: 'error', message: String(err) }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    try {
      if (url.pathname === '/top' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT name, score, ante, created_at AS ts FROM scores ORDER BY score DESC, created_at ASC LIMIT 25',
        ).all();
        return json(results);
      }

      if (url.pathname === '/submit' && request.method === 'POST') {
        const body = await readSmallJson(request);
        if (body.error === 'too large') return json({ error: body.error }, 413);
        if (body.error) return json({ error: body.error }, 400);

        const entry = validateScore(body.value);
        if (!entry) return json({ error: 'invalid entry' }, 400);

        await env.DB.prepare(
          'INSERT INTO scores (name, score, ante, created_at) VALUES (?, ?, ?, ?)',
        ).bind(entry.name, entry.score, entry.ante, entry.ts).run();

        const rankRow = await env.DB.prepare(
          'SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > ? OR (score = ? AND created_at < ?)',
        ).bind(entry.score, entry.score, entry.ts).first();

        ctx.waitUntil(env.DB.prepare(
          'DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC, created_at ASC LIMIT 1000)',
        ).run().catch(logError));

        console.log(JSON.stringify({ event: 'submit', name: entry.name, score: entry.score, ante: entry.ante, rank: rankRow?.rank }));
        return json({ ok: true, rank: rankRow?.rank ?? null });
      }

      if (url.pathname === '/event' && request.method === 'POST') {
        const body = await readSmallJson(request);
        if (body.error === 'too large') return json({ error: body.error }, 413);
        if (body.error) return json({ error: body.error }, 400);

        const event = validateEvent(body.value);
        if (!event) return json({ error: 'invalid event' }, 400);

        ctx.waitUntil(env.DB.prepare(
          'INSERT INTO events (event, sid, data, created_at) VALUES (?, ?, ?, ?)',
        ).bind(event.event, event.sid, event.data, event.ts).run().catch(logError));
        return new Response(null, { status: 204, headers: CORS });
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      logError(err);
      return json({ error: 'internal' }, 500);
    }
  },
};

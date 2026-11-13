// Live poll API for kuma.partners/PPI-engagement. All routes live under /api/poll/*.
// The logic is in lib/poll-core.mjs; the storage library is vendored in lib/vendor/ (Netlify Blobs 8.2.0,
// MIT, no dependencies), so the site needs no package.json and no install step.
//
// Environment variable: POLL_ADMIN_KEY (the presenter passphrase). Without it the admin page stays locked.

import { getStore } from './lib/vendor/blobs.mjs';
import { handle } from './lib/poll-core.mjs';

const HEAD = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: HEAD });

export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/poll\/?/, '').replace(/\/$/, '');
  let body = null;
  if (req.method === 'POST') {
    const text = await req.text();
    if (text.length > 70000) return reply(413, { error: 'too_large' });
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return reply(400, { error: 'bad_json' });
    }
  }
  const store = getStore({ name: 'ppi-poll', consistency: 'strong' });
  const out = await handle(
    { method: req.method, route, query: Object.fromEntries(url.searchParams), body, adminKey: req.headers.get('x-poll-key') || '' },
    store,
    process.env
  );
  return reply(out.status, out.body);
};

export const config = { path: '/api/poll/*' };

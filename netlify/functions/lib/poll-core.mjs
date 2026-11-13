// Live poll for kuma.partners/PPI-engagement. Pure logic: the store (Netlify Blobs, or a fake one in tests)
// is passed in, so everything here can be tested without a network.
//
// Storage layout (one Blobs store, "ppi-poll"):
//   config                         the questions
//   state                          what is live right now (question, phase, whether phones see results)
//   votes/<mode>/<qid>/<voter>     one record per voter and question (a repeat vote overwrites, never doubles)
//   final/<mode>/<qid>             the results frozen when "Show results" is pressed
//   hidden/<mode>/<qid>            answers or words the presenter has hidden
//
// <mode> is "rehearsal" or "live", so test votes never mix with the real ones.
//
// Environment variable (set in Netlify, never in the repo): POLL_ADMIN_KEY, the presenter passphrase.

import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';

export const MODES = ['rehearsal', 'live'];
export const TYPES = ['single', 'multiple', 'scale', 'cloud', 'text'];
const MAX_QUESTIONS = 20;
const MAX_OPTIONS = 10;

export const DEFAULT_QUESTIONS = [
  {
    id: 'q1', type: 'single', text: 'How often do you use AI in your working day?',
    options: [
      { id: 'o1', label: 'Every day' },
      { id: 'o2', label: 'A few times a week' },
      { id: 'o3', label: 'Now and then' },
      { id: 'o4', label: 'Not yet' }
    ]
  },
  {
    id: 'q2', type: 'multiple', max: 2, text: 'Where do you feel the most pressure at work right now?',
    options: [
      { id: 'o1', label: 'Workload' },
      { id: 'o2', label: 'Pace of change' },
      { id: 'o3', label: 'Uncertainty about AI' },
      { id: 'o4', label: 'Client expectations' },
      { id: 'o5', label: 'Staying connected with colleagues' },
      { id: 'o6', label: 'Energy and recovery' }
    ]
  },
  {
    id: 'q3', type: 'scale', min: 1, max: 7, low: 'Not at all', high: 'Completely',
    text: 'How confident are you in judging when to trust an AI answer?'
  },
  { id: 'q4', type: 'cloud', words: 3, text: 'In up to three words: how does AI feel at work today?' },
  {
    id: 'q5', type: 'single', text: 'When AI and human judgement disagree, who should have the final say?',
    options: [
      { id: 'o1', label: 'The person closest to the work' },
      { id: 'o2', label: 'The manager' },
      { id: 'o3', label: 'The team together' },
      { id: 'o4', label: 'It depends on the stakes' }
    ]
  },
  { id: 'q6', type: 'text', text: 'What is one question about AI and wellbeing you would like answered today?' }
];

const DEFAULT_STATE = { rev: 0, mode: 'rehearsal', qid: null, phase: 'idle', phones: false, oid: null };

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const rid = (prefix = '') => prefix + randomBytes(4).toString('hex');
const idOf = (s, n = 24) => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, n);
const short = (voter) => createHash('sha1').update(voter).digest('hex').slice(0, 8);
const VOTER_RE = /^[A-Za-z0-9_-]{16,40}$/;

// ---------- questions ----------

export function sanitizeQuestions(list) {
  if (!Array.isArray(list)) throw bad('The questions must be a list.');
  if (list.length > MAX_QUESTIONS) throw bad('At most ' + MAX_QUESTIONS + ' questions.');
  const seen = new Set();
  return list.map((q, i) => {
    const n = 'Question ' + (i + 1) + ': ';
    if (!q || !TYPES.includes(q.type)) throw bad(n + 'unknown type.');
    const text = clean(q.text, 200);
    if (!text) throw bad(n + 'the question text is empty.');
    let id = idOf(q.id);
    if (!id || seen.has(id)) id = rid('q');
    seen.add(id);
    const out = { id, type: q.type, text };
    if (q.type === 'single' || q.type === 'multiple') {
      const oseen = new Set();
      out.options = [];
      for (const op of Array.isArray(q.options) ? q.options : []) {
        const label = clean(op && op.label, 80);
        if (!label) continue;
        let oid = idOf(op.id, 16);
        if (!oid || oseen.has(oid)) oid = rid('o');
        oseen.add(oid);
        out.options.push({ id: oid, label });
      }
      if (out.options.length < 2) throw bad(n + 'add at least two options.');
      if (out.options.length > MAX_OPTIONS) throw bad(n + 'at most ' + MAX_OPTIONS + ' options.');
      if (q.type === 'multiple') {
        const m = parseInt(q.max, 10);
        out.max = Number.isFinite(m) ? Math.min(Math.max(m, 1), out.options.length) : Math.min(2, out.options.length);
      }
    }
    if (q.type === 'scale') {
      out.min = 1;
      out.max = 7;
      out.low = clean(q.low, 30);
      out.high = clean(q.high, 30);
    }
    if (q.type === 'cloud') out.words = 3;
    return out;
  });
}

// Returns the cleaned answer, or null when it does not fit the question.
export function validateAnswer(q, a) {
  switch (q.type) {
    case 'single':
      return typeof a === 'string' && q.options.some((o) => o.id === a) ? a : null;
    case 'multiple': {
      if (!Array.isArray(a)) return null;
      const u = [...new Set(a)];
      if (u.length < 1 || u.length > q.max) return null;
      return u.every((x) => typeof x === 'string' && q.options.some((o) => o.id === x)) ? u : null;
    }
    case 'scale': {
      const n = Number(a);
      return Number.isInteger(n) && n >= 1 && n <= 7 ? n : null;
    }
    case 'cloud': {
      if (!Array.isArray(a)) return null;
      const words = [];
      for (const w of a.slice(0, 6)) {
        const v = clean(w, 24).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        if (v && !words.includes(v)) words.push(v);
      }
      return words.length ? words.slice(0, 3) : null;
    }
    case 'text': {
      const s = clean(a, 280);
      return s || null;
    }
    default:
      return null;
  }
}

// ---------- storage ----------

const K = {
  config: 'config',
  state: 'state',
  vote: (m, q, v) => `votes/${m}/${q}/${v}`,
  votes: (m, q) => `votes/${m}/${q}/`,
  votesMode: (m) => `votes/${m}/`,
  final: (m, q) => `final/${m}/${q}`,
  finalMode: (m) => `final/${m}/`,
  hidden: (m, q) => `hidden/${m}/${q}`,
  hiddenMode: (m) => `hidden/${m}/`
};
const getJSON = (store, key) => store.get(key, { type: 'json', consistency: 'strong' });

async function loadConfig(store, { seed = false } = {}) {
  let cfg = await getJSON(store, K.config);
  if (!cfg || !Array.isArray(cfg.questions)) {
    cfg = { questions: DEFAULT_QUESTIONS, seeded: false };
    if (seed) {
      cfg = { questions: DEFAULT_QUESTIONS, seeded: true };
      await store.setJSON(K.config, cfg);
    }
  }
  return cfg;
}
async function loadState(store) {
  const s = await getJSON(store, K.state);
  return { ...DEFAULT_STATE, ...(s || {}) };
}
async function saveState(store, state) {
  state.rev = (state.rev || 0) + 1;
  await store.setJSON(K.state, state);
  return state;
}
async function keysUnder(store, prefix) {
  const res = await store.list({ prefix });
  return (res.blobs || []).map((b) => b.key);
}
async function inChunks(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}
async function loadVotes(store, mode, qid) {
  const prefix = K.votes(mode, qid);
  const keys = await keysUnder(store, prefix);
  const rows = await inChunks(keys, 40, async (k) => {
    const v = await getJSON(store, k);
    return v ? { voter: k.slice(prefix.length), a: v.a, t: v.t || 0 } : null;
  });
  return rows.filter(Boolean);
}
async function loadHidden(store, mode, qid) {
  const h = await getJSON(store, K.hidden(mode, qid));
  return new Set(Array.isArray(h) ? h : []);
}
async function clearPrefix(store, prefix) {
  const keys = await keysUnder(store, prefix);
  await inChunks(keys, 40, (k) => store.delete(k));
  return keys.length;
}

// ---------- results ----------

export function aggregate(q, votes, hidden = new Set(), { admin = false } = {}) {
  const n = votes.length;
  if (q.type === 'single' || q.type === 'multiple') {
    const counts = Object.fromEntries(q.options.map((o) => [o.id, 0]));
    for (const v of votes) for (const id of [].concat(v.a)) if (id in counts) counts[id]++;
    return {
      type: q.type, n,
      options: q.options.map((o) => ({ id: o.id, label: o.label, count: counts[o.id], pct: n ? Math.round((100 * counts[o.id]) / n) : 0 }))
    };
  }
  if (q.type === 'scale') {
    const dist = [0, 0, 0, 0, 0, 0, 0];
    let sum = 0;
    for (const v of votes) { dist[v.a - 1]++; sum += v.a; }
    return { type: 'scale', n, avg: n ? Math.round((sum / n) * 100) / 100 : 0, dist, low: q.low || '', high: q.high || '' };
  }
  if (q.type === 'cloud') {
    const m = new Map();
    for (const v of votes) for (const w of v.a) m.set(w, (m.get(w) || 0) + 1);
    let words = [...m].map(([w, c]) => ({ w, c, hidden: hidden.has('w:' + w) }));
    if (!admin) words = words.filter((x) => !x.hidden);
    words.sort((a, b) => b.c - a.c || a.w.localeCompare(b.w));
    return { type: 'cloud', n, words: words.slice(0, 80).map((x) => (admin ? x : { w: x.w, c: x.c })) };
  }
  let items = [...votes].sort((a, b) => b.t - a.t).map((v) => ({ id: short(v.voter), text: v.a, hidden: hidden.has('v:' + short(v.voter)) }));
  if (!admin) items = items.filter((x) => !x.hidden).map((x) => ({ text: x.text }));
  return { type: 'text', n, items: items.slice(0, 200) };
}

async function freezeResults(store, mode, q) {
  const [votes, hidden] = await Promise.all([loadVotes(store, mode, q.id), loadHidden(store, mode, q.id)]);
  const res = { qid: q.id, at: Date.now(), result: aggregate(q, votes, hidden) };
  await store.setJSON(K.final(mode, q.id), res);
  return res;
}

// ---------- CSV ----------

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
async function buildCsv(store, mode, cfg) {
  const rows = [['question_no', 'question', 'type', 'answer', 'count']];
  for (let i = 0; i < cfg.questions.length; i++) {
    const q = cfg.questions[i];
    const [votes, hidden] = await Promise.all([loadVotes(store, mode, q.id), loadHidden(store, mode, q.id)]);
    const r = aggregate(q, votes, hidden, { admin: true });
    const head = [i + 1, q.text, q.type];
    rows.push([...head, '(responses)', r.n]);
    if (r.options) r.options.forEach((o) => rows.push([...head, o.label, o.count]));
    if (r.dist) r.dist.forEach((c, k) => rows.push([...head, String(k + 1), c]));
    if (r.words) r.words.forEach((w) => rows.push([...head, w.w + (w.hidden ? ' (hidden)' : ''), w.c]));
    if (r.type === 'text') r.items.forEach((t) => rows.push([...head, t.text + (t.hidden ? ' (hidden)' : ''), 1]));
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

// ---------- public views ----------

function publicState(cfg, state) {
  const q = state.qid ? cfg.questions.find((x) => x.id === state.qid) : null;
  const out = {
    rev: state.rev, phase: q ? state.phase : 'idle', phones: !!state.phones && state.phase === 'shown',
    oid: state.oid || null, index: q ? cfg.questions.indexOf(q) + 1 : 0, total: cfg.questions.length
  };
  if (q && (state.phase === 'open' || state.phase === 'shown')) out.question = q;
  return out;
}

// ---------- admin ----------

function checkAdmin(key, env) {
  const real = env.POLL_ADMIN_KEY;
  if (!real) return { status: 503, body: { error: 'admin_disabled', message: 'POLL_ADMIN_KEY is not set in Netlify yet.' } };
  const a = createHash('sha256').update(String(key || '')).digest();
  const b = createHash('sha256').update(String(real)).digest();
  return timingSafeEqual(a, b) ? null : { status: 401, body: { error: 'wrong_key', message: 'That passphrase is not right.' } };
}

async function overview(store, seed) {
  const cfg = await loadConfig(store, { seed });
  const state = await loadState(store);
  const counts = {};
  await Promise.all(cfg.questions.map(async (q) => { counts[q.id] = (await keysUnder(store, K.votes(state.mode, q.id))).length; }));
  return { config: { questions: cfg.questions }, state, counts };
}

async function adminAction(store, b) {
  const act = b && b.action;
  const cfg = await loadConfig(store, { seed: true });
  const state = await loadState(store);
  const mode = state.mode;
  const qOf = (id) => cfg.questions.find((x) => x.id === id);
  const need = () => { const q = state.qid && qOf(state.qid); if (!q) throw bad('Choose a question first.', 409); return q; };

  switch (act) {
    case 'overview': return overview(store, true);
    case 'count': {
      const q = qOf(b.qid || state.qid);
      return { n: q ? (await keysUnder(store, K.votes(mode, q.id))).length : 0, rev: state.rev, phase: state.phase };
    }
    case 'save': {
      const questions = sanitizeQuestions(b.questions);
      await store.setJSON(K.config, { questions, seeded: true });
      if (state.qid && !questions.some((x) => x.id === state.qid)) {
        Object.assign(state, { qid: null, phase: 'idle', phones: false, oid: null });
      }
      await saveState(store, state);
      return overview(store, false);
    }
    case 'restore': {
      await store.setJSON(K.config, { questions: DEFAULT_QUESTIONS, seeded: true });
      Object.assign(state, { qid: null, phase: 'idle', phones: false, oid: null });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'mode': {
      if (!MODES.includes(b.mode)) throw bad('Unknown mode.');
      Object.assign(state, { mode: b.mode, phase: state.qid ? 'ready' : 'idle', phones: false, oid: null });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'select': {
      const q = qOf(b.qid);
      if (!q) throw bad('Unknown question.');
      Object.assign(state, { qid: q.id, phase: 'ready', phones: false, oid: null });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'next': {
      const i = state.qid ? cfg.questions.findIndex((x) => x.id === state.qid) : -1;
      const q = cfg.questions[i + 1];
      if (!q) throw bad('That was the last question.', 409);
      Object.assign(state, { qid: q.id, phase: 'ready', phones: false, oid: null });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'idle': {
      Object.assign(state, { qid: null, phase: 'idle', phones: false, oid: null });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'open': {
      const q = need();
      if (state.phase === 'open') return overview(store, false);
      const keep = state.phase === 'shown' && state.oid;
      await store.delete(K.final(mode, q.id));
      Object.assign(state, { phase: 'open', phones: false, oid: keep ? state.oid : rid('p') });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'show': {
      const q = need();
      if (state.phase !== 'open' && state.phase !== 'shown') throw bad('Open the poll first.', 409);
      await freezeResults(store, mode, q);
      Object.assign(state, { phase: 'shown' });
      await saveState(store, state);
      return overview(store, false);
    }
    case 'publish':
    case 'unpublish': {
      need();
      if (state.phase !== 'shown') throw bad('Show the results first.', 409);
      state.phones = act === 'publish';
      await saveState(store, state);
      return overview(store, false);
    }
    case 'peek': {
      const q = qOf(b.qid || state.qid);
      if (!q) throw bad('Unknown question.');
      const [votes, hidden] = await Promise.all([loadVotes(store, mode, q.id), loadHidden(store, mode, q.id)]);
      return { qid: q.id, result: aggregate(q, votes, hidden, { admin: true }) };
    }
    case 'hide': {
      const q = qOf(b.qid);
      if (!q) throw bad('Unknown question.');
      const tok = (q.type === 'cloud' ? 'w:' : 'v:') + clean(b.token, 40).toLowerCase().slice(0, 40);
      const token = q.type === 'cloud' ? tok : 'v:' + idOf(b.token, 8);
      const set = await loadHidden(store, mode, q.id);
      if (b.hidden === false) set.delete(token); else set.add(token);
      await store.setJSON(K.hidden(mode, q.id), [...set]);
      if (state.qid === q.id && state.phase === 'shown') await freezeResults(store, mode, q);
      return { ok: true };
    }
    case 'reset': {
      if (b.scope === 'all') {
        const n = (await clearPrefix(store, K.votesMode(mode))) + (await clearPrefix(store, K.finalMode(mode))) + (await clearPrefix(store, K.hiddenMode(mode)));
        if (state.qid) Object.assign(state, { phase: 'ready', phones: false, oid: null });
        await saveState(store, state);
        return { ...(await overview(store, false)), removed: n };
      }
      const q = qOf(b.qid);
      if (!q) throw bad('Unknown question.');
      const n = (await clearPrefix(store, K.votes(mode, q.id))) + (await clearPrefix(store, K.final(mode, q.id))) + (await clearPrefix(store, K.hidden(mode, q.id)));
      if (state.qid === q.id) { Object.assign(state, { phase: 'ready', phones: false, oid: null }); await saveState(store, state); }
      return { ...(await overview(store, false)), removed: n };
    }
    case 'export': {
      const stamp = new Date().toISOString().slice(0, 10);
      return { csv: await buildCsv(store, mode, cfg), filename: `poll-${mode}-${stamp}.csv` };
    }
    default:
      throw bad('Unknown action.');
  }
}

// ---------- request handler ----------

export async function handle(req, store, env = {}) {
  const { method, route, query = {}, body } = req;
  try {
    if (route === 'state' && method === 'GET') {
      const [cfg, state] = await Promise.all([loadConfig(store), loadState(store)]);
      return { status: 200, body: publicState(cfg, state) };
    }

    if (route === 'screen' && method === 'GET') {
      const [cfg, state] = await Promise.all([loadConfig(store), loadState(store)]);
      const out = publicState(cfg, state);
      const q = state.qid && cfg.questions.find((x) => x.id === state.qid);
      if (q) out.question = q;
      if (q && (state.phase === 'open' || state.phase === 'ready')) out.n = (await keysUnder(store, K.votes(state.mode, q.id))).length;
      if (q && state.phase === 'shown') {
        const f = await getJSON(store, K.final(state.mode, q.id));
        if (f) { out.result = f.result; out.n = f.result.n; }
      }
      return { status: 200, body: out };
    }

    if (route === 'results' && method === 'GET') {
      const [cfg, state] = await Promise.all([loadConfig(store), loadState(store)]);
      const q = state.qid && cfg.questions.find((x) => x.id === state.qid);
      const allowed = q && state.phase === 'shown' && (query.scope === 'screen' || (query.scope === 'phones' && state.phones));
      if (!allowed) return { status: 404, body: { error: 'not_available' } };
      const f = await getJSON(store, K.final(state.mode, q.id));
      if (!f) return { status: 404, body: { error: 'not_available' } };
      return { status: 200, body: { qid: q.id, question: q, result: f.result } };
    }

    if (route === 'vote' && method === 'POST') {
      const b = body || {};
      if (!VOTER_RE.test(String(b.voter || ''))) throw bad('Invalid voter.');
      const [cfg, state] = await Promise.all([loadConfig(store), loadState(store)]);
      const q = state.qid && cfg.questions.find((x) => x.id === state.qid);
      if (!q || state.phase !== 'open' || b.qid !== q.id) return { status: 409, body: { error: 'closed' } };
      const a = validateAnswer(q, b.answer);
      if (a === null) throw bad('That answer does not fit the question.');
      await store.setJSON(K.vote(state.mode, q.id, b.voter), { a, t: Date.now() });
      return { status: 200, body: { ok: true } };
    }

    if (route === 'admin' && method === 'POST') {
      const denied = checkAdmin(req.adminKey, env);
      if (denied) {
        if (denied.status === 401) await new Promise((r) => setTimeout(r, 400));
        return denied;
      }
      if (body && body.action === 'verify') return { status: 200, body: { ok: true } };
      return { status: 200, body: await adminAction(store, body) };
    }

    return { status: 404, body: { error: 'not_found' } };
  } catch (e) {
    if (e && e.status) return { status: e.status, body: { error: 'bad_request', message: e.message } };
    console.error('poll error', e);
    return { status: 500, body: { error: 'server', message: 'Something went wrong on the server.' } };
  }
}

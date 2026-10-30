#!/usr/bin/env node
// Design lock for www.kuma.partners.
//
//   node tools/check-design-lock.mjs            check (exit 1 on any problem)
//   node tools/check-design-lock.mjs --update   re-record the locked files (landing page tasks only)
//
// 1. The landing page files listed in design-lock.json must be byte-identical to the recorded hashes.
// 2. Subpage stylesheets are checked for scoping and reported as warnings. A page stylesheet is not
//    loaded by the landing page, so it cannot change the landing page. Scoping keeps a subpage from
//    restyling shared classes on its own page and from colliding with other subpages.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'design-lock.json');
const LOCKED = ['index-v2.html', 'index-v2.css', 'index-v2.js', 'kuma.css'];
const sha = (f) => createHash('sha256').update(readFileSync(join(root, f))).digest('hex');

if (process.argv.includes('--update')) {
  const lock = {};
  for (const f of LOCKED) lock[f] = sha(f);
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  console.log('Lock updated for: ' + LOCKED.join(', '));
  process.exit(0);
}

let problems = 0;
const fail = (m) => { problems++; console.log('FAIL ' + m); };

// 1. Landing page files
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
for (const f of LOCKED) {
  if (!lock[f]) fail(`${f}: no hash recorded in design-lock.json`);
  else if (sha(f) !== lock[f]) fail(`${f} differs from the locked landing page. Subpage work must not touch it.`);
  else console.log('ok   ' + f + ' is unchanged');
}

// 2. Subpage stylesheets
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
function rules(css) {                       // returns the selector lists, including those inside @media
  const out = []; let i = 0;
  const walk = (end) => {
    while (i < end) {
      const open = css.indexOf('{', i); if (open < 0 || open >= end) { i = end; return; }
      const head = css.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < end && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      if (/^@(media|supports|layer)/.test(head)) { const save = i; i = open + 1; walk(j - 1); i = j; void save; }
      else { if (!head.startsWith('@')) out.push(head); i = j; }
    }
  };
  walk(css.length); return out;
}
const names = (s) => new Set([...s.matchAll(/[.#]([A-Za-z_][\w-]*)|\[(data-[\w-]+)/g)].map((m) => m[0]));
const shared = names(strip(readFileSync(join(root, 'styles.css'), 'utf8')));
const sheets = readdirSync(root).filter((f) => f.endsWith('.css') && f !== 'styles.css' && f !== 'configurator.css'); // configurator.css belongs to /offsite/
for (const f of sheets) {
  let bad = 0;
  for (const head of rules(strip(readFileSync(join(root, f), 'utf8')))) {
    for (const sel of head.split(',').map((x) => x.trim()).filter(Boolean)) {
      const own = [...names(sel)].filter((n) => !shared.has(n));
      if (!own.length) { bad++; if (bad <= 5) console.log(`     ${f}: unscoped selector  ${sel.slice(0, 90)}`); }
    }
  }
  if (bad) console.log(`WARN ${f}: ${bad} selector(s) are not scoped to this page. Fine inside @media print; otherwise prefix them with the page class.`);
  else console.log('ok   ' + f + ' is fully scoped');
}
console.log(problems ? `\n${problems} problem(s). Do not zip until fixed.` : '\nDesign lock holds: the landing page is untouched.');
process.exit(problems ? 1 : 0);

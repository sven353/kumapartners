// Leadership Friction Scan: report model and email templates.
//
// Pure functions, no network and no environment access, so they can be tested on their own.
// Scoring, dimension names, vectors and protocols come from leadership-friction-scan.js, the same
// file the browser runs, so the emails can never drift from the results page.
//
//   buildReport(fields, opts)          -> report model (recomputed from the raw answers)
//   renderRespondentEmail(report, o)   -> { subject, html, text }   the executive report
//   renderTriageEmail(report, o)       -> { subject, html, text }   the alert for Sven

import scan from '../../../leadership-friction-scan.js';

export const FORM_NAME = 'leadership-friction-scan';

const { computeResult, levelFor, QUESTIONS, DIMENSIONS, DIMENSION_ORDER, VECTORS, INTERVENTIONS, SCALE_VERSION } = scan;

const SCALE_SHORT = { 1: 'Never / Rare', 2: 'Occasional', 3: 'Periodic', 4: 'Frequent', 5: 'Chronic' };

const COLOURS = {
  navy: '#0B1523', teal: '#1D6F8A', tealLight: '#4FB3CF', ink: '#1e293b', muted: '#64748b', line: '#e2e8f0',
  page: '#f1f5f9', card: '#ffffff', wash: '#f8fafc',
  low: '#14b8a6', moderate: '#f59e0b', high: '#e11d48', none: '#94a3b8'
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
export function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Header values (subject, names) must never carry line breaks.
export function oneLine(value) {
  return String(value === null || value === undefined ? '' : value).replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function clip(value, max) {
  return oneLine(value).slice(0, max);
}

// "5,4,NS,..." -> [5,4,'NS',...]. Returns null unless it is exactly 12 valid entries.
export function parseAnswers(csv) {
  if (typeof csv !== 'string') return null;
  const parts = csv.split(',').map((p) => p.trim().toUpperCase());
  if (parts.length !== QUESTIONS.length) return null;
  const out = [];
  for (const p of parts) {
    if (p === 'NS') { out.push('NS'); continue; }
    if (!/^[1-5]$/.test(p)) return null;
    out.push(Number(p));
  }
  return out;
}

function fmtScore(n) {
  if (n === null || n === undefined) return 'NS';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function formatDate(iso, timeZone) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(d);
}

function formatTimestamp(iso, timeZone) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short', timeZone }).format(d);
  return date + ', ' + time;
}

function sourceFrom(utm) {
  const raw = oneLine(utm);
  if (!raw) return 'Direct / Organic';
  const pairs = {};
  raw.split('&').forEach((kv) => { const i = kv.indexOf('='); if (i > 0) pairs[kv.slice(0, i)] = kv.slice(i + 1); });
  const base = pairs.utm_source || '';
  const extras = ['utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].filter((k) => pairs[k]).map((k) => k.replace('utm_', '') + ': ' + pairs[k]);
  if (!base && !extras.length) return 'Direct / Organic';
  return (base || 'Unspecified') + (extras.length ? ' (' + extras.join(', ') + ')' : '');
}

// ---------------------------------------------------------------------------
// report model
export const DEFAULT_BOOKING_URL = 'https://calendly.com/sven-mulfinger/leadership-friction-debrief-30min';

// Calendly link with the respondent's details pre-filled. a1 = company and a2 = score summary only fill
// in if the Calendly event type has custom questions in those positions.
export function bookingLinkFor(base, report) {
  const url = base || DEFAULT_BOOKING_URL;
  if (!report || report.error) return url;
  const parts = ['name=' + encodeURIComponent(report.name), 'email=' + encodeURIComponent(report.email), 'a1=' + encodeURIComponent(report.company)];
  if (!report.insufficient && report.dominant) parts.push('a2=' + encodeURIComponent(report.score + '/60 (' + report.dominant.name + ')'));
  return url + (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
}

// ---------------------------------------------------------------------------
// fields: the form fields as Netlify stored them. Scores are recomputed from `answers`, never
// trusted from the posted score fields. Returns { error } when the payload is unusable.
export function buildReport(fields, opts = {}) {
  const timeZone = opts.timeZone || 'Europe/Madrid';
  const email = clip(fields.email, 254);
  const name = clip(fields.name, 120);
  const company = clip(fields.company, 120);
  if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/.test(email)) return { error: 'invalid email' };
  if (name.length < 2 || company.length < 2) return { error: 'missing name or company' };

  const answers = parseAnswers(fields.answers);
  if (!answers) return { error: 'invalid answers' };

  const result = computeResult(answers.map((a) => (a === 'NS' ? null : a)));
  const submittedAt = opts.submittedAt || new Date().toISOString();

  const dims = DIMENSION_ORDER.map((key) => {
    const score = result.dims[key];
    const level = levelFor(score);
    return {
      key, num: DIMENSIONS[key].number, name: DIMENSIONS[key].name, score, level: level.id,
      severity: score === null ? 'Not scored' : level.label + ' friction', answered: result.counts[key]
    };
  });

  const audit = DIMENSION_ORDER.map((key) => ({
    key, num: DIMENSIONS[key].number, name: DIMENSIONS[key].name,
    items: QUESTIONS.map((q, i) => ({ q, i })).filter((x) => x.q.dim === key).map((x) => ({
      n: x.i + 1, text: x.q.text, value: answers[x.i],
      label: answers[x.i] === 'NS' ? 'Not Sure' : SCALE_SHORT[answers[x.i]] + ' (' + answers[x.i] + '/5)'
    }))
  }));

  const insufficient = result.insufficient;
  const dominantKey = insufficient ? null : result.dominant;
  const postedIndex = clip(fields.friction_index, 10);

  return {
    insufficient,
    scaleVersion: SCALE_VERSION,
    name, firstName: name.split(/\s+/)[0], email, company, stage: clip(fields.stage, 60) || 'Not given',
    submittedAt,
    dateLong: formatDate(submittedAt, timeZone),
    timestamp: formatTimestamp(submittedAt, timeZone),
    source: sourceFrom(fields.utm),
    invitedBy: clip(fields.invited_by, 80),
    cluster: clip(fields.company_cluster, 80),
    score: insufficient ? null : result.total,
    band: insufficient ? 'Insufficient data' : result.band.name,
    bandFriction: insufficient ? '' : result.band.friction,
    bandId: insufficient ? 'none' : result.band.id,
    bandText: insufficient ? '' : result.band.text,
    dominant: dominantKey && {
      key: dominantKey, num: DIMENSIONS[dominantKey].number, name: DIMENSIONS[dominantKey].name,
      vector: VECTORS[dominantKey].name, vectorText: VECTORS[dominantKey].text, score: result.dims[dominantKey]
    },
    protocol: dominantKey ? INTERVENTIONS[dominantKey] : null,
    dims, audit,
    notSure: result.notSure,
    founderRisk: dominantKey === 'd1',
    mismatch: !insufficient && postedIndex !== '' && postedIndex !== String(result.total) ? { posted: postedIndex, recomputed: result.total } : null
  };
}

// ---------------------------------------------------------------------------
// shared layout
// ---------------------------------------------------------------------------
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

function layout(inner, { preheader = '', logoUrl = '' } = {}) {
  const logo = logoUrl
    ? '<img src="' + esc(logoUrl) + '" alt="Kuma Partners" width="150" style="display:block;border:0;height:auto;max-width:150px">'
    : '<span style="font-family:' + FONT + ';font-weight:700;letter-spacing:.12em;font-size:13px;color:' + COLOURS.navy + '">KUMA PARTNERS</span>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light"><title>Kuma Partners</title></head>' +
    '<body style="margin:0;padding:0;background:' + COLOURS.page + ';">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' + esc(preheader) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COLOURS.page + ';"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:' + COLOURS.card + ';border:1px solid ' + COLOURS.line + ';border-radius:14px;font-family:' + FONT + ';color:' + COLOURS.ink + ';font-size:15px;line-height:1.6;">' +
    '<tr><td style="padding:28px 32px 8px;">' + logo + '</td></tr>' +
    '<tr><td style="padding:8px 32px 32px;">' + inner + '</td></tr></table></td></tr></table></body></html>';
}

const hr = '<hr style="border:none;border-top:1px solid ' + COLOURS.line + ';margin:26px 0;">';
const h3 = (t) => '<h3 style="margin:0 0 8px;font-size:17px;line-height:1.3;color:' + COLOURS.navy + ';">' + t + '</h3>';
const p = (t, extra = '') => '<p style="margin:0 0 14px;' + extra + '">' + t + '</p>';

function bar(score, level) {
  const pct = score === null ? 0 : Math.max(0, Math.min(100, Math.round((score / 15) * 100)));
  const cell = (w, bg, radius) => '<td width="' + w + '%" height="8" style="background:' + bg + ';font-size:0;line-height:0;' + radius + '">&nbsp;</td>';
  let cells;
  if (pct <= 0) cells = cell(100, COLOURS.line, 'border-radius:4px;');
  else if (pct >= 100) cells = cell(100, COLOURS[level] || COLOURS.none, 'border-radius:4px;');
  else cells = cell(pct, COLOURS[level] || COLOURS.none, 'border-radius:4px 0 0 4px;') + cell(100 - pct, COLOURS.line, 'border-radius:0 4px 4px 0;');
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0;"><tr>' + cells + '</tr></table>';
}

function dimensionRows(report) {
  return report.dims.map((d) => {
    const dom = report.dominant && d.key === report.dominant.key;
    const badge = dom ? ' <span style="display:inline-block;background:' + COLOURS.navy + ';color:#fff;font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:10px;vertical-align:middle;">Dominant</span>' : '';
    const value = d.score === null ? 'Not scored' : fmtScore(d.score) + ' / 15 &middot; ' + esc(d.severity);
    const note = d.answered > 0 && d.answered < 3 ? '<div style="font-size:12px;color:' + COLOURS.muted + ';margin-top:4px;">Scaled from ' + d.answered + ' of 3 answers.</div>' : '';
    return '<tr><td style="padding:10px 0;border-top:1px solid ' + COLOURS.line + ';">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td style="font-size:14px;font-weight:600;color:' + COLOURS.navy + ';">D' + d.num + ' &middot; ' + esc(d.name) + badge + '</td>' +
      '<td align="right" style="font-size:13px;color:' + COLOURS.ink + ';white-space:nowrap;padding-left:12px;">' + value + '</td></tr></table>' +
      bar(d.score, d.level) + note + '</td></tr>';
  }).join('');
}

function auditHtml(report) {
  return report.audit.map((g) => {
    const rows = g.items.map((it) =>
      '<tr><td valign="top" style="padding:6px 10px 6px 0;font-size:13px;color:' + COLOURS.muted + ';white-space:nowrap;">Q' + it.n + '</td>' +
      '<td style="padding:6px 10px 6px 0;font-size:13px;color:' + COLOURS.ink + ';">' + esc(it.text) + '</td>' +
      '<td valign="top" align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:' + (it.value === 'NS' ? COLOURS.muted : COLOURS.navy) + ';white-space:nowrap;">' + esc(it.label) + '</td></tr>'
    ).join('');
    return '<div style="margin:16px 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:' + COLOURS.teal + ';">D' + g.num + ' &middot; ' + esc(g.name) + '</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ' + COLOURS.line + ';">' + rows + '</table>';
  }).join('');
}

function auditText(report) {
  return report.audit.map((g) => 'D' + g.num + ' ' + g.name + '\n' + g.items.map((it) => '  Q' + it.n + ': ' + it.text + '\n      -> ' + it.label).join('\n')).join('\n\n');
}

const NOT_SURE_NOTE = "Note: High number of 'Not Sure' responses detected. This typically indicates a lack of cross-functional operational visibility between departments.";

// ---------------------------------------------------------------------------
// EMAIL 1: executive report for the respondent
// ---------------------------------------------------------------------------
export function renderRespondentEmail(report, opts = {}) {
  const bookingUrl = bookingLinkFor(opts.bookingUrl, report);
  const calcUrl = opts.calculatorUrl || 'https://www.kuma.partners/coordination-tax.html';
  const siteUrl = opts.siteUrl || 'https://www.kuma.partners';
  const purgeLive = !!opts.purgeLive;
  const subject = oneLine('Your Leadership Friction Telemetry: ' + report.company + ' (' + report.band + ')');

  const governance = purgeLive
    ? 'Executive Data Governance: your raw response telemetry is strictly confidential, encrypted, and scheduled for automated purge from our active diagnostic servers within 30 days.'
    : 'Executive Data Governance: your individual responses are strictly confidential, are used only to produce this report and to follow up with you, and are never sold or commercialised.';

  const signature =
    '<p style="margin:0;font-size:14px;"><strong>Sven Mulfinger</strong><br>Lead Partner &middot; Kuma Partners<br>' +
    'Email: <a href="mailto:sven@kuma.partners" style="color:' + COLOURS.teal + ';">sven@kuma.partners</a><br>' +
    'LinkedIn: <a href="https://www.linkedin.com/in/svenmulfinger" style="color:' + COLOURS.teal + ';">linkedin.com/in/svenmulfinger</a><br>' +
    'Web: <a href="' + esc(siteUrl) + '" style="color:' + COLOURS.teal + ';">kuma.partners</a></p>';

  const cta = (label) =>
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr><td style="background:' + COLOURS.navy + ';border-radius:8px;">' +
    '<a href="' + esc(bookingUrl) + '" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">' + label + '</a></td></tr></table>';

  const blind =
    h3('This reflects one perspective') +
    p('This diagnostic reflects your individual view from the leadership table. Across the scale-stage teams we advise, founders, COOs and functional VPs consistently experience operational friction in different places.') +
    p('If your team is feeling coordination drag or siloed priorities, you can book a complimentary 30-minute Leadership Friction Debrief directly with me to walk through your four-dimension telemetry.') +
    cta('Book a 30-Minute Telemetry Debrief &rarr;');

  const about =
    h3('About Kuma Partners') +
    p('Kuma Partners provides executive advisory and leadership alignment for venture-backed and scale-stage leadership teams. We work with founders and CEOs to remove organisational drag, break down departmental silos and install decisive operating frameworks without corporate bureaucracy.');

  const footer =
    p(esc(governance), 'font-size:12.5px;color:' + COLOURS.muted + ';font-style:italic;') +
    signature +
    hr +
    h3('Full question-by-question audit') + auditHtml(report) +
    '<p style="margin:22px 0 0;font-size:12px;color:' + COLOURS.muted + ';">You received this because this address was entered on the Leadership Friction Scan at kuma.partners. If that was not you, reply to this email and we will delete the record.</p>';

  let body;
  if (report.insufficient) {
    body =
      p('Hi ' + esc(report.firstName) + ',') +
      p('Thank you for completing the Leadership Friction Scan for <strong>' + esc(report.company) + '</strong> on ' + esc(report.dateLong) + '.') +
      p('Every statement was marked Not Sure, so there is nothing to score yet. That usually means the leadership table does not have shared sight of how decisions and priorities move day to day, which is useful information in itself.') +
      p('The 14-Day Leadership Friction Scan does not depend on one person’s view. It cross-calibrates these questions against confidential, 1-on-1 interviews across your executive team.') +
      cta('Book a 30-Minute Telemetry Debrief &rarr;') + hr + about + hr + footer;
  } else {
    const dom = report.dominant;
    const lowFriction = report.bandId === 'high-flow';
    const runwayLead = lowFriction
      ? 'At ' + esc(report.band) + ' the costs are small today. They grow with headcount, so these are the places to watch.'
      : 'Leadership friction usually sits in the architecture of how decisions, tension and priorities move through the team, rather than in the people. At <strong>' + esc(report.band) + '</strong> the costs tend to show up in the following places.';
    const vectors = [
      '<li style="margin:0 0 10px;">Executive energy drains first. When strategy is read differently in each department, leaders retreat into defensive silos. Cognitive reserves shift from competing in the market to navigating internal consensus, status syncs and cross-departmental politics.</li>',
      '<li style="margin:0 0 10px;">Runway follows. Harvard Business School research by Noam Wasserman found that 65% of high-potential start-ups fail as a result of conflict among the founders. In a McKinsey survey of 1,228 respondents, 61% said most of their organisation’s decision-making time is used ineffectively, and that time is paid for out of runway. You can price it for your own team with the <a href="' + esc(calcUrl) + '" style="color:' + COLOURS.teal + ';">Coordination Tax Calculator</a>.</li>'
    ];
    if (report.founderRisk) {
      vectors.push('<li style="margin:0 0 10px;">Founder-led teams carry a third cost. Undefined decision boundaries send operational calls back to the founder desk. Reversible experiments wait on executive calendars, which caps the pace of the whole company.</li>');
    }

    const protocolSteps = report.protocol.steps.map((s, i) =>
      '<p style="margin:0 0 10px;font-size:14.5px;"><span style="color:' + COLOURS.teal + ';font-weight:700;">' + (i + 1) + '.</span> ' + esc(s) + '</p>').join('');

    body =
      p('Hi ' + esc(report.firstName) + ',') +
      p('Your leadership friction telemetry for <strong>' + esc(report.company) + '</strong> has been compiled from your assessment on ' + esc(report.dateLong) + '.') +
      hr +
      h3('Executive telemetry snapshot') +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COLOURS.wash + ';border:1px solid ' + COLOURS.line + ';border-radius:10px;"><tr><td style="padding:16px 18px;">' +
      '<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:' + COLOURS.teal + ';">Overall Friction Index</div>' +
      '<div style="font-size:34px;font-weight:700;color:' + COLOURS.navy + ';line-height:1.2;">' + report.score + ' <span style="font-size:16px;font-weight:500;color:' + COLOURS.muted + ';">/ 60</span></div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">' +
      '<tr><td style="padding:2px 14px 2px 0;font-size:13px;color:' + COLOURS.muted + ';" valign="top">Operating classification</td><td style="padding:2px 0;font-size:14px;color:' + COLOURS.navy + ';">' + esc(report.band) + ' (' + esc(report.bandFriction) + ')</td></tr>' +
      '<tr><td style="padding:2px 14px 2px 0;font-size:13px;color:' + COLOURS.muted + ';" valign="top">Primary constraint</td><td style="padding:2px 0;font-size:14px;color:' + COLOURS.navy + ';">Dimension ' + dom.num + ', ' + esc(dom.name) + '</td></tr>' +
      '<tr><td style="padding:2px 14px 2px 0;font-size:13px;color:' + COLOURS.muted + ';" valign="top">Dominant friction vector</td><td style="padding:2px 0;font-size:14px;color:' + COLOURS.navy + ';">' + esc(dom.vector) + '</td></tr></table>' +
      '</td></tr></table>' +
      '<h4 style="margin:22px 0 4px;font-size:15px;color:' + COLOURS.navy + ';">Dimension breakdown</h4>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + dimensionRows(report) + '</table>' +
      (report.notSure >= 4 ? p(esc(NOT_SURE_NOTE), 'font-size:12.5px;color:' + COLOURS.muted + ';margin-top:12px;') : '') +
      hr +
      h3('What this means for your runway and P&amp;L') +
      p(runwayLead) +
      '<ol style="margin:0 0 6px;padding-left:20px;font-size:14.5px;">' + vectors.join('') + '</ol>' +
      p('Sources: Harvard Business School, Noam Wasserman, The Founder’s Dilemmas (2012). McKinsey &amp; Company, Decision making in the age of urgency (2019).', 'font-size:12px;color:' + COLOURS.muted + ';') +
      hr +
      h3('Your immediate micro-intervention') +
      p('Based on your dominant friction vector (<strong>' + esc(dom.vector) + '</strong>), run this protocol with your leadership team this week.') +
      '<div style="background:' + COLOURS.wash + ';border-left:4px solid ' + COLOURS.navy + ';padding:16px 18px;margin:12px 0;border-radius:0 8px 8px 0;">' +
      '<div style="font-weight:700;color:' + COLOURS.navy + ';margin-bottom:4px;">Protocol: ' + esc(report.protocol.title) + '</div>' +
      '<div style="font-size:13px;color:' + COLOURS.muted + ';margin-bottom:12px;">' + esc(report.protocol.time) + '</div>' +
      protocolSteps +
      '<div style="margin-top:12px;padding-top:12px;border-top:1px solid ' + COLOURS.line + ';font-size:13.5px;"><span style="color:' + COLOURS.teal + ';">Signal it worked:</span> ' + esc(report.protocol.signal) + '</div>' +
      '</div>' +
      hr + blind + hr + about + hr + footer;
  }

  const preheader = report.insufficient
    ? 'Your Leadership Friction Scan for ' + report.company
    : 'Friction index ' + report.score + ' / 60. ' + report.band + '. Primary constraint: ' + report.dominant.name + '.';

  // Plain-text alternative
  const t = [];
  t.push('Hi ' + report.firstName + ',', '');
  if (report.insufficient) {
    t.push('Thank you for completing the Leadership Friction Scan for ' + report.company + ' on ' + report.dateLong + '.',
      'Every statement was marked Not Sure, so there is nothing to score yet. The 14-Day Leadership Friction Scan does not depend on one person’s view: it cross-calibrates these questions against confidential, 1-on-1 interviews across your executive team.');
  } else {
    t.push('Your leadership friction telemetry for ' + report.company + ' has been compiled from your assessment on ' + report.dateLong + '.', '',
      'EXECUTIVE TELEMETRY SNAPSHOT',
      'Overall Friction Index: ' + report.score + ' / 60',
      'Operating classification: ' + report.band + ' (' + report.bandFriction + ')',
      'Primary constraint: Dimension ' + report.dominant.num + ', ' + report.dominant.name,
      'Dominant friction vector: ' + report.dominant.vector, '',
      'DIMENSION BREAKDOWN',
      ...report.dims.map((d) => 'D' + d.num + ' ' + d.name + ': ' + (d.score === null ? 'Not scored' : fmtScore(d.score) + '/15 (' + d.severity + ')')));
    if (report.notSure >= 4) t.push('', NOT_SURE_NOTE);
    t.push('', 'WHAT THIS MEANS FOR YOUR RUNWAY AND P&L',
      'Harvard Business School research by Noam Wasserman found that 65% of high-potential start-ups fail as a result of conflict among the founders (The Founder’s Dilemmas, 2012). In a McKinsey survey of 1,228 respondents, 61% said most of their organisation’s decision-making time is used ineffectively (Decision making in the age of urgency, 2019). That time is paid for out of runway. Price it for your team: ' + calcUrl,
      '', 'YOUR IMMEDIATE MICRO-INTERVENTION', 'Protocol: ' + report.protocol.title, report.protocol.time,
      ...report.protocol.steps.map((s, i) => (i + 1) + '. ' + s), 'Signal it worked: ' + report.protocol.signal);
  }
  t.push('', 'THIS REFLECTS ONE PERSPECTIVE',
    'Book a complimentary 30-minute Leadership Friction Debrief directly with me: ' + bookingUrl,
    '', governance, '', 'Sven Mulfinger', 'Lead Partner, Kuma Partners', 'sven@kuma.partners', 'https://www.linkedin.com/in/svenmulfinger', siteUrl,
    '', 'FULL QUESTION-BY-QUESTION AUDIT', auditText(report), '',
    'You received this because this address was entered on the Leadership Friction Scan at kuma.partners. If that was not you, reply to this email and we will delete the record.');

  return { subject, html: layout(body, { preheader, logoUrl: opts.logoUrl }), text: t.join('\n') };
}

// ---------------------------------------------------------------------------
// EMAIL 2: triage alert for Sven
// ---------------------------------------------------------------------------
export function renderTriageEmail(report) {
  const domName = report.dominant ? report.dominant.name : 'None (all Not Sure)';
  const scoreText = report.insufficient ? 'n/a' : String(report.score);
  const subject = oneLine('[New Scan] ' + report.firstName + ' (' + report.company + ' - ' + report.stage + ') • ' + scoreText + '/60 • ' + domName);

  const kv = (k, v) =>
    '<tr><td style="padding:5px 14px 5px 0;font-size:13px;color:' + COLOURS.muted + ';white-space:nowrap;" valign="top">' + k + '</td><td style="padding:5px 0;font-size:14px;color:' + COLOURS.ink + ';">' + v + '</td></tr>';
  const sect = (t) => '<div style="margin:24px 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:' + COLOURS.teal + ';">' + t + '</div>';

  const dimLine = report.dims.map((d) => 'D' + d.num + ': ' + (d.score === null ? 'NS' : fmtScore(d.score)) + '/15').join(' | ');

  const inner =
    '<h2 style="margin:0 0 4px;font-size:20px;line-height:1.3;color:' + COLOURS.navy + ';">New Leadership Friction Scan</h2>' +
    '<div style="font-size:14px;color:' + COLOURS.muted + ';">' + esc(report.timestamp) + '</div>' +
    sect('1. Contact and lead details') +
    '<table role="presentation" cellpadding="0" cellspacing="0">' +
    kv('Name', esc(report.name)) +
    kv('Email', '<a href="mailto:' + esc(report.email) + '" style="color:' + COLOURS.teal + ';">' + esc(report.email) + '</a>') +
    kv('Company', esc(report.company)) +
    kv('Stage', esc(report.stage)) +
    kv('Timestamp', esc(report.timestamp)) +
    kv('Source', esc(report.source)) +
    (report.invitedBy ? kv('Invited by', esc(report.invitedBy)) : '') +
    (report.cluster ? kv('Company cluster', esc(report.cluster)) : '') +
    '</table>' +
    sect('2. Telemetry summary') +
    '<table role="presentation" cellpadding="0" cellspacing="0">' +
    kv('Total score', '<strong>' + esc(scoreText) + ' / 60</strong> (Band: ' + esc(report.band) + ')') +
    kv('Dominant constraint', esc(domName) + (report.dominant ? ' (' + esc(report.dominant.vector) + ')' : '')) +
    kv('Dimensions', esc(dimLine)) +
    kv('&ldquo;Not Sure&rdquo; count', String(report.notSure) + (report.notSure >= 4 ? ' <span style="color:' + COLOURS.high + ';">(low visibility signal)</span>' : '')) +
    '</table>' +
    (report.mismatch ? '<p style="margin:12px 0 0;font-size:13px;color:' + COLOURS.high + ';">Check: the posted index (' + esc(report.mismatch.posted) + ') differs from the index recomputed from the answers (' + esc(report.mismatch.recomputed) + '). The recomputed value is used above.</p>' : '') +
    sect('3. Itemised audit') + auditHtml(report) +
    '<p style="margin:24px 0 0;font-size:12px;color:' + COLOURS.muted + ';">Reply to this email to answer ' + esc(report.firstName) + ' directly.</p>';

  const t = [
    'NEW LEADERSHIP FRICTION SCAN', report.timestamp, '',
    '1. CONTACT AND LEAD DETAILS',
    'Name: ' + report.name, 'Email: ' + report.email, 'Company: ' + report.company, 'Stage: ' + report.stage,
    'Timestamp: ' + report.timestamp, 'Source: ' + report.source,
    ...(report.invitedBy ? ['Invited by: ' + report.invitedBy] : []), ...(report.cluster ? ['Company cluster: ' + report.cluster] : []), '',
    '2. TELEMETRY SUMMARY',
    'Total score: ' + scoreText + ' / 60 (Band: ' + report.band + ')',
    'Dominant constraint: ' + domName,
    dimLine,
    'Not Sure count: ' + report.notSure
  ];
  if (report.mismatch) t.push('Check: posted index ' + report.mismatch.posted + ' differs from recomputed ' + report.mismatch.recomputed + '.');
  t.push('', '3. ITEMISED AUDIT', auditText(report));

  return { subject, html: layout(inner, { preheader: scoreText + '/60 ' + report.band + ' for ' + report.company }), text: t.join('\n') };
}

// Three-step follow-up sequence for people who completed the Leadership Friction Scan.
// Pure functions only: timing and copy. Sending and suppression live in nurture-sweep.mjs.
//
//   Email 1, day 2: the co-founder divergence pattern
//   Email 2, day 5: the Type 1 / Type 2 decision boundary
//   Email 3, day 9: a plain-text check-in

import { esc, oneLine, bookingLinkFor } from './scan-emails.mjs';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export const STEPS = [
  { n: 1, afterDays: 2 },
  { n: 2, afterDays: 5 },
  { n: 3, afterDays: 9 }
];

// A step is due from `afterDays` after submission until `windowHours` later. The sweep runs hourly, so a
// two-hour window tolerates one missed run, and the per-step idempotency key stops a double send.
export const WINDOW_HOURS = 2;

export function dueSteps(createdAt, now = Date.now(), windowHours = WINDOW_HOURS) {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return [];
  return STEPS.filter((s) => {
    const due = t + s.afterDays * DAY;
    return now >= due && now < due + windowHours * HOUR;
  }).map((s) => s.n);
}

// Anything older than this can never be due again, so the sweep ignores it.
export const MAX_AGE_MS = (STEPS[STEPS.length - 1].afterDays * DAY) + WINDOW_HOURS * HOUR;

const P = 'margin:0 0 14px;font-size:15px;line-height:1.6;color:#1b2430;';
const para = (t) => '<p style="' + P + '">' + t + '</p>';
const wrap = (inner) =>
  '<!doctype html><html lang="en"><body style="margin:0;padding:24px 16px;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">' +
  '<div style="max-width:560px;margin:0 auto;">' + inner + '</div></body></html>';
const link = (href, label) => '<a href="' + esc(href) + '" style="color:#0f5f66;font-weight:600;">' + esc(label) + '</a>';
const sign = '<p style="' + P + 'margin-bottom:2px;">Sven Mulfinger</p><p style="margin:0 0 18px;font-size:13px;color:#5b6675;">Lead Partner, Kuma Partners</p>';
const STOP = 'If you would rather not get these follow-ups, reply with the word stop and I will take you off the sequence.';
const foot = '<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#7a8594;">' + esc(STOP) + '</p>';

export function renderNurture(n, report, opts = {}) {
  const book = bookingLinkFor(opts.bookingUrl, report);
  const first = report.firstName;
  const company = report.company || 'your company';
  const band = report.band;
  const dom = report.dominant ? report.dominant.name : '';

  if (n === 1) {
    const subject = oneLine('The co-founder divergence pattern at ' + company);
    const html = wrap(
      para('Hi ' + esc(first) + ',') +
      para('Founders whose scan lands in ' + esc(band) + ', with the heaviest drag in ' + esc(dom) + ', often assume their executive peers feel the same bottleneck.') +
      para('In our advisory work with venture-backed leadership teams, co-founders tend to feel the friction in different places:') +
      '<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#1b2430;">' +
      '<li>Founders feel execution is too slow and decisions stall in consensus.</li>' +
      '<li>Functional VPs feel strategic goals change too often and hold back pushback to keep the peace. That is the silent veto.</li></ul>' +
      para('Did you share your 2-page brief with your co-founders?') +
      para('If you would like to go through your four-dimension results and find where internal drag is quietly diluting your runway, you can take 30 minutes on my calendar:') +
      para(link(book, 'Schedule a 30-minute telemetry debrief')) +
      para('Best regards,') + sign + foot);
    const text = [
      'Hi ' + first + ',', '',
      'Founders whose scan lands in ' + band + ', with the heaviest drag in ' + dom + ', often assume their executive peers feel the same bottleneck.', '',
      'In our advisory work with venture-backed leadership teams, co-founders tend to feel the friction in different places:',
      '- Founders feel execution is too slow and decisions stall in consensus.',
      '- Functional VPs feel strategic goals change too often and hold back pushback to keep the peace. That is the silent veto.', '',
      'Did you share your 2-page brief with your co-founders?', '',
      'If you would like to go through your four-dimension results and find where internal drag is quietly diluting your runway, you can take 30 minutes on my calendar:',
      book, '', 'Best regards,', 'Sven Mulfinger', 'Lead Partner, Kuma Partners', '', STOP
    ].join('\n');
    return { subject, html, text };
  }

  if (n === 2) {
    const subject = oneLine('The decision boundary that gives calendar time back');
    const html = wrap(
      para('Hi ' + esc(first) + ',') +
      para('Quick follow-up on your score from earlier this week.') +
      para('When leadership teams run with elevated friction, the usual reaction is another sync meeting or a project manager. That tends to add coordination overhead rather than remove it.') +
      para('One shift we run with scale-stage leadership teams is the Type 1 versus Type 2 decision boundary:') +
      '<ol style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.6;color:#1b2430;">' +
      '<li>Audit the last 10 decisions that escalated to the founder.</li>' +
      '<li>Pick out the reversible tactical calls (Type 2) and give each a single named owner below the executive layer.</li>' +
      '<li>Keep founder sign-off for irreversible bets (Type 1), with a 48-hour response window.</li></ol>' +
      para('Most teams find that audit alone shows how much of the founder calendar goes on decisions that never needed it.') +
      para('If you want to see how this applies to the structure at ' + esc(company) + ', let us talk:') +
      para(link(book, 'Book a 30-minute debrief')) +
      para('Best,') + sign + foot);
    const text = [
      'Hi ' + first + ',', '',
      'Quick follow-up on your score from earlier this week.', '',
      'When leadership teams run with elevated friction, the usual reaction is another sync meeting or a project manager. That tends to add coordination overhead rather than remove it.', '',
      'One shift we run with scale-stage leadership teams is the Type 1 versus Type 2 decision boundary:',
      '1. Audit the last 10 decisions that escalated to the founder.',
      '2. Pick out the reversible tactical calls (Type 2) and give each a single named owner below the executive layer.',
      '3. Keep founder sign-off for irreversible bets (Type 1), with a 48-hour response window.', '',
      'Most teams find that audit alone shows how much of the founder calendar goes on decisions that never needed it.', '',
      'If you want to see how this applies to the structure at ' + company + ', let us talk:', book, '',
      'Best,', 'Sven Mulfinger', 'Lead Partner, Kuma Partners', '', STOP
    ].join('\n');
    return { subject, html, text };
  }

  // Email 3: plain text only, no HTML part.
  const subject = oneLine('Quick question, ' + first);
  const text = [
    'Hi ' + first + ',', '',
    'Did you and your leadership team try the decision boundary, or did operating priorities get in the way?', '',
    'If internal drag or unclear mandates are still slowing execution, I would be glad to find 30 minutes for a confidential debrief:', book, '',
    'Either way, I hope the results were useful.', '',
    'Sven Mulfinger', 'Lead Partner, Kuma Partners', '', STOP
  ].join('\n');
  return { subject, html: null, text };
}

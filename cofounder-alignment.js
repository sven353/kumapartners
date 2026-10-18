/* Co-Founder Alignment Radar (/cofounder-alignment)
   Vanilla JS, no dependencies, no server of our own.

   How the two sides connect without a backend: Founder 1 finishes, and the invite link carries their
   answers inside the URL fragment (the part after #, which browsers never send to any server). Founder 2
   opens it, answers the same eight statements and the comparison runs in their browser. A results link
   (also a fragment) lets Founder 2 send the finished comparison back. Netlify Forms and an optional CRM
   webhook receive each founder's submission, joined by session ID.

   Everything that arrives in a link is untrusted. It is validated strictly and only ever written to the
   page with textContent, never as HTML. */
(function () {
  'use strict';

  // ------------------------------ CONFIG ------------------------------
  var CONFIG = {
    // Calendar link for "Schedule Alignment Debrief". While empty it falls back to the homepage contact section.
    bookingUrl: '',
    // Optional second destination (HubSpot, Zapier, Make). Receives JSON after Netlify accepts a submission.
    crmWebhookUrl: '',
    // Submissions faster than this after the form appears are treated as bots and get a normal-looking success.
    minFillMs: 2500,
    advanceDelayMs: 180
  };

  var SCALE_MAX_GAP = 4; // 5-point scale, so the widest possible gap on one statement is 4

  var DIMENSIONS = [
    { name: 'Growth Pacing & Horizons', short: 'Growth pacing', questions: [0, 1] },
    { name: 'Decision Boundaries & Autonomy', short: 'Decision boundaries', questions: [2, 3] },
    { name: 'Principled Candor & Standards', short: 'Candor & standards', questions: [4, 5] },
    { name: 'Role Evolution & Ownership', short: 'Role evolution', questions: [6, 7] }
  ];

  var STATEMENTS = [
    { short: 'Risk tolerance: burn versus runway',
      text: 'We have identical risk tolerance when choosing between aggressive market growth (higher burn) and capital preservation (longer runway).',
      gap: 'You hold different risk positions on burn versus runway. Each of you may be making budget calls against a different unspoken limit.' },
    { short: 'Exit horizon',
      text: 'We share the exact same definition of our target exit horizon and what an acceptable outcome looks like.',
      gap: 'You are working towards different definitions of a good outcome and a good timeline. Every trade-off between growth and cash reads differently depending on that horizon.' },
    { short: 'Domain autonomy',
      text: 'Our individual decision domains are crystal clear; neither of us second-guesses or overrides the other’s domain decisions.',
      gap: 'You do not experience your decision domains the same way. One of you sees clean autonomy where the other sees second-guessing or override.' },
    { short: 'Tie-break mechanism',
      text: 'When we reach an impasse, we have a clear, pre-agreed mechanism to break ties without resorting to lingering resentment.',
      gap: 'One of you trusts the way you settle a stalemate and the other does not, or there is no agreed way at all. Impasses then end through persistence rather than by rule.' },
    { short: 'Real-time candor',
      text: 'We address critical strategic disagreements directly in real time, rather than letting operational frustrations accumulate silently.',
      gap: 'One of you feels disagreements are raised as they arise and the other feels they are stored up. Frustration that is not named in the moment tends to resurface later in a different form.' },
    { short: 'Executive performance standard',
      text: 'We are completely aligned on the performance standard required across our executive hires, with zero tolerance for underperformance.',
      gap: 'Your standards for the executive team differ. Hiring and exit decisions will look inconsistent to the people who report to you.' },
    { short: 'Building systems, not control',
      text: 'Both of us are actively building systems and leaders to make ourselves dispensable in daily operations, rather than hoarding control.',
      gap: 'You differ on how far each of you is building the company beyond your own involvement. One of you may feel the other is holding on to control.' },
    { short: 'Balance of ownership and load',
      text: 'We feel an equitable balance of emotional ownership, cognitive load, and daily execution energy between us.',
      gap: 'The load is not felt as equal. Emotional ownership, cognitive load and execution energy are carried unevenly, or at least are perceived that way.' }
  ];

  var BANDS = {
    strong: { name: 'Strong Operational Cohesion', friction: 'Low drift.', text: 'Your answers sit close together across the eight statements. The remaining risk is assuming alignment you have not tested under pressure.' },
    latent: { name: 'Latent Strategic Drift', friction: 'Moderate friction.', text: 'Your answers differ in places that are easy to leave unspoken. Gaps at this level usually show up as repeated small frictions rather than one clear conflict.' },
    critical: { name: 'Critical Structural Divergence', friction: 'High friction.', text: 'Your answers differ widely on structural questions. Left alone, gaps like these tend to turn into stalled decisions and avoidable conflict.' }
  };

  // Illustrative answers for the "preview" button, and the offsets used to simulate a co-founder.
  var SAMPLE_A = [5, 4, 4, 2, 4, 3, 2, 4];
  var SIM_OFFSETS = [-1, 0, -3, -1, 1, 0, -2, -1];

  // ------------------------------ pure logic ------------------------------
  function bandFor(index) {
    if (index >= 85) return 'strong';
    if (index >= 65) return 'latent';
    return 'critical';
  }

  function gapLevel(gap) {
    if (gap <= 1) return 'low';
    if (gap === 2) return 'mid';
    return 'high';
  }

  function mean(list) {
    return list.reduce(function (s, v) { return s + v; }, 0) / list.length;
  }

  function computeAlignment(a, b) {
    var deltas = a.map(function (v, i) { return Math.abs(v - b[i]); });
    var total = deltas.reduce(function (s, v) { return s + v; }, 0);
    var index = Math.round(100 * (1 - total / (a.length * SCALE_MAX_GAP)));
    var largest = 0;
    deltas.forEach(function (d, i) { if (d > deltas[largest]) largest = i; });
    var dims = DIMENSIONS.map(function (dim) {
      var gaps = dim.questions.map(function (q) { return deltas[q]; });
      var avgA = mean(dim.questions.map(function (q) { return a[q]; }));
      var avgB = mean(dim.questions.map(function (q) { return b[q]; }));
      return {
        alignPct: Math.round(100 * (1 - mean(gaps) / SCALE_MAX_GAP)),
        avgA: avgA,
        avgB: avgB,
        bothLow: avgA <= 2.5 && avgB <= 2.5
      };
    });
    return { index: index, band: bandFor(index), deltas: deltas, dims: dims, largest: largest, largestGap: deltas[largest] };
  }

  // Deterministic stand-in for a co-founder, used only for previews. Never sent anywhere.
  function simulateCofounder(a) {
    return a.map(function (v, i) {
      var w = v + SIM_OFFSETS[i];
      if (w < 1 || w > 5) w = v - SIM_OFFSETS[i];
      return Math.min(5, Math.max(1, w));
    });
  }

  function cleanText(value) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 80) : '';
  }

  function answersToString(list) { return list.join(''); }
  function answersFromString(str) { return str.split('').map(Number); }

  function toBase64Url(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(str) {
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // Returns a clean payload object or null. Anything that does not match exactly is rejected.
  function decodePayload(token, kind) {
    try {
      if (typeof token !== 'string' || token.length === 0 || token.length > 2000) return null;
      var o = JSON.parse(fromBase64Url(token));
      if (!o || o.v !== 1) return null;
      if (typeof o.s !== 'string' || !/^[A-Z0-9]{6,16}$/.test(o.s)) return null;
      if (typeof o.a !== 'string' || !/^[1-5]{8}$/.test(o.a)) return null;
      if (kind === 'result' && !(typeof o.b === 'string' && /^[1-5]{8}$/.test(o.b))) return null;
      var out = {
        v: 1, s: o.s, a: o.a,
        an: cleanText(o.an), bn: cleanText(o.bn), c: cleanText(o.c)
      };
      if (kind === 'result') out.b = o.b;
      return out;
    } catch (e) { return null; }
  }

  function encodePayload(obj) { return toBase64Url(JSON.stringify(obj)); }

  function newSessionId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    var buf = new Uint8Array(10);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < buf.length; i++) out += chars.charAt(buf[i] % chars.length);
    return out;
  }

  function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeAlignment: computeAlignment, simulateCofounder: simulateCofounder, bandFor: bandFor,
      encodePayload: encodePayload, decodePayload: decodePayload, toBase64Url: toBase64Url, fromBase64Url: fromBase64Url,
      cleanText: cleanText, isValidEmail: isValidEmail, STATEMENTS: STATEMENTS, DIMENSIONS: DIMENSIONS, SAMPLE_A: SAMPLE_A
    };
  }
  if (typeof document === 'undefined') return;

  // ------------------------------ page ------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var views = {
      intro: $('[data-cfa-view="intro"]'),
      flow: $('[data-cfa-view="flow"]'),
      results: $('[data-cfa-view="results"]')
    };
    var panels = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-cfa-panel]'), function (el) {
      panels[el.getAttribute('data-cfa-panel')] = el;
    });

    var state = {
      role: 'a',          // 'a' = Founder 1 flow, 'b' = Founder 2 flow
      answers: [],
      idx: 0,
      locked: false,
      session: '',
      invite: null,       // payload Founder 2 arrived with, or Founder 1's own payload
      gateShownAt: 0,
      resultsUrl: ''
    };

    // ---------- storage (best effort, never required) ----------
    function lsGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
    function lsSet(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ } }

    // ---------- view helpers ----------
    function showView(name) {
      Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    }
    function showPanel(name, focusSel) {
      showView('flow');
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
      window.scrollTo(0, 0);
      var target = $(focusSel || '[data-cfa-focus]', panels[name]);
      if (target) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
      state.gateShownAt = (name === 'gate-a' || name === 'gate-b') ? Date.now() : 0;
    }
    function baseUrl() { return window.location.origin + window.location.pathname; }
    function isLocalPreview() {
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h);
    }
    function utmString() {
      try {
        var p = new URLSearchParams(window.location.search);
        return ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
          .filter(function (k) { return p.get(k); }).map(function (k) { return k + '=' + p.get(k); }).join('&');
      } catch (e) { return ''; }
    }

    // ---------- assessment ----------
    var countEl = $('[data-cfa-count]'), dimEl = $('[data-cfa-dim]'), fillEl = $('[data-cfa-fill]');
    var roleEl = $('[data-cfa-role]'), statementEl = $('[data-cfa-statement]');
    var rateBtns = Array.prototype.slice.call(document.querySelectorAll('[data-cfa-value]'));

    function founderTwoName() { return (state.invite && state.invite.bn) || 'Founder 2'; }

    function startAssessment(role) {
      state.role = role;
      state.answers = [];
      state.idx = 0;
      state.locked = false;
      roleEl.textContent = role === 'a' ? 'You are answering as Founder 1.' : 'You are answering as ' + founderTwoName() + '.';
      renderQuestion();
      showPanel('assess', '[data-cfa-statement]');
    }

    function renderQuestion() {
      var i = state.idx;
      countEl.textContent = (i + 1 < 10 ? '0' : '') + (i + 1) + ' / 08';
      var dim = DIMENSIONS.filter(function (d) { return d.questions.indexOf(i) !== -1; })[0];
      dimEl.textContent = dim.name;
      fillEl.style.width = (i / STATEMENTS.length * 100) + '%';
      statementEl.textContent = STATEMENTS[i].text;
      rateBtns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(state.answers[i] === Number(btn.getAttribute('data-cfa-value'))));
      });
    }

    rateBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.locked) return;
        state.locked = true;
        state.answers[state.idx] = Number(btn.getAttribute('data-cfa-value'));
        rateBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        window.setTimeout(function () {
          state.locked = false;
          if (state.idx < STATEMENTS.length - 1) {
            state.idx += 1;
            renderQuestion();
            statementEl.focus({ preventScroll: true });
          } else {
            fillEl.style.width = '100%';
            finishAssessment();
          }
        }, CONFIG.advanceDelayMs);
      });
    });

    $('[data-cfa-back]').addEventListener('click', function () {
      if (state.locked) return;
      if (state.idx > 0) { state.idx -= 1; renderQuestion(); statementEl.focus({ preventScroll: true }); return; }
      if (state.role === 'b') { showPanel('intro-b'); } else { showView('intro'); window.scrollTo(0, 0); }
    });

    function finishAssessment() {
      if (state.role === 'a') {
        state.session = newSessionId();
        formA.elements.session_id.value = state.session;
        formA.elements.answers_founder_1.value = answersToString(state.answers);
        showPanel('gate-a');
      } else {
        if (!formB.elements.name.value) formB.elements.name.value = state.invite.bn || '';
        showPanel('gate-b');
      }
    }

    // ---------- shared form plumbing ----------
    function setInvalid(form, name, on) {
      var err = form.querySelector('[data-cfa-error="' + name + '"]');
      if (err) err.closest('.field').classList.toggle('is-invalid', on);
    }
    function wireClear(form) {
      Array.prototype.forEach.call(form.querySelectorAll('input[required]'), function (input) {
        input.addEventListener('input', function () { setInvalid(form, input.name, false); });
      });
    }
    function looksLikeBot(form) {
      var trap = form.querySelector('[name="company_tax_id"]');
      if (trap && trap.value.trim() !== '') return true;
      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value.trim() !== '') return true;
      return state.gateShownAt > 0 && (Date.now() - state.gateShownAt) < CONFIG.minFillMs;
    }
    function forwardToCrm(body) {
      if (!CONFIG.crmWebhookUrl) return;
      try {
        fetch(CONFIG.crmWebhookUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true
        }).catch(function () { /* best effort */ });
      } catch (e) { /* same */ }
    }
    function submitLead(form, body) {
      if (isLocalPreview()) {
        if (window.console && console.info) console.info('[Co-Founder Radar] local preview, lead not sent', body);
        return Promise.resolve(body);
      }
      return fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (response) {
        if (!response.ok) throw new Error('Form submission failed with status ' + response.status);
        forwardToCrm(body);
        return body;
      });
    }
    function setBusy(form, busy, idleLabel) {
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = busy;
      btn.querySelector('[data-btn-label]').textContent = busy ? 'Sending…' : idleLabel;
    }

    // ---------- Founder 1: gate and invite ----------
    var formA = $('[data-cfa-form-a]');
    var formB = $('[data-cfa-form-b]');
    wireClear(formA); wireClear(formB);
    var busyA = false, busyB = false;

    formA.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busyA) return;
      var f = formA.elements;
      var name = cleanText(f.name.value), email = f.email.value.trim(), company = cleanText(f.company.value), co = cleanText(f.cofounder_name.value);
      var checks = [['name', name.length >= 2], ['email', isValidEmail(email)], ['company', company.length >= 2], ['cofounder_name', co.length >= 2]];
      var firstBad = null;
      checks.forEach(function (c) { setInvalid(formA, c[0], !c[1]); if (!c[1] && !firstBad) firstBad = c[0]; });
      if (firstBad) { f[firstBad].focus(); return; }

      f.utm.value = utmString();
      var payload = { v: 1, s: state.session, a: answersToString(state.answers), an: name, bn: co, c: company };
      var body = {
        sessionId: state.session, product_intent: 'co-founder-radar', role: 'founder-1',
        founderA: { name: name, email: email, company: company, cofounderName: co, answers: state.answers.slice() },
        source: '/cofounder-alignment', utm: utmString(), referrer: document.referrer || '', submitted_at: new Date().toISOString()
      };

      function done() {
        state.invite = payload;
        lsSet('kuma_cfa_a_' + payload.s, JSON.stringify(payload));
        lsSet('kuma_cfa_last', payload.s);
        showBridge(payload);
      }
      if (looksLikeBot(formA)) { done(); return; }

      formA.querySelector('[data-cfa-form-error]').hidden = true;
      busyA = true; setBusy(formA, true);
      submitLead(formA, body).then(function () { busyA = false; done(); }).catch(function () {
        busyA = false; setBusy(formA, false, 'Generate Co-Founder Invite Link →');
        formA.querySelector('[data-cfa-form-error]').hidden = false;
      });
    });

    var linkInput = $('[data-cfa-link]');
    var copiedEl = $('[data-cfa-copied]');
    function showBridge(payload) {
      var link = baseUrl() + '?session=' + encodeURIComponent(payload.s) + '&role=b&invitee=' + encodeURIComponent(payload.bn) + '#d=' + encodePayload(payload);
      linkInput.value = link;
      copiedEl.textContent = '';
      $('[data-cfa-bridge-sub]').textContent = 'Send this link to ' + payload.bn + '. When ' + payload.bn + ' has answered the same eight statements, the radar unlocks for them and they can send the comparison back to you.';
      showPanel('bridge');
    }

    function copyText(text, input, statusEl) {
      function ok() { statusEl.textContent = 'Link copied.'; }
      function fallback() {
        try {
          if (input) { input.focus(); input.select(); } 
          var done = document.execCommand && document.execCommand('copy');
          statusEl.textContent = done ? 'Link copied.' : 'Press Ctrl+C or Cmd+C to copy.';
        } catch (e) { statusEl.textContent = 'Press Ctrl+C or Cmd+C to copy.'; }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(ok, fallback);
      } else { fallback(); }
    }
    $('[data-cfa-copy]').addEventListener('click', function () { copyText(linkInput.value, linkInput, copiedEl); });
    linkInput.addEventListener('focus', function () { linkInput.select(); });

    $('[data-cfa-sim]').addEventListener('click', function () {
      var p = state.invite;
      renderResults({ a: answersFromString(p.a), b: simulateCofounder(answersFromString(p.a)), an: p.an || 'Founder 1', bn: 'Simulated co-founder', company: p.c, sim: true });
    });
    $('[data-cfa-sample]').addEventListener('click', function () {
      renderResults({ a: SAMPLE_A.slice(), b: simulateCofounder(SAMPLE_A), an: 'Founder 1', bn: 'Simulated co-founder', company: '', sim: true });
    });

    // ---------- Founder 2: intro, gate ----------
    function showFounderTwoIntro(payload) {
      state.invite = payload;
      state.session = payload.s;
      var who = payload.bn || 'there';
      var from = payload.an || 'Your co-founder';
      var co = payload.c ? ' for ' + payload.c : '';
      $('[data-cfa-welcome]').textContent = 'Welcome ' + who + '.';
      $('[data-cfa-welcome-sub]').textContent = from + ' has completed their half of the Kuma Co-Founder Alignment Radar' + co + '. It takes about three minutes to complete yours.';
      showPanel('intro-b');
    }
    $('[data-cfa-begin-b]').addEventListener('click', function () { startAssessment('b'); });

    formB.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busyB) return;
      var f = formB.elements;
      var name = cleanText(f.name.value), email = f.email.value.trim();
      var checks = [['name', name.length >= 2], ['email', isValidEmail(email)]];
      var firstBad = null;
      checks.forEach(function (c) { setInvalid(formB, c[0], !c[1]); if (!c[1] && !firstBad) firstBad = c[0]; });
      if (firstBad) { f[firstBad].focus(); return; }

      var inv = state.invite;
      var a = answersFromString(inv.a), b = state.answers.slice();
      var r = computeAlignment(a, b);
      f.session_id.value = inv.s; f.company.value = inv.c; f.founder_1_name.value = inv.an;
      f.answers_founder_1.value = inv.a; f.answers_founder_2.value = answersToString(b);
      f.alignment_index.value = String(r.index); f.alignment_band.value = BANDS[r.band].name;
      f.delta_scores.value = r.deltas.join(','); f.largest_gap_statement.value = String(r.largest + 1);
      f.utm.value = utmString();

      var body = {
        sessionId: inv.s, product_intent: 'co-founder-radar', company: inv.c,
        founderA: { name: inv.an, answers: a },
        founderB: { name: name, email: email, answers: b },
        deltaScores: r.deltas, alignmentIndex: r.index, band: BANDS[r.band].name, largestGapStatement: r.largest + 1,
        source: '/cofounder-alignment', utm: utmString(), referrer: document.referrer || '', submitted_at: new Date().toISOString()
      };

      function done() {
        var resPayload = { v: 1, s: inv.s, a: inv.a, b: answersToString(b), an: inv.an, bn: name, c: inv.c };
        lsSet('kuma_cfa_r_' + inv.s, JSON.stringify(resPayload));
        state.resultsUrl = baseUrl() + '?session=' + encodeURIComponent(inv.s) + '&view=results#r=' + encodePayload(resPayload);
        renderResults({ a: a, b: b, an: inv.an || 'Founder 1', bn: name, company: inv.c, sim: false, canShare: true });
      }
      if (looksLikeBot(formB)) { done(); return; }

      formB.querySelector('[data-cfa-form-error]').hidden = true;
      busyB = true; setBusy(formB, true);
      submitLead(formB, body).then(function () { busyB = false; done(); }).catch(function () {
        busyB = false; setBusy(formB, false, 'View Alignment Radar →');
        formB.querySelector('[data-cfa-form-error]').hidden = false;
      });
    });

    // ---------- results ----------
    function el(tag, className, text) {
      var n = document.createElement(tag);
      if (className) n.className = className;
      if (text !== undefined) n.textContent = text;
      return n;
    }
    function svg(tag, attrs) {
      var n = document.createElementNS(SVG_NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }
    function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

    function drawRadar(host, r, an, bn) {
      host.textContent = '';
      var cx = 200, cy = 170, R = 100;
      var angles = [-90, 0, 90, 180].map(function (d) { return d * Math.PI / 180; });
      function pt(value, k) { return [cx + Math.cos(angles[k]) * (value / 5) * R, cy + Math.sin(angles[k]) * (value / 5) * R]; }
      function poly(values) { return values.map(function (v, k) { return pt(v, k).join(','); }).join(' '); }

      var desc = DIMENSIONS.map(function (d, k) { return d.short + ': ' + an + ' ' + fmt1(r.dims[k].avgA) + ', ' + bn + ' ' + fmt1(r.dims[k].avgB); }).join('. ');
      var s = svg('svg', { viewBox: '0 0 400 340', role: 'img', 'aria-label': 'Radar chart on a scale of 1 to 5. ' + desc });
      [1, 2, 3, 4, 5].forEach(function (ring) {
        s.appendChild(svg('polygon', { points: poly([ring, ring, ring, ring]), fill: 'none', stroke: '#E2E8F0', 'stroke-width': 1 }));
      });
      angles.forEach(function (ang, k) {
        var p = pt(5, k);
        s.appendChild(svg('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: '#E2E8F0', 'stroke-width': 1 }));
      });
      var labelPos = [[200, 40, 'middle'], [322, 170, 'start'], [200, 308, 'middle'], [78, 170, 'end']];
      var labelLines = [['Growth', 'pacing'], ['Decision', 'boundaries'], ['Candor &', 'standards'], ['Role', 'evolution']];
      labelLines.forEach(function (lines, k) {
        var t = svg('text', { x: labelPos[k][0], y: labelPos[k][1] - (k === 1 || k === 3 ? 6 : 0), 'text-anchor': labelPos[k][2], 'font-size': 13, 'font-family': 'Lato, Arial, sans-serif', 'font-weight': 700, fill: '#0B1523' });
        lines.forEach(function (line, li) {
          var ts = svg('tspan', { x: labelPos[k][0], dy: li === 0 ? 0 : 15 });
          ts.textContent = line;
          t.appendChild(ts);
        });
        s.appendChild(t);
      });
      var aVals = r.dims.map(function (d) { return d.avgA; }), bVals = r.dims.map(function (d) { return d.avgB; });
      s.appendChild(svg('polygon', { points: poly(bVals), fill: 'rgba(11,21,35,.08)', stroke: '#0B1523', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
      s.appendChild(svg('polygon', { points: poly(aVals), fill: 'rgba(29,111,138,.18)', stroke: '#1D6F8A', 'stroke-width': 2.2 }));
      aVals.forEach(function (v, k) { var p = pt(v, k); s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 4, fill: '#1D6F8A' })); });
      bVals.forEach(function (v, k) { var p = pt(v, k); s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 3.5, fill: '#0B1523' })); });
      host.appendChild(s);
    }

    function legendItem(label, dashed) {
      var li = el('li');
      var s = svg('svg', { viewBox: '0 0 28 8', 'aria-hidden': 'true' });
      s.appendChild(svg('line', { x1: 1, y1: 4, x2: 27, y2: 4, stroke: dashed ? '#0B1523' : '#1D6F8A', 'stroke-width': 2.5, 'stroke-dasharray': dashed ? '6 4' : '' }));
      li.appendChild(s);
      li.appendChild(el('span', '', label));
      return li;
    }

    function renderResults(d) {
      var r = computeAlignment(d.a, d.b);
      var band = BANDS[r.band];

      $('[data-cfa-results-title]').textContent = d.company ? 'Alignment radar for ' + d.company : 'Your alignment radar';
      $('[data-cfa-prepared]').textContent = d.an + ' and ' + d.bn + ' compared across eight statements.';
      $('[data-cfa-sim-banner]').hidden = !d.sim;

      $('[data-cfa-index]').textContent = String(r.index);
      $('[data-cfa-band]').textContent = band.name;
      $('[data-cfa-band-text]').textContent = band.friction + ' ' + band.text;

      drawRadar($('[data-cfa-radar]'), r, d.an, d.bn);
      var legend = $('[data-cfa-legend]');
      legend.textContent = '';
      legend.appendChild(legendItem(d.an, false));
      legend.appendChild(legendItem(d.bn, true));

      var dims = $('[data-cfa-dims]');
      dims.textContent = '';
      DIMENSIONS.forEach(function (dim, k) {
        var info = r.dims[k];
        var level = info.alignPct >= 85 ? 'low' : (info.alignPct >= 65 ? 'mid' : 'high');
        var row = el('div', 'cfa-dim-row');
        var left = el('div');
        left.appendChild(el('div', 'cfa-dim-name', dim.name));
        left.appendChild(el('div', 'cfa-dim-meta', d.an + ' ' + fmt1(info.avgA) + ' / ' + d.bn + ' ' + fmt1(info.avgB) + ' (scale 1 to 5)'));
        row.appendChild(left);
        row.appendChild(el('div', 'cfa-dim-pct', info.alignPct + '% aligned'));
        var bar = el('div', 'cfa-dim-bar');
        bar.setAttribute('aria-hidden', 'true');
        var fill = el('span', 'cfa-dim-fill cfa-fill-' + level);
        fill.style.width = info.alignPct + '%';
        bar.appendChild(fill);
        row.appendChild(bar);
        if (info.bothLow) row.appendChild(el('p', 'cfa-dim-note', 'You both rate this dimension low. That is a shared weak spot, not alignment to celebrate.'));
        dims.appendChild(row);
      });

      var heat = $('[data-cfa-heat]');
      heat.textContent = '';
      var head = el('div', 'cfa-heat-head');
      head.setAttribute('role', 'row');
      ['#', 'Statement', d.an, d.bn, 'Gap'].forEach(function (h, i) {
        var c = el('span', i >= 2 && i <= 3 ? 'cfa-cell' : '', h);
        c.setAttribute('role', 'columnheader');
        head.appendChild(c);
      });
      heat.appendChild(head);
      STATEMENTS.forEach(function (st, i) {
        var gap = r.deltas[i];
        var level = gapLevel(gap);
        var row = el('div', 'cfa-heat-row' + (i === r.largest && gap > 1 ? ' is-top' : ''));
        row.setAttribute('role', 'row');
        var cells = [el('span', 'cfa-q', String(i + 1)), el('span', '', st.short), el('span', 'cfa-cell', String(d.a[i])), el('span', 'cfa-cell', String(d.b[i]))];
        cells[2].setAttribute('data-who', d.an); cells[3].setAttribute('data-who', d.bn);
        var gapCell = el('span');
        gapCell.appendChild(el('span', 'cfa-gap cfa-gap-' + level, (level === 'low' ? 'Aligned' : (level === 'mid' ? 'Drift' : 'Divergent')) + (gap ? ' · ' + gap : '')));
        cells.push(gapCell);
        cells.forEach(function (c) { c.setAttribute('role', 'cell'); row.appendChild(c); });
        heat.appendChild(row);
      });

      var top = r.largest, st = STATEMENTS[top], dimOfTop = DIMENSIONS.filter(function (x) { return x.questions.indexOf(top) !== -1; })[0];
      if (r.largestGap <= 1) {
        $('[data-cfa-blind-title]').textContent = 'No major divergence detected';
        $('[data-cfa-blind-quote]').hidden = true;
        $('[data-cfa-blind-text]').textContent = 'No statement differs by more than one point. The useful next step is to test these answers against a real decision you are facing now.';
      } else {
        $('[data-cfa-blind-quote]').hidden = false;
        $('[data-cfa-blind-title]').textContent = 'Largest variance: ' + dimOfTop.name + ' (statement ' + (top + 1) + ')';
        $('[data-cfa-blind-quote]').textContent = '“' + st.text + '”';
        $('[data-cfa-blind-text]').textContent = d.an + ' answered ' + d.a[top] + ' and ' + d.bn + ' answered ' + d.b[top] + '. ' + st.gap;
      }

      var share = $('[data-cfa-share]');
      share.hidden = !d.canShare;
      if (d.canShare) {
        $('[data-cfa-share-text]').textContent = 'Send ' + d.an + ' this results link so you both see the same comparison. It contains both sets of answers, so share it only with them.';
        $('[data-cfa-copied-results]').textContent = '';
      }

      showView('results');
      window.scrollTo(0, 0);
      var title = $('[data-cfa-results-title]');
      try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); }
    }

    $('[data-cfa-copy-results]').addEventListener('click', function () {
      copyText(state.resultsUrl, null, $('[data-cfa-copied-results]'));
    });

    var book = $('[data-cfa-book]');
    if (book && CONFIG.bookingUrl) {
      book.setAttribute('href', CONFIG.bookingUrl);
      if (/^https?:/i.test(CONFIG.bookingUrl)) { book.setAttribute('target', '_blank'); book.setAttribute('rel', 'noopener'); }
    }

    $('[data-cfa-start]').addEventListener('click', function () { startAssessment('a'); });

    // ---------- boot: decide which state the URL asks for ----------
    function boot() {
      var notice = $('[data-cfa-notice]');
      var params = new URLSearchParams(window.location.search);
      var session = params.get('session') || '';
      var hash = window.location.hash.replace(/^#/, '');
      var token = '';
      var kind = '';
      hash.split('&').forEach(function (part) {
        if (part.indexOf('r=') === 0) { token = part.slice(2); kind = 'result'; }
        else if (part.indexOf('d=') === 0 && !token) { token = part.slice(2); kind = 'invite'; }
      });

      if (token) {
        var payload = decodePayload(token, kind === 'result' ? 'result' : 'invite');
        if (payload) {
          if (kind === 'result') {
            renderResults({ a: answersFromString(payload.a), b: answersFromString(payload.b), an: payload.an || 'Founder 1', bn: payload.bn || 'Founder 2', company: payload.c, sim: false });
          } else {
            showFounderTwoIntro(payload);
          }
          return;
        }
        notice.textContent = 'This link looks incomplete or damaged. Ask your co-founder to send it again, or start a new diagnostic below.';
        notice.hidden = false;
      } else if (session) {
        var stored = decodeStored(lsGet('kuma_cfa_a_' + session));
        if (stored && params.get('role') === 'b') { showFounderTwoIntro(stored); return; }
        if (params.get('role') === 'b' || params.get('invitee')) {
          notice.textContent = 'This invite link is missing its answers, so we cannot open it. Ask your co-founder to copy it again with the full address.';
          notice.hidden = false;
        }
      }

      var last = lsGet('kuma_cfa_last');
      var lastPayload = last ? decodeStored(lsGet('kuma_cfa_a_' + last)) : null;
      if (lastPayload) {
        var resume = $('[data-cfa-resume]');
        resume.hidden = false;
        $('[data-cfa-resume-btn]').addEventListener('click', function () { state.invite = lastPayload; state.session = lastPayload.s; showBridge(lastPayload); });
      }
    }

    function decodeStored(raw) {
      if (!raw) return null;
      try {
        var o = JSON.parse(raw);
        return decodePayload(toBase64Url(JSON.stringify(o)), 'invite');
      } catch (e) { return null; }
    }

    // A new link pasted into the same tab only changes the fragment, which does not reload the page.
    window.addEventListener('hashchange', function () { window.location.reload(); });

    boot();
  });
})();

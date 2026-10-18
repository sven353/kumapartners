// Kuma Partners: Leadership Friction Scan (/leadership-friction-scan)
// Vanilla JS, no dependencies, same conventions as site.js.
//
// Flow: intro -> 12 questions (one at a time, 1 to 5 plus Not Sure) -> lead intake -> results dashboard.
// Scoring and copy live in the data blocks at the top. The only place that talks to a
// network is handleLeadSubmission(), the CRM hook. Configure it in CONFIG below.

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------------------------
  var CONFIG = {
    // Booking link for the 30-minute Leadership Friction Debrief (Cal.com, HubSpot Meetings,
    // Chili Piper). Name and email are appended as ?name=&email= when it is set.
    // While this is empty, the button falls back to the intake form on the homepage.
    bookingUrl: '',

    // Optional second destination for the lead and full breakdown, as JSON.
    // Examples: a HubSpot Forms API URL
    // (https://api.hsforms.com/submissions/v3/integration/submit/PORTAL_ID/FORM_GUID, which needs
    // its own payload shape, so adapt buildCrmBody), or a Zapier, Make or serverless endpoint.
    // Netlify Forms always receives the submission first. A failure here never blocks the visitor.
    crmWebhookUrl: '',

    // Anti-bot: minimum time between the intake form appearing and a valid submit.
    minFillMs: 2500,

    // After an answer, wait this long so the selection is visible before moving on.
    advanceDelayMs: 150,

    // Data governance wording. The page ships with wording that matches what the site does today:
    // HTTPS in transit, details used only to follow up on the scan, nothing sold.
    // Set this to true ONLY once the 30-day purge and the encryption claims are operationally true
    // (for example a scheduled job that deletes Netlify Forms submissions and CRM records after
    // 30 days). That switches the landing page, lead capture and results page to the full
    // "End-to-End Encrypted / 30-Day Automatic Data Purge / Zero Third-Party Sharing" wording.
    dataPurgeLive: false
  };

  // Stored with every submission so the CRM can tell the 4-point v1 scale from this one.
  var SCALE_VERSION = '5pt-not-sure-v2';

  // ---------------------------------------------------------------------------
  // DATA: dimensions, statements, scale
  // ---------------------------------------------------------------------------
  var DIMENSIONS = {
    d1: { number: 1, name: 'Decision Velocity & Autonomy', field: 'd1_decision_velocity' },
    d2: { number: 2, name: 'Strategic Signal vs. Noise', field: 'd2_strategic_signal' },
    d3: { number: 3, name: 'Principled Tension & Candor', field: 'd3_principled_tension' },
    d4: { number: 4, name: 'Operational Cadence & Cognitive Bandwidth', field: 'd4_operational_cadence' }
  };

  // Display and storage order. Ties for the dominant vector resolve in TIE_ORDER:
  // D1 first, then D3 (as specified), then D2 and D4 so that every tie has a defined winner.
  var DIMENSION_ORDER = ['d1', 'd2', 'd3', 'd4'];
  var TIE_ORDER = ['d1', 'd3', 'd2', 'd4'];

  var QUESTIONS = [
    { dim: 'd1', text: 'Operational decisions stall while teams wait for direct co-founder or CEO input, even when the scope is fully within their domain.' },
    { dim: 'd1', text: 'Reversible experiments are treated with the same bureaucratic deliberation and risk aversion as irreversible structural bets.' },
    { dim: 'd1', text: 'Important decisions emerge without a single clear owner, leading to ambiguity over who is accountable when execution lags.' },
    { dim: 'd2', text: 'Priorities agreed upon at the executive table get diluted, renegotiated, or re-debated before they reach frontline execution.' },
    { dim: 'd2', text: 'The executive team spends more meeting time reporting backward-looking status updates than addressing cross-functional blockers.' },
    { dim: 'd2', text: 'New strategic ideas or customer requests frequently derail agreed quarterly objectives before those initiatives land.' },
    { dim: 'd3', text: 'Tough, necessary disagreements are avoided or softened in group meetings, only to be re-hashed in 1-on-1 side conversations later.' },
    { dim: 'd3', text: 'Feedback across functional peers is rare; cross-departmental friction is escalated upward to the CEO to arbitrate.' },
    { dim: 'd3', text: 'The team accepts persistent underperformance or cultural drift to maintain surface harmony and avoid uncomfortable tension.' },
    { dim: 'd4', text: 'Executive calendars are over 60% booked with reactive internal meetings, leaving minimal unbroken time for deep strategic focus.' },
    { dim: 'd4', text: 'Adding new team members or leaders has increased coordination friction and communication overhead rather than linear output.' },
    { dim: 'd4', text: 'The leadership team leaves weekly meetings without absolute clarity on the single most critical priority for the next 7 days.' }
  ];
  var TOTAL = QUESTIONS.length; // 12

  // ---------------------------------------------------------------------------
  // DATA: bands, vectors, interventions
  // ---------------------------------------------------------------------------
  // Overall bands on the 12 to 60 index.
  var BANDS = [
    {
      id: 'high-flow', min: 12, max: 25, name: 'High-Flow Velocity', friction: 'Low Friction', badge: 'sc-badge-optimal',
      text: 'Decisions move, priorities hold and the team can disagree in the room. Scale tends to erode this first, so recheck it each quarter.'
    },
    {
      id: 'operational-drag', min: 26, max: 42, name: 'Operational Drag', friction: 'Moderate Friction', badge: 'sc-badge-moderate',
      text: 'Friction is measurable and starting to cost speed. It is usually concentrated in one dimension, which makes it fixable without restructuring.'
    },
    {
      id: 'systemic-gridlock', min: 43, max: 60, name: 'Critical Systemic Gridlock', friction: 'High Friction', badge: 'sc-badge-high',
      text: 'Friction is now the main constraint on execution. Several dimensions are compounding, and the team is unlikely to untangle it from the inside.'
    }
  ];

  // Per-dimension level on the 3 to 15 scale: green 3 to 6, amber 7 to 10, red 11 to 15.
  // Fractional scores (from Not Sure answers) are rounded to the nearest whole number first.
  function levelFor(dimScore) {
    if (dimScore === null || dimScore === undefined) return { id: 'none', label: 'Not enough data' };
    var r = Math.round(dimScore + 1e-9);
    if (r <= 6) return { id: 'low', label: 'Low' };
    if (r <= 10) return { id: 'moderate', label: 'Moderate' };
    return { id: 'high', label: 'High' };
  }

  var VECTORS = {
    d1: { name: 'The Founder Bottleneck', text: 'Decisions default inward. Execution speed is capped by founder calendar bandwidth.' },
    d2: { name: 'Kinetic Drift', text: 'High internal motion with a low unified vector. Priorities shift before execution solidifies.' },
    d3: { name: 'Artificial Harmony Trap', text: 'Polite consensus is masking operational misalignment. Unspoken tension erodes accountability.' },
    d4: { name: 'The Coordination Tax', text: 'Scaling headcount has triggered exponential meeting overhead and context-switching.' }
  };

  // Print brief only: what typically follows if the dominant pattern is left alone.
  // Kuma Partners view, deliberately without invented statistics.
  var DELAY = {
    d1: [
      'Approval requests keep routing to the founder. The calendar fills with sign-offs and initiatives that need a yes wait for it.',
      'Leaders stop deciding and start asking. The founder becomes the pace-setter for every function.',
      'The founder is the limit on growth. Milestones slip before the board update and stronger leaders begin to disengage.'
    ],
    d2: [
      'Agreed priorities get reopened in side conversations. New requests enter the quarter without a named trade.',
      'Functions optimise for their own goals while the shared company bets slip. Status reporting grows to fill the gap.',
      'The quarter closes with plenty of motion and few shipped outcomes. The board update has to explain the drift.'
    ],
    d3: [
      'Disagreements are softened in the room and settled afterwards in side conversations. Decisions get made twice.',
      'Peers stop giving each other direct feedback and the CEO becomes the arbiter. Underperformance goes unaddressed.',
      'Settled decisions keep being reopened and trust thins. The strongest people disengage first.'
    ],
    d4: [
      'Calendars stay full of reactive meetings. Deep work and strategic decisions move to evenings and weekends.',
      'New hires add coordination load faster than output. Context switching becomes the normal way of working.',
      'Meeting load, not strategy, sets the pace. Next quarter\u2019s priorities go to whoever has time left.'
    ]
  };

  var INTERVENTIONS = {
    d1: {
      title: 'The Type 1 vs. Type 2 Decision Boundary Protocol',
      lead: 'Separate the decisions that need a founder from the ones that only wait for one.',
      time: 'About 45 minutes with the leadership team, then a two-week trial.',
      steps: [
        'List the last ten decisions that waited on the CEO or a co-founder. Label each Type 1 (costly or slow to reverse) or Type 2 (reversible within a quarter at modest cost).',
        'Give every Type 2 decision a named owner below the founder, with authority to decide first and inform afterwards.',
        'Keep founder sign-off for Type 1 decisions only, and commit in writing to a 48-hour answer window for them.',
        'Review the list at the end of week two. Count what still came back to the founder and ask why.'
      ],
      signal: 'The share of decisions reaching the founder falls, and the founder calendar shows fewer approval-only meetings.'
    },
    d2: {
      title: 'The 90-Day Alignment Compact & Priority Freeze',
      lead: 'Hold the direction still long enough for execution to catch up with it.',
      time: 'About half a day to agree, then a one-minute check each week.',
      steps: [
        'Choose no more than three company outcomes for the next 90 days. Write each with a measurable result and a single named owner.',
        'Put the outcomes on one page and have every executive sign it before the meeting ends.',
        'Freeze the list. New ideas and customer requests go on a parking list that is reviewed once, at day 45, and any addition must name the outcome it replaces.',
        'Open each weekly leadership meeting by confirming the freeze has held.'
      ],
      signal: 'Frontline teams can name the same outcomes the executive team signed, and no priority gets reopened without a named trade.'
    },
    d3: {
      title: 'The Structured Executive Tension Round',
      lead: 'Bring the corridor conversations into the room, with a time limit and a decision at the end.',
      time: 'About 30 minutes, at the start of your next leadership meeting.',
      steps: [
        'Each executive names one issue they have discussed privately but not yet in the room. Two minutes each, with no replies during the round.',
        'The group picks the issue with the largest effect on delivery. One person states the disagreement as two positions and the cost of each.',
        'Debate for 20 minutes, then close with a decision, one owner and a date, whether or not everyone agrees.',
        'Agree that any issue raised afterwards in a side conversation returns to the next round instead of being settled privately.'
      ],
      signal: 'Fewer decisions get reopened after meetings, and cross-functional disputes stop travelling upward to the CEO.'
    },
    d4: {
      title: 'The Meeting Cadence Audit & Asynchronous Default',
      lead: 'Count what coordination costs, then stop paying for the part that only informs.',
      time: 'About two hours for the audit, then one week to reset the calendar.',
      steps: [
        'Export two weeks of executive calendars and tag every recurring meeting as decide, debate or inform.',
        'Convert each inform meeting into a written update due the evening before, and cancel the slot.',
        'Cap reactive internal meetings at 40 percent of each executive week and protect two unbroken focus blocks.',
        'End every weekly leadership meeting by writing down the single most critical priority for the next seven days.'
      ],
      signal: 'Booked hours fall under the cap, and every executive can state the weekly priority without checking notes.'
    }
  };

  // ---------------------------------------------------------------------------
  // SCORING (pure, no DOM)
  // ---------------------------------------------------------------------------
  // answers: array of 12 entries in question order. An integer 1 to 5 is scored. Anything else
  // (the 'NS' Not Sure value, null, undefined) is treated as Not Sure and left out of both the
  // numerator and the denominator.
  //
  // Dimension score = (sum of answered values / number answered) x 3, so it always sits on 3 to 15
  // and equals the plain sum when all three statements are answered.
  // Overall index = sum of the four dimension scores (12 to 60).
  // If one or more dimensions have no numeric answer at all, the index is the sum of the scored
  // dimensions scaled by 4 / (scored dimensions), so it stays on the same 12 to 60 range.
  // If nothing is scored the result is flagged insufficient and carries no index or band.
  // The dominant dimension is chosen on unrounded scores, ties resolving in TIE_ORDER.
  function isScored(v) { return typeof v === 'number' && v >= 1 && v <= 5 && v % 1 === 0; }
  function round1(n) { return Math.round(n * 10) / 10; }

  function computeResult(answers) {
    var sums = { d1: 0, d2: 0, d3: 0, d4: 0 };
    var counts = { d1: 0, d2: 0, d3: 0, d4: 0 };
    var notSure = 0;
    for (var i = 0; i < TOTAL; i++) {
      var v = answers[i];
      if (isScored(v)) { sums[QUESTIONS[i].dim] += v; counts[QUESTIONS[i].dim] += 1; } else { notSure += 1; }
    }

    var raw = {}, dims = {}, sum = 0, scoredDims = 0;
    DIMENSION_ORDER.forEach(function (k) {
      if (counts[k] > 0) {
        raw[k] = (sums[k] * 3) / counts[k];
        dims[k] = round1(raw[k]);
        sum += raw[k];
        scoredDims += 1;
      } else {
        raw[k] = null;
        dims[k] = null;
      }
    });

    if (scoredDims === 0) {
      return { insufficient: true, total: null, exact: null, dims: dims, raw: raw, counts: counts, notSure: notSure, dominant: null, band: null };
    }

    var exact = scoredDims < 4 ? (sum * 4) / scoredDims : sum;
    var total = Math.round(exact + 1e-9);

    var dominant = null;
    TIE_ORDER.forEach(function (k) {
      if (raw[k] === null) return;
      if (dominant === null || raw[k] > raw[dominant] + 1e-9) dominant = k;
    });

    var band = BANDS[0];
    for (var b = 0; b < BANDS.length; b++) {
      if (total >= BANDS[b].min && total <= BANDS[b].max) band = BANDS[b];
    }

    return { insufficient: false, total: total, exact: exact, dims: dims, raw: raw, counts: counts, notSure: notSure, dominant: dominant, band: band };
  }

  // Test hook for Node. In the browser `module` is undefined, so this is a no-op.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeResult: computeResult, levelFor: levelFor, QUESTIONS: QUESTIONS, BANDS: BANDS, TIE_ORDER: TIE_ORDER,
      SCALE_VERSION: SCALE_VERSION, DIMENSIONS: DIMENSIONS, DIMENSION_ORDER: DIMENSION_ORDER, VECTORS: VECTORS, INTERVENTIONS: INTERVENTIONS
    };
  }

  if (typeof document === 'undefined') return;

  // ---------------------------------------------------------------------------
  // DOM + STATE
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('lfs-flow');
    if (!root) return;

    // Governance wording: the stricter 30-day purge copy only shows once CONFIG.dataPurgeLive is true.
    document.body.setAttribute('data-lfs-privacy', CONFIG.dataPurgeLive ? 'full' : 'interim');

    var views = {
      intro: document.getElementById('lfs-intro'),
      flow: root,
      results: document.getElementById('lfs-results')
    };
    var panels = {
      quiz: root.querySelector('[data-lfs-panel="quiz"]'),
      gate: root.querySelector('[data-lfs-panel="gate"]')
    };

    var statementEl = root.querySelector('[data-lfs-statement]');
    var countEl = root.querySelector('[data-lfs-count]');
    var dimEl = root.querySelector('[data-lfs-dim]');
    var fillEl = root.querySelector('[data-lfs-fill]');
    var rateButtons = Array.prototype.slice.call(root.querySelectorAll('.lfs-rate'));
    var form = root.querySelector('[data-lfs-form]');
    var submitBtn = form.querySelector('[data-lfs-submit]');
    var submitLabel = submitBtn.querySelector('[data-btn-label]');
    var formError = form.querySelector('[data-lfs-form-error]');

    var state = {
      view: 'intro',   // intro | quiz | gate | results
      step: 0,         // index of the current question, 0 to 11
      answers: new Array(TOTAL),
      lead: null,
      result: null,
      gateShownAt: 0,
      advancing: false,
      busy: false
    };

    // ---- view switching ----
    function setView(name) {
      state.view = name;
      views.intro.hidden = name !== 'intro';
      views.flow.hidden = !(name === 'quiz' || name === 'gate');
      views.results.hidden = name !== 'results';
      panels.quiz.hidden = name !== 'quiz';
      panels.gate.hidden = name !== 'gate';
    }

    function bringIntoView(el, focusEl) {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (focusEl) {
        try { focusEl.focus({ preventScroll: true }); } catch (e) { focusEl.focus(); }
      }
    }

    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    // ---- questions ----
    function renderQuestion() {
      var q = QUESTIONS[state.step];
      statementEl.textContent = q.text;
      countEl.textContent = pad2(state.step + 1) + ' / ' + TOTAL;
      dimEl.textContent = DIMENSIONS[q.dim].name;
      fillEl.style.width = (((state.step + 1) / TOTAL) * 100) + '%';
      markSelected();
      swapIn();
    }

    function markSelected() {
      var current = state.answers[state.step];
      rateButtons.forEach(function (btn) {
        var on = current !== undefined && btn.getAttribute('data-value') === String(current);
        btn.classList.toggle('selected', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    // Restart the short fade on the statement and scale so a new question never pops in.
    var swapEls = [statementEl, root.querySelector('[data-lfs-scale]')];
    function swapIn() {
      swapEls.forEach(function (el) { if (el) el.classList.remove('lfs-swap'); });
      void root.offsetWidth;
      swapEls.forEach(function (el) { if (el) el.classList.add('lfs-swap'); });
    }

    function startScan() {
      state.step = 0;
      state.advancing = false;
      setView('quiz');
      renderQuestion();
      bringIntoView(views.flow, statementEl);
    }

    function answer(value) {
      if (state.view !== 'quiz' || state.advancing) return;
      state.answers[state.step] = value;
      markSelected();
      state.advancing = true;
      window.setTimeout(function () {
        state.advancing = false;
        if (state.view !== 'quiz') return;
        if (state.step < TOTAL - 1) {
          state.step += 1;
          renderQuestion();
          try { statementEl.focus({ preventScroll: true }); } catch (e) { statementEl.focus(); }
        } else {
          showGate();
        }
      }, CONFIG.advanceDelayMs);
    }

    function goBack() {
      if (state.view === 'gate') {
        state.step = TOTAL - 1;
        setView('quiz');
        renderQuestion();
        bringIntoView(views.flow, statementEl);
        return;
      }
      if (state.view !== 'quiz') return;
      if (state.step > 0) {
        state.step -= 1;
        renderQuestion();
        try { statementEl.focus({ preventScroll: true }); } catch (e) { statementEl.focus(); }
      } else {
        setView('intro');
        bringIntoView(views.intro);
      }
    }

    // ---- lead intake ----
    function showGate() {
      state.result = computeResult(state.answers);
      setView('gate');
      state.gateShownAt = Date.now();
      formError.hidden = true;
      var title = document.getElementById('lfs-gate-title');
      bringIntoView(views.flow, title);
    }

    function fieldWrap(name) {
      var el = form.elements[name];
      return el ? el.closest('.field') : null;
    }

    function validateForm() {
      var ok = true;
      var checks = {
        name: function (v) { return v.trim().length > 1; },
        email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
        company: function (v) { return v.trim().length > 1; },
        stage: function (v) { return v !== ''; }
      };
      var firstInvalid = null;
      Object.keys(checks).forEach(function (name) {
        var el = form.elements[name];
        var wrap = fieldWrap(name);
        var valid = checks[name](el.value || '');
        if (wrap) wrap.classList.toggle('is-invalid', !valid);
        el.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (!valid) { ok = false; if (!firstInvalid) firstInvalid = el; }
      });
      if (firstInvalid) firstInvalid.focus();
      return ok;
    }

    function looksLikeBot() {
      var trap = form.querySelector('[name="company_tax_id"]');
      if (trap && trap.value.trim() !== '') return true;
      var honey = form.querySelector('[name="bot-field"]');
      if (honey && honey.value.trim() !== '') return true;
      return state.gateShownAt > 0 && (Date.now() - state.gateShownAt) < CONFIG.minFillMs;
    }

    function utmString() {
      try {
        var p = new URLSearchParams(window.location.search);
        var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        return keys.filter(function (k) { return p.get(k); })
          .map(function (k) { return k + '=' + p.get(k); }).join('&');
      } catch (e) { return ''; }
    }

    function fillHiddenFields(result) {
      form.elements.friction_index.value = result.insufficient ? 'NS' : String(result.total);
      form.elements.friction_band.value = result.insufficient ? 'Insufficient data' : result.band.name;
      form.elements.dominant_vector.value = result.insufficient ? 'Insufficient data' : VECTORS[result.dominant].name;
      DIMENSION_ORDER.forEach(function (key) {
        form.elements[DIMENSIONS[key].field].value = result.dims[key] === null ? 'NS' : String(result.dims[key]);
      });
      form.elements.not_sure_count.value = String(result.notSure);
      form.elements.scale_version.value = SCALE_VERSION;
      form.elements.answers.value = answersCsv();
      form.elements.utm.value = utmString();
    }

    // ---- CRM HOOK -----------------------------------------------------------
    // Single place where lead data and the full breakdown leave the page.
    //   lead:      { name, email, company, stage }
    //   breakdown: { total, band, dominant, dimensions, answers }
    // Step 1 posts the form to Netlify Forms, which is how every other form on the site
    // reaches the inbox. Step 2 forwards the same data as JSON to CONFIG.crmWebhookUrl, if set.
    // Returns a promise that resolves once the Netlify submission has succeeded.
    function handleLeadSubmission(lead, breakdown) {
      var body = buildCrmBody(lead, breakdown);

      if (isLocalPreview()) {
        // Netlify Forms does not exist on a local static server, so skip the network.
        if (window.console && console.info) console.info('[Friction Scan] local preview, lead not sent', body);
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

    function buildCrmBody(lead, breakdown) {
      return {
        lead: lead,
        breakdown: breakdown,
        meta: {
          page: window.location.pathname,
          submittedAt: new Date().toISOString(),
          referrer: document.referrer || '',
          utm: utmString()
        }
      };
    }

    function forwardToCrm(body) {
      if (!CONFIG.crmWebhookUrl) return;
      try {
        fetch(CONFIG.crmWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true
        }).catch(function () { /* the CRM copy is best effort and never blocks the visitor */ });
      } catch (e) { /* same */ }
    }

    function isLocalPreview() {
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h);
    }
    // -------------------------------------------------------------------------

    // 1 to 5, or NS for Not Sure, in question order.
    function answersCsv() {
      var out = [];
      for (var i = 0; i < TOTAL; i++) out.push(state.answers[i] === undefined ? 'NS' : state.answers[i]);
      return out.join(',');
    }

    function breakdownFrom(result) {
      return {
        scaleVersion: SCALE_VERSION,
        total: result.total,
        band: result.insufficient ? 'Insufficient data' : result.band.name,
        friction: result.insufficient ? '' : result.band.friction,
        dominant: result.insufficient ? null : { key: result.dominant, name: VECTORS[result.dominant].name, dimension: DIMENSIONS[result.dominant].name },
        dimensions: {
          d1: result.dims.d1, d2: result.dims.d2, d3: result.dims.d3, d4: result.dims.d4
        },
        answeredPerDimension: { d1: result.counts.d1, d2: result.counts.d2, d3: result.counts.d3, d4: result.counts.d4 },
        notSureCount: result.notSure,
        answers: answersCsv().split(',').map(function (v) { return v === 'NS' ? 'NS' : Number(v); })
      };
    }

    function onSubmit(e) {
      e.preventDefault();
      if (state.busy) return;
      if (!validateForm()) return;

      var result = state.result || computeResult(state.answers);
      state.lead = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        company: form.elements.company.value.trim(),
        stage: form.elements.stage.value
      };

      // Bots get the normal result view and no network call, so they have no error to retry on.
      if (looksLikeBot()) { showResults(result); return; }

      formError.hidden = true;
      fillHiddenFields(result);
      state.busy = true;
      submitBtn.disabled = true;
      submitLabel.textContent = 'Preparing…';

      handleLeadSubmission(state.lead, breakdownFrom(result)).then(function () {
        state.busy = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'View Diagnostic Breakdown →';
        showResults(result);
      }).catch(function () {
        state.busy = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'View Diagnostic Breakdown →';
        formError.hidden = false;
      });
    }

    // ---- results ----
    function q(sel) { return views.results.querySelector(sel); }

    function showResults(result) {
      state.result = result;
      renderResults(result);
      wireBooking();
      setView('results');
      bringIntoView(views.results, document.getElementById('lfs-results-title'));
      // Animate the gauge marker and the dimension bars from empty to their values.
      var marker = q('[data-res-marker]');
      marker.style.left = '0%';
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (!result.insufficient) marker.style.left = markerPosition(result.total) + '%';
          Array.prototype.forEach.call(views.results.querySelectorAll('[data-w]'), function (el) {
            el.style.width = el.getAttribute('data-w') + '%';
          });
        });
      });
    }

    function markerPosition(total) {
      // 49 possible index values (12 to 60). Centre the marker in the cell of its value.
      return ((total - 12 + 0.5) / 49) * 100;
    }

    function fmt(n) { return n === null ? 'NS' : (n % 1 === 0 ? String(n) : n.toFixed(1)); }

    function renderResults(result) {
      var first = state.lead ? state.lead.name.split(/\s+/)[0] : '';
      var scored = TOTAL - result.notSure;
      var basis = result.notSure === 0
        ? 'Based on your answers to all 12 statements.'
        : 'Based on ' + scored + ' of 12 statements. ' + result.notSure + ' marked Not Sure and left out of the score.';
      q('[data-res-prepared]').textContent = state.lead
        ? 'Prepared for ' + first + ' at ' + state.lead.company + '. ' + basis
        : basis;

      var insufficient = result.insufficient;
      var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      q('[data-res-print-meta]').textContent = state.lead
        ? 'Prepared for: ' + state.lead.name + ' at ' + state.lead.company + ' \u2022 Benchmark: ' + today + ' \u2022 ' + basis
        : 'Benchmark: ' + today + ' \u2022 ' + basis;
      var marker = q('[data-res-marker]');
      marker.hidden = insufficient;
      q('[data-res-vector-card]').hidden = insufficient;
      q('[data-res-intervention-card]').hidden = insufficient;
      q('[data-res-delay-card]').hidden = insufficient;
      q('[data-res-memo]').hidden = insufficient;

      // 1. Overall index
      var badge = q('[data-res-badge]');
      if (insufficient) {
        q('[data-res-score]').textContent = '–';
        badge.className = 'sc-score-badge';
        badge.textContent = 'Insufficient data';
        q('[data-res-band]').textContent = 'No index available';
        q('[data-res-band-text]').textContent = 'Every statement was marked Not Sure, so there is nothing to score. Retake the scan with a colleague who sees the day-to-day, or ask us to run the 14-Day Scan, which does not depend on one person’s view.';
      } else {
        q('[data-res-score]').textContent = String(result.total);
        badge.className = 'sc-score-badge ' + result.band.badge;
        badge.textContent = result.band.friction;
        q('[data-res-band]').textContent = result.band.name;
        q('[data-res-band-text]').textContent = result.band.text;
      }

      // Founder centrality benchmark only when Dimension 1 is the dominant dimension
      q('[data-res-founder-risk]').hidden = result.dominant !== 'd1';

      // Not Sure footnote
      q('[data-res-ns-note]').hidden = result.notSure < 4;

      // Dimension matrix: gradient bars on a 3 to 15 scale
      var list = q('[data-res-dims]');
      list.textContent = '';
      DIMENSION_ORDER.forEach(function (key) {
        var score = result.dims[key];
        var level = levelFor(score);
        var li = document.createElement('li');
        li.className = 'lfs-dim' + (key === result.dominant ? ' is-dominant' : '');

        var name = document.createElement('div');
        name.className = 'lfs-dim-name';
        var num = document.createElement('span');
        num.className = 'lfs-dim-num';
        num.textContent = 'D' + DIMENSIONS[key].number;
        name.appendChild(num);
        name.appendChild(document.createTextNode(DIMENSIONS[key].name));
        if (key === result.dominant) {
          var tag = document.createElement('span');
          tag.className = 'lfs-dim-tag';
          tag.textContent = 'Dominant Bottleneck';
          name.appendChild(tag);
        }

        var value = document.createElement('div');
        value.className = 'lfs-dim-value ' + level.id;
        var big = document.createElement('span');
        big.className = 'lfs-dim-score';
        big.textContent = score === null ? 'NS' : fmt(score) + ' / 15';
        var lvl = document.createElement('span');
        lvl.className = 'lfs-sr';
        lvl.textContent = score === null ? ', not scored' : ', ' + level.label.toLowerCase() + ' friction';
        value.appendChild(big);
        value.appendChild(lvl);

        var bar = document.createElement('div');
        bar.className = 'lfs-bar';
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', DIMENSIONS[key].name + ': ' + (score === null ? 'not enough answers' : fmt(score) + ' out of 15, ' + level.label.toLowerCase() + ' friction'));
        var fill = document.createElement('div');
        fill.className = 'lfs-bar-fill ' + level.id;
        fill.style.width = '0%';
        fill.setAttribute('data-w', score === null ? '0' : String(Math.round((score / 15) * 1000) / 10));
        bar.appendChild(fill);

        li.appendChild(name);
        li.appendChild(value);
        li.appendChild(bar);
        if (result.counts[key] < 3) {
          var meta = document.createElement('div');
          meta.className = 'lfs-dim-meta';
          meta.textContent = result.counts[key] === 0
            ? 'All three statements marked Not Sure. This dimension is not scored.'
            : 'Scaled from ' + result.counts[key] + ' of 3 answers.';
          li.appendChild(meta);
        }
        list.appendChild(li);
      });

      if (insufficient) return;

      // 2. Dominant vector
      var vec = VECTORS[result.dominant];
      q('[data-res-vector]').textContent = vec.name;
      q('[data-res-vector-text]').textContent = vec.text;
      q('[data-res-vector-source]').textContent =
        'Driven by Dimension ' + DIMENSIONS[result.dominant].number + ', ' + DIMENSIONS[result.dominant].name +
        ' (' + fmt(result.dims[result.dominant]) + ' / 15).';
      var note = q('[data-res-vector-note]');
      if (result.band.id === 'high-flow') {
        note.hidden = false;
        note.textContent = 'Overall friction is low. This is your relative pressure point, so treat the intervention below as a light check.';
      } else {
        note.hidden = true;
        note.textContent = '';
      }

      // 3. Micro-intervention
      var iv = INTERVENTIONS[result.dominant];
      q('[data-res-intervention]').textContent = iv.title;
      q('[data-res-intervention-lead]').textContent = iv.lead;
      q('[data-res-intervention-time]').textContent = iv.time;
      var steps = q('[data-res-steps]');
      steps.textContent = '';
      iv.steps.forEach(function (st) {
        var li = document.createElement('li');
        li.textContent = st;
        steps.appendChild(li);
      });
      q('[data-res-signal]').textContent = iv.signal;

      // Print brief: 30, 60 and 90 day progression for the dominant dimension
      var delayList = q('[data-res-delay]');
      delayList.textContent = '';
      [30, 60, 90].forEach(function (days, i) {
        var li = document.createElement('li');
        var head = document.createElement('span');
        head.className = 'lfs-delay-days';
        head.textContent = 'In ' + days + ' days';
        var body = document.createElement('p');
        body.textContent = DELAY[result.dominant][i];
        li.appendChild(head);
        li.appendChild(body);
        delayList.appendChild(li);
      });
    }

    // Booking link, set once per results view.
    function wireBooking() {
      var shown = q('[data-res-book-url]');
      if (shown) shown.textContent = CONFIG.bookingUrl ? CONFIG.bookingUrl.replace(/^https?:\/\//, '') : 'www.kuma.partners/#contact';
      var book = q('[data-lfs-book]');
      if (!book) return;
      if (CONFIG.bookingUrl) {
        var url = CONFIG.bookingUrl;
        if (state.lead) {
          url += (url.indexOf('?') === -1 ? '?' : '&') +
            'name=' + encodeURIComponent(state.lead.name) + '&email=' + encodeURIComponent(state.lead.email);
        }
        book.setAttribute('href', url);
        book.setAttribute('target', '_blank');
        book.setAttribute('rel', 'noopener');
      }
    }

    // ---- reset ----
    function retake() {
      state.answers = new Array(TOTAL);
      state.step = 0;
      state.lead = null;
      state.result = null;
      form.reset();
      Array.prototype.forEach.call(form.querySelectorAll('.is-invalid'), function (el) { el.classList.remove('is-invalid'); });
      formError.hidden = true;
      setView('intro');
      bringIntoView(views.intro);
    }

    // ---- wiring ----
    var startBtn = document.querySelector('[data-lfs-start]');
    if (startBtn) startBtn.addEventListener('click', startScan);
    // The preview card is a second way in. The CTA stays the keyboard and screen reader route.
    var previewCard = document.querySelector('[data-lfs-preview]');
    if (previewCard) previewCard.addEventListener('click', startScan);

    rateButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-value');
        answer(v === 'NS' ? 'NS' : Number(v));
      });
    });

    Array.prototype.forEach.call(root.querySelectorAll('[data-lfs-back]'), function (btn) {
      btn.addEventListener('click', goBack);
    });

    form.addEventListener('submit', onSubmit);
    Array.prototype.forEach.call(form.querySelectorAll('input, select'), function (el) {
      el.addEventListener('input', function () {
        var wrap = el.closest('.field');
        if (wrap && wrap.classList.contains('is-invalid')) {
          wrap.classList.remove('is-invalid');
          el.setAttribute('aria-invalid', 'false');
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (state.view !== 'quiz' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        answer(Number(e.key));
      } else if (e.key === '6' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        answer('NS');
      }
    });

    var printBtn = document.querySelector('[data-lfs-print]');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

    var retakeBtn = document.querySelector('[data-lfs-retake]');
    if (retakeBtn) retakeBtn.addEventListener('click', retake);
  });
})();

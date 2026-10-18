// Kuma Partners: Leadership Friction Scan (/leadership-friction-scan)
// Vanilla JS, no dependencies, same conventions as site.js.
//
// Flow: intro -> 12 questions (one at a time) -> lead intake -> results dashboard.
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
    advanceDelayMs: 180
  };

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
  // Overall bands on the 12 to 48 index.
  var BANDS = [
    {
      id: 'high-flow', min: 12, max: 20, name: 'High-Flow Velocity', friction: 'Low Friction', badge: 'sc-badge-optimal',
      text: 'Decisions move, priorities hold and the team can disagree in the room. Scale tends to erode this first, so recheck it each quarter.'
    },
    {
      id: 'operational-drag', min: 21, max: 32, name: 'Operational Drag', friction: 'Moderate Friction', badge: 'sc-badge-moderate',
      text: 'Friction is measurable and starting to cost speed. It is usually concentrated in one dimension, which makes it fixable without restructuring.'
    },
    {
      id: 'systemic-gridlock', min: 33, max: 48, name: 'Critical Systemic Gridlock', friction: 'High Friction', badge: 'sc-badge-high',
      text: 'Friction is now the main constraint on execution. Several dimensions are compounding, and the team is unlikely to untangle it from the inside.'
    }
  ];

  // Per-dimension level on the 3 to 12 scale, proportional to the overall bands.
  function levelFor(dimScore) {
    if (dimScore <= 5) return { id: 'low', label: 'Low friction' };
    if (dimScore <= 8) return { id: 'moderate', label: 'Moderate friction' };
    return { id: 'high', label: 'High friction' };
  }

  var VECTORS = {
    d1: { name: 'The Founder Bottleneck', text: 'Decisions default inward. Execution speed is capped by founder calendar bandwidth.' },
    d2: { name: 'Kinetic Drift', text: 'High internal motion with a low unified vector. Priorities shift before execution solidifies.' },
    d3: { name: 'Artificial Harmony Trap', text: 'Polite consensus is masking operational misalignment. Unspoken tension erodes accountability.' },
    d4: { name: 'The Coordination Tax', text: 'Scaling headcount has triggered exponential meeting overhead and context-switching.' }
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
  // answers: array of 12 integers, 1 to 4, in question order.
  function computeResult(answers) {
    var dims = { d1: 0, d2: 0, d3: 0, d4: 0 };
    var total = 0;
    for (var i = 0; i < TOTAL; i++) {
      var v = answers[i];
      dims[QUESTIONS[i].dim] += v;
      total += v;
    }

    var dominant = TIE_ORDER[0];
    for (var j = 1; j < TIE_ORDER.length; j++) {
      if (dims[TIE_ORDER[j]] > dims[dominant]) dominant = TIE_ORDER[j];
    }

    var band = BANDS[0];
    for (var b = 0; b < BANDS.length; b++) {
      if (total >= BANDS[b].min && total <= BANDS[b].max) band = BANDS[b];
    }

    return { total: total, dims: dims, dominant: dominant, band: band };
  }

  // Test hook for Node. In the browser `module` is undefined, so this is a no-op.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeResult: computeResult, QUESTIONS: QUESTIONS, BANDS: BANDS, TIE_ORDER: TIE_ORDER };
  }

  if (typeof document === 'undefined') return;

  // ---------------------------------------------------------------------------
  // DOM + STATE
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('lfs-flow');
    if (!root) return;

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
      var current = state.answers[state.step];
      rateButtons.forEach(function (btn) {
        var on = Number(btn.getAttribute('data-value')) === current;
        btn.classList.toggle('selected', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
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
      renderQuestion();
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
      form.elements.friction_index.value = String(result.total);
      form.elements.friction_band.value = result.band.name;
      form.elements.dominant_vector.value = VECTORS[result.dominant].name;
      DIMENSION_ORDER.forEach(function (key) {
        form.elements[DIMENSIONS[key].field].value = String(result.dims[key]);
      });
      form.elements.answers.value = state.answers.join(',');
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

    function breakdownFrom(result) {
      return {
        total: result.total,
        band: result.band.name,
        friction: result.band.friction,
        dominant: { key: result.dominant, name: VECTORS[result.dominant].name, dimension: DIMENSIONS[result.dominant].name },
        dimensions: {
          d1: result.dims.d1, d2: result.dims.d2, d3: result.dims.d3, d4: result.dims.d4
        },
        answers: state.answers.slice()
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
      setView('results');
      bringIntoView(views.results, document.getElementById('lfs-results-title'));
      // Animate the gauge marker from the left edge to its position.
      var marker = q('[data-res-marker]');
      marker.style.left = '0%';
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { marker.style.left = markerPosition(result.total) + '%'; });
      });
    }

    function markerPosition(total) {
      // 37 possible index values (12 to 48). Centre the marker in the cell of its value.
      return ((total - 12 + 0.5) / 37) * 100;
    }

    function renderResults(result) {
      var first = state.lead ? state.lead.name.split(/\s+/)[0] : '';
      var prepared = q('[data-res-prepared]');
      prepared.textContent = state.lead
        ? 'Prepared for ' + first + ' at ' + state.lead.company + '. Based on your answers to all 12 statements.'
        : 'Based on your answers to all 12 statements.';

      // 1. Overall index
      q('[data-res-score]').textContent = String(result.total);
      var badge = q('[data-res-badge]');
      badge.className = 'sc-score-badge ' + result.band.badge;
      badge.textContent = result.band.friction;
      q('[data-res-band]').textContent = result.band.name;
      q('[data-res-band-text]').textContent = result.band.text;

      // Dimension matrix
      var list = q('[data-res-dims]');
      list.textContent = '';
      DIMENSION_ORDER.forEach(function (key) {
        var score = result.dims[key];
        var level = levelFor(score);
        var li = document.createElement('li');
        li.className = 'lfs-dim';

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
          tag.textContent = 'Dominant';
          name.appendChild(tag);
        }

        var value = document.createElement('div');
        value.className = 'lfs-dim-value ' + level.id;
        value.textContent = score + ' / 12 · ' + level.label;

        var ticks = document.createElement('div');
        ticks.className = 'lfs-dim-ticks';
        ticks.setAttribute('aria-hidden', 'true');
        for (var t = 1; t <= 12; t++) {
          var tick = document.createElement('span');
          tick.className = 'lfs-tick' + (t <= score ? ' on ' + level.id : '');
          ticks.appendChild(tick);
        }

        li.appendChild(name);
        li.appendChild(value);
        li.appendChild(ticks);
        list.appendChild(li);
      });

      // 2. Dominant vector
      var vec = VECTORS[result.dominant];
      q('[data-res-vector]').textContent = vec.name;
      q('[data-res-vector-text]').textContent = vec.text;
      q('[data-res-vector-source]').textContent =
        'Driven by Dimension ' + DIMENSIONS[result.dominant].number + ', ' + DIMENSIONS[result.dominant].name +
        ' (' + result.dims[result.dominant] + ' / 12).';
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
      iv.steps.forEach(function (s) {
        var li = document.createElement('li');
        li.textContent = s;
        steps.appendChild(li);
      });
      q('[data-res-signal]').textContent = iv.signal;

      // 4. Booking link
      var book = q('[data-lfs-book]');
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

    rateButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { answer(Number(btn.getAttribute('data-value'))); });
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
      if (e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        answer(Number(e.key));
      }
    });

    var retakeBtn = document.querySelector('[data-lfs-retake]');
    if (retakeBtn) retakeBtn.addEventListener('click', retake);
  });
})();

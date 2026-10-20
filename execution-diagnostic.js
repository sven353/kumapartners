/* The execution diagnostic (/execution-diagnostic).
   Nine steps: three context questions, five scored questions and one perception check.
   Results show on the page with no sign-up. The form below them sends the answers to the
   Netlify form "execution-diagnostic". Progress is kept in localStorage so a refresh does
   not lose it; every storage call is wrapped, so the page still works without it. */
(function () {
  'use strict';

  var STORE_KEY = 'kuma_execution_diagnostic_v1';

  var STEPS = [
    { id: 'stage', section: 'Context', title: 'Where is the company today?', options: [
      { v: 'Series A', t: 'Series A, fast growth', d: 'Roughly €3M to €8M ARR.' },
      { v: 'Series B', t: 'Series B, scale-up', d: 'Roughly €8M to €25M ARR.' },
      { v: 'Series C+', t: 'Series C or later', d: 'Roughly €25M ARR and above.' },
      { v: 'Post-merger or integrated entity', t: 'Post-merger or integrated entity', d: 'Two organisations now run as one.' }
    ]},
    { id: 'headcount', section: 'Context', title: 'How many people work in the company?', options: [
      { v: '20-50', t: '20 to 50' }, { v: '51-150', t: '51 to 150' },
      { v: '151-350', t: '151 to 350' }, { v: '350+', t: 'More than 350' }
    ]},
    { id: 'ai_level', section: 'Context', title: 'How far has AI gone inside the company?', options: [
      { v: 'Ad-hoc personal use', t: 'Ad-hoc personal use', d: 'Individual ChatGPT or Claude seats, used as people see fit.' },
      { v: 'Departmental pilots', t: 'Departmental pilots', d: 'Copilot, code generation or CRM assistants in some teams.' },
      { v: 'Company-wide deployment', t: 'Company-wide deployment', d: 'AI is part of how most functions work.' }
    ]},
    { id: 'q1', scored: true, key: 'Decision velocity', section: 'Decisions',
      title: 'When a cross-functional conflict comes up, for example product against go-to-market priorities, how fast is a binding decision made and enforced?',
      options: [
        { v: 1, t: 'Chronic deadlock', d: 'Debated again across several weekly meetings and escalated to the CEO more than once.' },
        { v: 2, t: 'Two to three weeks', d: 'Decisions stall while people wait for a consensus that does not come.' },
        { v: 3, t: 'Five to ten working days', d: 'Settled only after real friction and lobbying outside the meeting.' },
        { v: 4, t: '48 to 72 hours', d: 'The escalation path is known, but someone in leadership has to push it.' },
        { v: 5, t: 'Under 24 hours', d: 'Decision rights are clear and people disagree and commit as a habit.' }
      ]},
    { id: 'q2', scored: true, key: 'Accountability', section: 'Accountability',
      title: 'When a strategic initiative misses its target, or an automated process delivers a poor result, how does ownership work?',
      options: [
        { v: 1, t: 'Nobody owns it', d: 'Departments point at each other, at vendors or at the system.' },
        { v: 2, t: 'Shared, which means no one', d: 'Post-mortems feel political.' },
        { v: 3, t: 'An owner on paper', d: 'Someone is named but cannot fix the inputs from other functions.' },
        { v: 4, t: 'A clear owner, loosely tracked', d: 'Ownership is clear; consequences are not followed through.' },
        { v: 5, t: 'One owner with authority', d: 'A single named owner, with the authority to act and answerable for the result.' }
      ]},
    { id: 'q3', scored: true, key: 'Alignment', section: 'Alignment',
      title: 'If each member of your leadership team wrote down the top three priorities for this quarter on their own, what would you get?',
      options: [
        { v: 1, t: 'Complete divergence', d: 'Every function writes its own wishlist.' },
        { v: 2, t: 'Same words, different plans', d: 'A shared vocabulary on top of roadmaps that contradict each other.' },
        { v: 3, t: 'Two out of three', d: 'Two priorities match; one real gap sits between product and revenue.' },
        { v: 4, t: 'Aligned on paper', d: 'Small disputes over resources when things get tight.' },
        { v: 5, t: 'Fully aligned', d: 'Priorities, what was dropped and how trade-offs are measured are the same for everyone.' }
      ]},
    { id: 'q4', scored: true, key: 'Coordination', section: 'Coordination',
      title: 'How much leadership and management time goes into managing dependencies between teams, status meetings and territorial disputes?',
      options: [
        { v: 1, t: 'A critical drag', d: 'More than a third of management time. Teams defend headcount and control.' },
        { v: 2, t: 'Heavy friction', d: 'Projects often stall when they move from one function to another.' },
        { v: 3, t: 'Moderate friction', d: 'Teams get there in the end, but handovers need too many steering meetings.' },
        { v: 4, t: 'Mostly smooth', d: 'Occasional friction around releases and sales commitments.' },
        { v: 5, t: 'Very little', d: 'A clear operating rhythm and well-defined handovers between teams.' }
      ]},
    { id: 'q5', scored: true, key: 'AI-to-value conversion', section: 'AI conversion',
      title: 'What has AI and automation actually done to the speed at which the company ships and sells?',
      options: [
        { v: 1, t: 'More noise', d: 'More decks, analyses and code, and nothing ships faster.' },
        { v: 2, t: 'Faster tasks, same company', d: 'Individual tasks speed up; no measurable effect on velocity or margin.' },
        { v: 3, t: 'Isolated wins', d: 'Gains in support or engineering; core business metrics are flat.' },
        { v: 4, t: 'Measurable in places', d: 'Shorter cycle times in at least two core functions.' },
        { v: 5, t: 'Compounding', d: 'Workflows redesigned around AI; output per person is clearly up.' }
      ]},
    { id: 'q6', section: 'Perception check',
      title: 'How confident are you that your VP and director layer sees these bottlenecks the same way you do?',
      options: [
        { v: 1, t: 'Not confident', d: 'I suspect they feel friction they do not mention.' },
        { v: 2, t: 'Somewhat doubtful', d: 'Some of it probably does not reach me.' },
        { v: 3, t: 'Moderately confident', d: 'We talk openly, but there are filters.' },
        { v: 4, t: 'Confident', d: 'I would be surprised by a big difference.' },
        { v: 5, t: 'Completely confident', d: 'We see things the same way at every level.' }
      ]}
  ];

  var CHAIN = [
    { id: 'q5', name: 'Intelligence', what: 'AI-to-value conversion' },
    { id: 'q3', name: 'Alignment', what: 'Shared priorities' },
    { id: 'q1', name: 'Decisions', what: 'Decision velocity' },
    { id: 'q4', name: 'Coordination', what: 'Handovers between teams' },
    { id: 'q2', name: 'Accountability', what: 'Ownership of results' }
  ];

  var ACTIONS = {
    q1: 'Write down who owns each of your three biggest open decisions, with a date. Anything still open after two weeks goes to that owner, not back to the group.',
    q2: 'For every strategic initiative, name one owner who can change the inputs from other functions. If that person does not have the authority, fix the authority before the target.',
    q3: 'Ask each leader to write down the top three priorities for the quarter on their own, then compare the lists in your next leadership meeting. Agree what drops off as well as what stays.',
    q4: 'Pick the standing meeting nobody would miss and stop it for a month. Replace the status updates in the others with written pre-reads.',
    q5: 'Choose one end-to-end process, such as lead to cash or idea to release, and redesign it around AI. Measure cycle time before and after, instead of counting tools or seats.'
  };

  var TIERS = [
    { min: 5, max: 12, name: 'Critical execution drag', text: 'The company has outgrown its informal operating model. Adding more AI tools or capital to it is likely to add noise faster than it adds output.' },
    { min: 13, max: 18, name: 'The scaling squeeze', text: 'Teams move fast on their own, but work slows where it passes between functions. Strategic calls wait for the weekly meeting instead of being made by the person who owns them.' },
    { min: 19, max: 25, name: 'High-throughput operating system', text: 'Your answers describe a leadership team that turns effort into results. The risk is keeping that discipline as headcount grows.' }
  ];

  /* ---------- scoring ---------- */
  function calculateAuditResults(a) {
    var dims = ['q1', 'q2', 'q3', 'q4', 'q5'];
    var total = 0;
    dims.forEach(function (k) { total += Number(a[k]) || 0; });
    var efi = Math.round(100 - (total / 25) * 100);
    var tier = TIERS.filter(function (t) { return total >= t.min && total <= t.max; })[0] || TIERS[1];
    var sorted = dims.slice().sort(function (x, y) {
      var d = (Number(a[x]) || 0) - (Number(a[y]) || 0);
      return d !== 0 ? d : dims.indexOf(x) - dims.indexOf(y);
    });
    var top3 = (Number(a.q1) || 0) + (Number(a.q2) || 0) + (Number(a.q3) || 0);
    return {
      total: total,
      efi: efi,
      tier: tier,
      weakest: sorted[0],
      actions: [sorted[0], sorted[1]],
      perceptionGap: (Number(a.q6) || 0) >= 4 && top3 < 10
    };
  }

  /* ---------- storage ---------- */
  function load() {
    try { var s = window.localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function save(state) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }
  function clear() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- DOM ---------- */
  var app = document.querySelector('[data-ed-app]');
  if (!app) return;
  var stepsEl = app.querySelector('[data-ed-steps]');
  var progress = app.querySelector('[data-ed-progress]');
  var progLabel = app.querySelector('[data-ed-progress-label]');
  var progSection = app.querySelector('[data-ed-progress-section]');
  var progFill = app.querySelector('[data-ed-progress-fill]');
  var navEl = app.querySelector('[data-ed-nav]');
  var backBtn = app.querySelector('[data-ed-back]');
  var resultEl = app.querySelector('[data-ed-result]');

  var state = load() || { step: 0, answers: {} };
  if (typeof state.step !== 'number' || !state.answers) state = { step: 0, answers: {} };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderStep() {
    var s = STEPS[state.step];
    resultEl.hidden = true;
    progress.hidden = false;
    navEl.hidden = state.step === 0;
    progLabel.textContent = 'Step ' + (state.step + 1) + ' of ' + STEPS.length;
    progSection.textContent = s.section;
    progFill.style.width = Math.round(((state.step) / STEPS.length) * 100) + '%';

    stepsEl.innerHTML = '';
    var wrap = el('fieldset', 'execution-diagnostic-step');
    var legend = el('legend', 'execution-diagnostic-q', s.title);
    wrap.appendChild(legend);
    var list = el('div', 'execution-diagnostic-options');
    s.options.forEach(function (o) {
      var b = el('button', 'execution-diagnostic-option');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.answers[s.id] === o.v));
      b.appendChild(el('span', 'execution-diagnostic-option-title', o.t));
      if (o.d) b.appendChild(el('span', 'execution-diagnostic-option-desc', o.d));
      b.addEventListener('click', function () { choose(s.id, o.v); });
      list.appendChild(b);
    });
    wrap.appendChild(list);
    stepsEl.appendChild(wrap);
  }

  function choose(id, v) {
    state.answers[id] = v;
    if (state.step < STEPS.length - 1) {
      state.step += 1;
      save(state);
      renderStep();
      scrollToApp();
      var first = stepsEl.querySelector('.execution-diagnostic-option');
      if (first) first.focus({ preventScroll: true });
    } else {
      state.step = STEPS.length;
      save(state);
      renderResult(true);
    }
  }

  function scrollToApp() {
    var top = app.getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - 100, behavior: 'smooth' });
    }
  }

  function renderResult(focus) {
    var a = state.answers;
    var r = calculateAuditResults(a);
    stepsEl.innerHTML = '';
    progress.hidden = true;
    navEl.hidden = true;
    resultEl.hidden = false;

    resultEl.querySelector('[data-ed-out="efi"]').textContent = r.efi;
    resultEl.querySelector('[data-ed-out="tier"]').textContent = r.tier.name + ' · ' + r.total + ' of 25 points';
    resultEl.querySelector('[data-ed-out="analysis"]').textContent = r.tier.text;
    resultEl.querySelector('[data-ed-marker]').style.left = Math.min(Math.max(r.efi, 2), 98) + '%';

    var chain = resultEl.querySelector('[data-ed-chain]');
    chain.innerHTML = '';
    CHAIN.forEach(function (c) {
      var li = el('li', 'execution-diagnostic-link' + (c.id === r.weakest ? ' is-weakest' : ''));
      li.appendChild(el('span', 'execution-diagnostic-link-name', c.name));
      li.appendChild(el('span', 'execution-diagnostic-link-score', (a[c.id] || 0) + ' / 5'));
      li.appendChild(el('span', 'execution-diagnostic-link-what', c.what));
      chain.appendChild(li);
    });
    var weakest = CHAIN.filter(function (c) { return c.id === r.weakest; })[0];
    var weakText = 'The link that breaks first: ' + weakest.name.toLowerCase() + ' (' + weakest.what.toLowerCase() + ').';
    if (r.weakest === 'q5' && a.ai_level === 'Ad-hoc personal use') {
      weakText += ' With AI still at the level of personal use, that is expected; look at the next lowest link as well.';
    }
    resultEl.querySelector('[data-ed-out="weakest"]').textContent = weakText;

    resultEl.querySelector('[data-ed-gap]').hidden = !r.perceptionGap;

    var acts = resultEl.querySelector('[data-ed-actions]');
    acts.innerHTML = '';
    r.actions.forEach(function (k) { acts.appendChild(el('li', null, ACTIONS[k])); });

    prefillForm(r);
    if (focus) {
      resultEl.focus({ preventScroll: true });
      scrollToApp();
    }
  }

  /* ---------- form ---------- */
  var form = document.querySelector('[data-ed-form]');
  var formView = document.querySelector('[data-ed-form-view]');
  var formSub = document.querySelector('[data-ed-form-sub]');
  var success = document.querySelector('[data-ed-success]');

  function setHidden(name, value) {
    var f = form && form.querySelector('[name="' + name + '"]');
    if (f) f.value = value == null ? '' : String(value);
  }

  function prefillForm(r) {
    if (!form) return;
    var a = state.answers;
    var stage = form.querySelector('#ed-stage');
    if (stage && !stage.value && a.stage) {
      for (var i = 0; i < stage.options.length; i++) {
        if (stage.options[i].text === a.stage) { stage.selectedIndex = i; break; }
      }
    }
    if (formSub) formSub.textContent = 'Your answers and your score of ' + r.efi + '% (' + r.tier.name.toLowerCase() + ') are sent with your details, so the partner can prepare.';
  }

  function fillHidden() {
    var a = state.answers;
    var complete = state.step >= STEPS.length;
    var r = complete ? calculateAuditResults(a) : null;
    setHidden('headcount', a.headcount);
    setHidden('ai_level', a.ai_level);
    setHidden('q1_decision_velocity', a.q1);
    setHidden('q2_accountability', a.q2);
    setHidden('q3_alignment', a.q3);
    setHidden('q4_coordination', a.q4);
    setHidden('q5_ai_conversion', a.q5);
    setHidden('q6_perception_confidence', a.q6);
    setHidden('total_score', r ? r.total : 'Diagnostic not completed');
    setHidden('efi_percentage', r ? r.efi : '');
    setHidden('tier', r ? r.tier.name : '');
    setHidden('weakest_link', r ? CHAIN.filter(function (c) { return c.id === r.weakest; })[0].what : '');
    setHidden('perception_gap_flag', r ? (r.perceptionGap ? 'Yes' : 'No') : '');
    var contact = form.querySelector('[data-ed-contact]');
    setHidden('contact_me', contact && contact.checked ? 'Yes' : 'No');
    var utm = [];
    try {
      var p = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { if (p.get(k)) utm.push(k + '=' + p.get(k)); });
    } catch (e) { /* ignore */ }
    setHidden('utm', utm.join('&'));
  }

  function showError(name, show) {
    var e = form.querySelector('[data-ed-error="' + name + '"]');
    if (e) e.classList.toggle('is-visible', !!show);
  }

  function validate() {
    var ok = true;
    var name = form.querySelector('#ed-name');
    var email = form.querySelector('#ed-email');
    var stage = form.querySelector('#ed-stage');
    var nameOk = name.value.trim().length > 1;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    var stageOk = !!stage.value;
    showError('name', !nameOk); showError('email', !emailOk); showError('stage', !stageOk);
    ok = nameOk && emailOk && stageOk;
    if (!ok) {
      var first = !nameOk ? name : (!emailOk ? email : stage);
      first.focus();
    }
    return ok;
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = form.querySelector('[data-ed-form-error]');
      if (err) err.hidden = true;
      if (!validate()) return;
      fillHidden();
      var btn = form.querySelector('[data-ed-submit]');
      var label = btn.querySelector('[data-btn-label]');
      var original = label.textContent;
      btn.disabled = true; label.textContent = 'Sending…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error('Status ' + res.status);
        var wantsCall = form.querySelector('[data-ed-contact]').checked;
        success.querySelector('[data-ed-success-title]').textContent = 'Thank you.';
        success.querySelector('[data-ed-success-text]').textContent = wantsCall
          ? 'A Kuma partner will be in touch within one business day to find a time for your debrief.'
          : 'Your result is with us. If you would like a debrief later, reply to any of our emails or write to contact@kuma.partners.';
        formView.hidden = true;
        success.hidden = false;
        success.focus();
      }).catch(function () {
        if (err) err.hidden = false;
        btn.disabled = false; label.textContent = original;
      });
    });
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.id === 'ed-name') showError('name', false);
      if (t.id === 'ed-email') showError('email', false);
      if (t.id === 'ed-stage') showError('stage', false);
    });
  }

  /* ---------- controls ---------- */
  backBtn.addEventListener('click', function () {
    if (state.step > 0) { state.step -= 1; save(state); renderStep(); }
  });
  resultEl.querySelector('[data-ed-restart]').addEventListener('click', function () {
    state = { step: 0, answers: {} };
    clear();
    renderStep();
    scrollToApp();
  });
  var printBtn = document.querySelector('[data-ed-print]');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  if (state.step >= STEPS.length) renderResult(false); else renderStep();

  // Exposed for testing and for anyone who wants to check the maths in the console.
  window.calculateAuditResults = calculateAuditResults;
})();
